-- Protocol Creative Insights (PCI)
-- Phase 1L: paid base obligations activate commercial rights and create provisioning assets.
-- Storage copy remains asynchronous and is handled by pci-worker.
-- Intentionally stored in Git only; not applied to production yet.

-- One asset promotion job per Creative Asset for its entire lifetime.
create unique index if not exists pci_outbox_promote_asset_once_uidx
  on pci.outbox (job_type, entity_id)
  where job_type = 'promote_asset' and entity_id is not null;

create or replace function pci.guard_creative_asset_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.creative_asset_id is distinct from old.creative_asset_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.purchase_id is distinct from old.purchase_id
     or new.rights_grant_id is distinct from old.rights_grant_id
     or new.source_submission_id is distinct from old.source_submission_id
     or new.source_submission_version_id is distinct from old.source_submission_version_id
     or new.storage_bucket is distinct from old.storage_bucket
     or new.storage_path is distinct from old.storage_path
     or new.sha256 is distinct from old.sha256
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514', message = 'pci_creative_asset_identity_immutable';
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_creative_asset_identity() from public, anon, authenticated;
grant execute on function pci.guard_creative_asset_identity() to service_role;

drop trigger if exists pci_creative_assets_identity_guard on pci.creative_assets;
create trigger pci_creative_assets_identity_guard
before update on pci.creative_assets
for each row execute function pci.guard_creative_asset_identity();

create or replace function pci.guard_creative_asset_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then return new; end if;

  if old.status = 'provisioning' and new.status in ('available','failed') then return new; end if;
  if old.status = 'failed' and new.status = 'provisioning' then return new; end if;
  if old.status = 'available' and new.status in ('restricted','retired') then return new; end if;
  if old.status = 'restricted' and new.status in ('available','retired') then return new; end if;

  raise exception using errcode = '23514', message = 'pci_creative_asset_status_transition_invalid';
end;
$$;

revoke all on function pci.guard_creative_asset_status_transition() from public, anon, authenticated;
grant execute on function pci.guard_creative_asset_status_transition() to service_role;

drop trigger if exists pci_creative_assets_status_guard on pci.creative_assets;
create trigger pci_creative_assets_status_guard
before update of status on pci.creative_assets
for each row execute function pci.guard_creative_asset_status_transition();

