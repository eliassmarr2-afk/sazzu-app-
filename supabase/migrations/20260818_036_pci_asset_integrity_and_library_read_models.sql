-- Protocol Creative Insights (PCI)
-- Phase 1L: COMMIT-time rights/asset integrity plus safe Library projections.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.assert_active_rights_paid_and_asset_backed()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_grant pci.rights_grants%rowtype;
  v_payable pci.payables%rowtype;
  v_asset pci.creative_assets%rowtype;
  v_version pci.submission_versions%rowtype;
begin
  select * into v_grant
  from pci.rights_grants rg
  where rg.rights_grant_id=coalesce(new.rights_grant_id,old.rights_grant_id);

  if v_grant.rights_grant_id is null or v_grant.status <> 'active' then return null; end if;

  select * into v_payable
  from pci.payables py
  where py.purchase_id=v_grant.purchase_id
    and py.concept_type='base_purchase';

  if v_payable.payable_id is null or v_payable.status <> 'paid' or v_payable.paid_at is null then
    raise exception using errcode='23514',message='pci_active_rights_require_paid_base_payable';
  end if;

  select * into v_asset
  from pci.creative_assets ca
  where ca.rights_grant_id=v_grant.rights_grant_id;

  if v_asset.creative_asset_id is null then
    raise exception using errcode='23514',message='pci_active_rights_require_creative_asset';
  end if;

  if v_asset.purchase_id is distinct from v_grant.purchase_id
     or v_asset.workspace_id is distinct from v_grant.workspace_id
     or v_asset.creator_id is distinct from v_grant.creator_id
     or v_asset.source_submission_version_id is distinct from v_grant.submission_version_id
     or lower(v_asset.sha256) is distinct from lower(v_grant.version_sha256_snapshot)
  then
    raise exception using errcode='23514',message='pci_active_rights_asset_snapshot_mismatch';
  end if;

  select * into v_version
  from pci.submission_versions sv
  where sv.submission_version_id=v_grant.submission_version_id;

  if v_version.submission_version_id is null
     or v_version.status <> 'ready'
     or v_version.rights_clearance_status <> 'complete'
     or lower(v_version.sha256) is distinct from lower(v_grant.version_sha256_snapshot)
  then
    raise exception using errcode='23514',message='pci_active_rights_version_invalid';
  end if;

  return null;
end;
$$;

revoke all on function pci.assert_active_rights_paid_and_asset_backed() from public,anon,authenticated;
grant execute on function pci.assert_active_rights_paid_and_asset_backed() to service_role;

drop trigger if exists pci_active_rights_integrity_from_rights on pci.rights_grants;
create constraint trigger pci_active_rights_integrity_from_rights
after insert or update on pci.rights_grants
deferrable initially deferred
for each row execute function pci.assert_active_rights_paid_and_asset_backed();

drop trigger if exists pci_active_rights_integrity_from_asset on pci.creative_assets;
create constraint trigger pci_active_rights_integrity_from_asset
after insert or update on pci.creative_assets
deferrable initially deferred
for each row execute function pci.assert_active_rights_paid_and_asset_backed();

drop trigger if exists pci_active_rights_integrity_from_payable on pci.payables;
create constraint trigger pci_active_rights_integrity_from_payable
after update on pci.payables
deferrable initially deferred
for each row execute function pci.assert_active_rights_paid_and_asset_backed();

create or replace function pci.assert_operational_asset_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_asset pci.creative_assets%rowtype;
  v_grant pci.rights_grants%rowtype;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_expected_prefix text;
