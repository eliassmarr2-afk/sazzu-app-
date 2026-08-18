-- Protocol Creative Insights (PCI)
-- Phase 1L visibility: existing purchase endpoints expose Creative Asset state
-- without exposing private Storage bucket/path values.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_purchases(
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

  select coalesce(jsonb_agg(item order by (item->>'agreed_at') desc),'[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'purchase_id',p.purchase_id,
      'offer_id',p.offer_id,
      'status',p.status,
      'currency',p.currency,
      'total_amount',p.total_amount,
      'agreed_at',p.agreed_at,
      'settled_at',p.settled_at,
      'created_at',p.created_at,
      'payable',case when py.payable_id is null then null else jsonb_build_object(
        'payable_id',py.payable_id,
        'status',py.status,
        'amount_due',py.amount_due,
        'payment_account_confirmed_at',py.payment_account_confirmed_at,
        'paid_at',py.paid_at
      ) end,
      'rights',coalesce((
        select jsonb_agg(jsonb_build_object(
          'rights_grant_id',rg.rights_grant_id,
          'submission_version_id',rg.submission_version_id,
          'status',rg.status,
          'active_at',rg.active_at
        ) order by rg.created_at)
        from pci.rights_grants rg
        where rg.purchase_id=p.purchase_id
      ),'[]'::jsonb),
      'assets',coalesce((
        select jsonb_agg(jsonb_build_object(
          'creative_asset_id',ca.creative_asset_id,
          'status',ca.status,
          'submission_id',ca.source_submission_id,
          'submission_version_id',ca.source_submission_version_id,
          'version_number',sv.version_number,
          'original_filename',sv.original_filename,
          'mime_type',sv.mime_type,
          'sha256',ca.sha256,
          'provisioned_at',ca.provisioned_at,
          'created_at',ca.created_at
        ) order by ca.created_at)
        from pci.creative_assets ca
        join pci.submission_versions sv on sv.submission_version_id=ca.source_submission_version_id
        where ca.purchase_id=p.purchase_id
      ),'[]'::jsonb)
    ) item
    from pci.purchases p
    left join pci.payables py
      on py.purchase_id=p.purchase_id and py.concept_type='base_purchase'
    where p.creator_id=v_creator.creator_id
  ) q;

  return jsonb_build_object('ok',true,'items',v_items);
end;
$$;

create or replace function pci_api.admin_purchases(
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

  select coalesce(jsonb_agg(item order by (item->>'agreed_at') desc),'[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'purchase_id',p.purchase_id,
      'offer_id',p.offer_id,
      'status',p.status,
      'currency',p.currency,
      'total_amount',p.total_amount,
      'agreed_at',p.agreed_at,
      'settled_at',p.settled_at,
      'creator',jsonb_build_object(
        'creator_id',c.creator_id,
        'display_name',c.display_name,
        'email',c.email,
        'status',c.status
      ),
      'payable',case when py.payable_id is null then null else jsonb_build_object(
        'payable_id',py.payable_id,
        'status',py.status,
        'amount_due',py.amount_due,
        'payment_account_confirmed_at',py.payment_account_confirmed_at,
        'paid_at',py.paid_at
      ) end,
      'rights',coalesce((
        select jsonb_agg(jsonb_build_object(
          'rights_grant_id',rg.rights_grant_id,
          'submission_version_id',rg.submission_version_id,
          'status',rg.status,
          'version_sha256_snapshot',rg.version_sha256_snapshot,
          'active_at',rg.active_at
        ) order by rg.created_at)
        from pci.rights_grants rg
        where rg.purchase_id=p.purchase_id
      ),'[]'::jsonb),
      'assets',coalesce((
        select jsonb_agg(jsonb_build_object(
          'creative_asset_id',ca.creative_asset_id,
          'status',ca.status,
          'submission_id',ca.source_submission_id,
          'submission_version_id',ca.source_submission_version_id,
          'version_number',sv.version_number,
          'original_filename',sv.original_filename,
          'mime_type',sv.mime_type,
          'file_size_bytes',sv.file_size_bytes,
          'duration_seconds',sv.duration_seconds,
          'width',sv.width,
          'height',sv.height,
          'sha256',ca.sha256,
          'provisioned_at',ca.provisioned_at,
          'created_at',ca.created_at
        ) order by ca.created_at)
        from pci.creative_assets ca
        join pci.submission_versions sv on sv.submission_version_id=ca.source_submission_version_id
        where ca.purchase_id=p.purchase_id
      ),'[]'::jsonb)
    ) item
    from pci.purchases p
    join pci.creators c on c.creator_id=p.creator_id
    left join pci.payables py
      on py.purchase_id=p.purchase_id and py.concept_type='base_purchase'
    where p.workspace_id=p_workspace_id
  ) q;

  return jsonb_build_object('ok',true,'workspace_id',p_workspace_id,'items',v_items);
end;
$$;

revoke all on function pci_api.creator_purchases(uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_purchases(uuid,text) from public,anon,authenticated;
grant execute on function pci_api.creator_purchases(uuid) to service_role;
grant execute on function pci_api.admin_purchases(uuid,text) to service_role;

comment on function pci_api.admin_purchases(uuid,text) is
  'Protocol purchase projection includes rights and Creative Asset operational state but never private asset Storage paths.';