-- This trigger runs inside the transaction that makes the base Payable PAID.
-- Any invalid commercial state raises and therefore rolls back the payout confirmation too.
create or replace function pci.activate_rights_on_paid_base_payable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_purchase pci.purchases%rowtype;
  v_offer pci.purchase_offers%rowtype;
  v_grant pci.rights_grants%rowtype;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_asset_id uuid;
  v_extension text;
  v_destination_path text;
  v_grant_count integer := 0;
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  if new.concept_type <> 'base_purchase' then return new; end if;

  if new.purchase_id is null then
    raise exception using errcode = '23514', message = 'pci_paid_base_payable_missing_purchase';
  end if;

  select * into v_purchase
  from pci.purchases p
  where p.purchase_id = new.purchase_id
    and p.workspace_id = new.workspace_id
    and p.creator_id = new.creator_id
  for update;

  if v_purchase.purchase_id is null or v_purchase.status <> 'agreed' then
    raise exception using errcode = '23514', message = 'pci_rights_activation_purchase_not_agreed';
  end if;

  select * into v_offer
  from pci.purchase_offers po
  where po.offer_id = v_purchase.offer_id;

  if v_offer.offer_id is null or v_offer.status <> 'accepted' then
    raise exception using errcode = '23514', message = 'pci_rights_activation_offer_not_accepted';
  end if;

  for v_grant in
    select rg.*
    from pci.rights_grants rg
    where rg.purchase_id = v_purchase.purchase_id
    order by rg.created_at, rg.rights_grant_id
    for update
  loop
    v_grant_count := v_grant_count + 1;

    if v_grant.status <> 'pending_payment' then
      raise exception using errcode = '23514', message = 'pci_rights_activation_grant_not_pending_payment';
    end if;

    select sv.* into v_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_grant.submission_version_id
    for update;

    if v_version.submission_version_id is null
       or v_version.status <> 'ready'
       or v_version.rights_clearance_status <> 'complete'
       or v_version.storage_bucket <> 'pci-submissions'
       or v_version.storage_path is null
       or v_version.sha256 is null
    then
      raise exception using errcode = '23514', message = 'pci_rights_activation_version_not_eligible';
    end if;

    if lower(v_grant.version_sha256_snapshot) is distinct from lower(v_version.sha256) then
      raise exception using errcode = '23514', message = 'pci_rights_activation_hash_mismatch';
    end if;

    select * into v_submission
    from pci.submissions s
    where s.submission_id = v_version.submission_id
      and s.workspace_id = v_purchase.workspace_id
      and s.creator_id = v_purchase.creator_id
    for update;

    if v_submission.submission_id is null or v_submission.status <> 'preselected' then
      raise exception using errcode = '23514', message = 'pci_rights_activation_submission_not_preselected';
    end if;

    if v_submission.current_version_id is distinct from v_version.submission_version_id then
      raise exception using errcode = '23514', message = 'pci_rights_activation_version_not_current';
    end if;

    update pci.rights_grants
    set status = 'active', active_at = now()
    where rights_grant_id = v_grant.rights_grant_id;

    v_asset_id := gen_random_uuid();
    v_extension := case v_version.mime_type
      when 'video/mp4' then 'mp4'
      when 'video/quicktime' then 'mov'
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
      else 'bin'
    end;

    v_destination_path :=
      'workspace/' || v_purchase.workspace_id ||
      '/purchase/' || v_purchase.purchase_id::text ||
      '/asset/' || v_asset_id::text ||
      '/original.' || v_extension;

    insert into pci.creative_assets (
      creative_asset_id, workspace_id, creator_id, purchase_id, rights_grant_id,
      source_submission_id, source_submission_version_id,
      status, storage_bucket, storage_path, sha256, metadata
    ) values (
      v_asset_id, v_purchase.workspace_id, v_purchase.creator_id,
      v_purchase.purchase_id, v_grant.rights_grant_id,
      v_submission.submission_id, v_version.submission_version_id,
      'provisioning', 'pci-assets', v_destination_path, lower(v_version.sha256),
      jsonb_build_object(
        'source_bucket', v_version.storage_bucket,
        'source_path', v_version.storage_path,
        'source_original_filename', v_version.original_filename,
        'source_mime_type', v_version.mime_type,
        'source_file_size_bytes', v_version.file_size_bytes,
        'source_version_number', v_version.version_number,
        'activation_payable_id', new.payable_id,
        'activated_at', now()
      )
    );

    insert into pci.outbox (
      workspace_id, job_type, entity_type, entity_id, payload
    ) values (
      v_purchase.workspace_id,
      'promote_asset',
      'creative_asset',
      v_asset_id,
      jsonb_build_object(
        'creative_asset_id', v_asset_id,
        'purchase_id', v_purchase.purchase_id,
        'rights_grant_id', v_grant.rights_grant_id,
        'source_submission_version_id', v_version.submission_version_id
      )
    );

    perform pci.append_event(
      v_purchase.workspace_id,
      'system', null, v_purchase.creator_id,
      'rights_grant', v_grant.rights_grant_id,
      'rights.activated_after_payment', 'pending_payment', 'active',
      null, null,
      jsonb_build_object(
        'purchase_id', v_purchase.purchase_id,
        'payable_id', new.payable_id,
        'submission_version_id', v_version.submission_version_id,
        'version_sha256', lower(v_version.sha256)
      )
    );

    perform pci.append_event(
      v_purchase.workspace_id,
      'system', null, v_purchase.creator_id,
      'creative_asset', v_asset_id,
      'asset.provisioning_created', null, 'provisioning',
      null, null,
      jsonb_build_object(
        'purchase_id', v_purchase.purchase_id,
        'rights_grant_id', v_grant.rights_grant_id,
        'source_submission_id', v_submission.submission_id,
        'source_submission_version_id', v_version.submission_version_id,
        'destination_bucket', 'pci-assets',
        'destination_path', v_destination_path
      )
    );
  end loop;

  if v_grant_count = 0 then
    raise exception using errcode = '23514', message = 'pci_rights_activation_missing_grants';
  end if;

  perform pci.append_event(
    v_purchase.workspace_id,
    'system', null, v_purchase.creator_id,
    'purchase', v_purchase.purchase_id,
    'purchase.rights_activated', 'agreed', 'agreed',
    null, null,
    jsonb_build_object('payable_id', new.payable_id, 'asset_count', v_grant_count)
  );

  return new;
end;
$$;

revoke all on function pci.activate_rights_on_paid_base_payable() from public, anon, authenticated;
grant execute on function pci.activate_rights_on_paid_base_payable() to service_role;

drop trigger if exists pci_payables_activate_rights_after_paid on pci.payables;
create trigger pci_payables_activate_rights_after_paid
after update of status on pci.payables
for each row execute function pci.activate_rights_on_paid_base_payable();

comment on function pci.activate_rights_on_paid_base_payable() is
  'Activates exact-version commercial rights inside the same DB transaction that makes the base payable paid; Storage promotion remains outbox-driven.';