begin
  select * into v_asset
  from pci.creative_assets ca
  where ca.creative_asset_id=coalesce(new.creative_asset_id,old.creative_asset_id);

  if v_asset.creative_asset_id is null then return null; end if;

  select * into v_grant from pci.rights_grants rg where rg.rights_grant_id=v_asset.rights_grant_id;
  select * into v_version from pci.submission_versions sv where sv.submission_version_id=v_asset.source_submission_version_id;
  select * into v_submission from pci.submissions s where s.submission_id=v_asset.source_submission_id;

  if v_grant.rights_grant_id is null
     or v_grant.purchase_id is distinct from v_asset.purchase_id
     or v_grant.submission_version_id is distinct from v_asset.source_submission_version_id
     or lower(v_grant.version_sha256_snapshot) is distinct from lower(v_asset.sha256)
  then
    raise exception using errcode='23514',message='pci_asset_rights_snapshot_mismatch';
  end if;

  if v_version.submission_version_id is null
     or v_version.submission_id is distinct from v_asset.source_submission_id
     or v_version.status <> 'ready'
     or lower(v_version.sha256) is distinct from lower(v_asset.sha256)
  then
    raise exception using errcode='23514',message='pci_asset_source_version_mismatch';
  end if;

  if v_submission.submission_id is null
     or v_submission.workspace_id is distinct from v_asset.workspace_id
     or v_submission.creator_id is distinct from v_asset.creator_id
     or v_submission.current_version_id is distinct from v_asset.source_submission_version_id
  then
    raise exception using errcode='23514',message='pci_asset_source_submission_mismatch';
  end if;

  if v_asset.status in ('provisioning','available') and v_grant.status <> 'active' then
    raise exception using errcode='23514',message='pci_operational_asset_requires_active_rights';
  end if;

  if v_asset.storage_bucket <> 'pci-assets' or v_asset.storage_path is null then
    raise exception using errcode='23514',message='pci_asset_destination_invalid';
  end if;

  v_expected_prefix := 'workspace/' || v_asset.workspace_id || '/purchase/' || v_asset.purchase_id::text || '/asset/' || v_asset.creative_asset_id::text || '/';
  if left(v_asset.storage_path,length(v_expected_prefix)) <> v_expected_prefix then
    raise exception using errcode='23514',message='pci_asset_destination_path_invalid';
  end if;

  if v_asset.status='available' then
    if v_asset.provisioned_at is null then
      raise exception using errcode='23514',message='pci_available_asset_requires_provisioned_timestamp';
    end if;
    if coalesce(v_asset.metadata->>'verification_mode','') <> 'supabase_server_copy_plus_object_metadata' then
      raise exception using errcode='23514',message='pci_available_asset_requires_promotion_verification';
    end if;
  end if;

  return null;
end;
$$;

revoke all on function pci.assert_operational_asset_integrity() from public,anon,authenticated;
grant execute on function pci.assert_operational_asset_integrity() to service_role;

drop trigger if exists pci_asset_operational_integrity on pci.creative_assets;
create constraint trigger pci_asset_operational_integrity
after insert or update on pci.creative_assets
deferrable initially deferred
for each row execute function pci.assert_operational_asset_integrity();

create or replace function pci.assert_settled_purchase_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_purchase pci.purchases%rowtype;
  v_payable pci.payables%rowtype;
  v_grants integer;
  v_assets integer;
  v_unavailable integer;
  v_bad_submissions integer;
begin
  select * into v_purchase
  from pci.purchases p
  where p.purchase_id=coalesce(new.purchase_id,old.purchase_id);

  if v_purchase.purchase_id is null or v_purchase.status <> 'settled' then return null; end if;

  if v_purchase.settled_at is null then
    raise exception using errcode='23514',message='pci_settled_purchase_requires_timestamp';
  end if;

  select * into v_payable
  from pci.payables py
  where py.purchase_id=v_purchase.purchase_id and py.concept_type='base_purchase';
  if v_payable.payable_id is null or v_payable.status <> 'paid' then
    raise exception using errcode='23514',message='pci_settled_purchase_requires_paid_base_payable';
  end if;

  select count(*) into v_grants
  from pci.rights_grants rg
  where rg.purchase_id=v_purchase.purchase_id and rg.status='active';

  select count(*),count(*) filter(where ca.status <> 'available')
  into v_assets,v_unavailable
  from pci.creative_assets ca
  where ca.purchase_id=v_purchase.purchase_id;

  if v_grants=0 or v_assets is distinct from v_grants or v_unavailable<>0 then
    raise exception using errcode='23514',message='pci_settled_purchase_requires_all_assets_available';
  end if;

  select count(*) into v_bad_submissions
  from (
    select distinct ca.source_submission_id
    from pci.creative_assets ca
    where ca.purchase_id=v_purchase.purchase_id
  ) x
  join pci.submissions s on s.submission_id=x.source_submission_id
  where s.status <> 'acquired' or s.acquired_at is null;

  if v_bad_submissions<>0 then
    raise exception using errcode='23514',message='pci_settled_purchase_requires_acquired_submissions';
  end if;

  return null;
end;
$$;

revoke all on function pci.assert_settled_purchase_integrity() from public,anon,authenticated;
grant execute on function pci.assert_settled_purchase_integrity() to service_role;

drop trigger if exists pci_settled_purchase_integrity on pci.purchases;
create constraint trigger pci_settled_purchase_integrity
after insert or update on pci.purchases
deferrable initially deferred
for each row execute function pci.assert_settled_purchase_integrity();

create or replace function pci.assert_acquired_submission_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
begin
  select * into v_submission
  from pci.submissions s
  where s.submission_id=coalesce(new.submission_id,old.submission_id);

  if v_submission.submission_id is null or v_submission.status <> 'acquired' then return null; end if;

  if v_submission.acquired_at is null then
    raise exception using errcode='23514',message='pci_acquired_submission_requires_timestamp';
  end if;

  if not exists(
    select 1
    from pci.creative_assets ca
    join pci.purchases p on p.purchase_id=ca.purchase_id
    where ca.source_submission_id=v_submission.submission_id
      and ca.source_submission_version_id=v_submission.current_version_id
      and ca.workspace_id=v_submission.workspace_id
      and ca.creator_id=v_submission.creator_id
      and ca.status='available'
      and p.status='settled'
  ) then
    raise exception using errcode='23514',message='pci_acquired_submission_requires_settled_available_asset';
  end if;

  return null;
end;
$$;

revoke all on function pci.assert_acquired_submission_integrity() from public,anon,authenticated;
grant execute on function pci.assert_acquired_submission_integrity() to service_role;

drop trigger if exists pci_acquired_submission_integrity on pci.submissions;
create constraint trigger pci_acquired_submission_integrity
after insert or update on pci.submissions
deferrable initially deferred
for each row execute function pci.assert_acquired_submission_integrity();

-- Protocol Library: only acquired/provisioning assets; no unpurchased submission can enter this projection.
create or replace function pci_api.admin_library(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc),'[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'creative_asset_id',ca.creative_asset_id,
      'status',ca.status,
      'sha256',ca.sha256,
      'provisioned_at',ca.provisioned_at,
      'created_at',ca.created_at,
      'purchase',jsonb_build_object(
        'purchase_id',p.purchase_id,
        'status',p.status,
        'currency',p.currency,
        'total_amount',p.total_amount,
        'agreed_at',p.agreed_at,
        'settled_at',p.settled_at
      ),
      'rights',jsonb_build_object(
        'rights_grant_id',rg.rights_grant_id,
        'status',rg.status,
        'active_at',rg.active_at,
        'rights_package_snapshot',rg.rights_package_snapshot
      ),
      'creator',jsonb_build_object(
        'creator_id',c.creator_id,
        'display_name',c.display_name,
        'email',c.email
      ),
      'source',jsonb_build_object(
        'submission_id',s.submission_id,
        'submission_status',s.status,
        'submission_version_id',sv.submission_version_id,
        'version_number',sv.version_number,
        'original_filename',sv.original_filename,
        'mime_type',sv.mime_type,
        'file_size_bytes',sv.file_size_bytes,
        'duration_seconds',sv.duration_seconds,
        'width',sv.width,
        'height',sv.height,
        'concept_label',s.concept_label
      )
    ) item
    from pci.creative_assets ca
    join pci.purchases p on p.purchase_id=ca.purchase_id
    join pci.rights_grants rg on rg.rights_grant_id=ca.rights_grant_id
    join pci.creators c on c.creator_id=ca.creator_id
    join pci.submissions s on s.submission_id=ca.source_submission_id
    join pci.submission_versions sv on sv.submission_version_id=ca.source_submission_version_id
    where ca.workspace_id=p_workspace_id
  ) q;

  return jsonb_build_object('ok',true,'workspace_id',p_workspace_id,'items',v_items);
end;
$$;

create or replace function pci_api.admin_asset_playback_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_creative_asset_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_asset pci.creative_assets%rowtype;
  v_version pci.submission_versions%rowtype;
  v_rights pci.rights_grants%rowtype;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_asset
  from pci.creative_assets ca
  where ca.creative_asset_id=p_creative_asset_id
    and ca.workspace_id=p_workspace_id;

  if v_asset.creative_asset_id is null then
    raise exception using errcode='P0002',message='pci_creative_asset_not_found';
  end if;
  if v_asset.status <> 'available' then
    raise exception using errcode='23514',message='pci_asset_not_available';
  end if;

  select * into v_rights from pci.rights_grants rg where rg.rights_grant_id=v_asset.rights_grant_id;
  if v_rights.status <> 'active' then
    raise exception using errcode='23514',message='pci_asset_rights_not_active';
  end if;

  select * into v_version from pci.submission_versions sv where sv.submission_version_id=v_asset.source_submission_version_id;

  return jsonb_build_object(
    'ok',true,
    'creative_asset_id',v_asset.creative_asset_id,
    'storage_bucket',v_asset.storage_bucket,
    'storage_path',v_asset.storage_path,
    'sha256',v_asset.sha256,
    'mime_type',v_version.mime_type,
    'original_filename',v_version.original_filename,
    'file_size_bytes',v_version.file_size_bytes,
    'duration_seconds',v_version.duration_seconds,
    'width',v_version.width,
    'height',v_version.height
  );
end;
$$;

create or replace function pci_api.creator_acquired_assets(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc),'[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'creative_asset_id',ca.creative_asset_id,
      'status',ca.status,
      'purchase_id',ca.purchase_id,
      'rights_status',rg.status,
      'submission_id',ca.source_submission_id,
      'submission_version_id',ca.source_submission_version_id,
      'version_number',sv.version_number,
      'original_filename',sv.original_filename,
      'mime_type',sv.mime_type,
      'sha256',ca.sha256,
      'provisioned_at',ca.provisioned_at,
      'created_at',ca.created_at
    ) item
    from pci.creative_assets ca
    join pci.rights_grants rg on rg.rights_grant_id=ca.rights_grant_id
    join pci.submission_versions sv on sv.submission_version_id=ca.source_submission_version_id
    where ca.creator_id=v_creator.creator_id
  ) q;

  return jsonb_build_object('ok',true,'items',v_items);
end;
$$;

revoke all on function pci_api.admin_library(uuid,text) from public,anon,authenticated;
revoke all on function pci_api.admin_asset_playback_context(uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.creator_acquired_assets(uuid) from public,anon,authenticated;

grant execute on function pci_api.admin_library(uuid,text) to service_role;
grant execute on function pci_api.admin_asset_playback_context(uuid,text,uuid) to service_role;
grant execute on function pci_api.creator_acquired_assets(uuid) to service_role;

comment on function pci_api.admin_library(uuid,text) is
  'Protocol Library projection sourced exclusively from purchased Creative Assets, never raw unacquired submissions.';