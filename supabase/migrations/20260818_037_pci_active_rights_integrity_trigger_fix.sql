-- Protocol Creative Insights (PCI)
-- Phase 1L correction: the active-rights integrity constraint is shared by
-- rights_grants, creative_assets and payables, so it resolves purchase_id
-- from the triggering row instead of assuming a common column shape.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.assert_active_rights_paid_and_asset_backed()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_purchase_id uuid;
  v_grant pci.rights_grants%rowtype;
  v_payable pci.payables%rowtype;
  v_asset pci.creative_assets%rowtype;
  v_version pci.submission_versions%rowtype;
begin
  if tg_table_name not in ('rights_grants','creative_assets','payables') then
    raise exception using errcode='23514',message='pci_active_rights_integrity_trigger_table_invalid';
  end if;

  v_purchase_id := nullif(v_row->>'purchase_id','')::uuid;
  if v_purchase_id is null then return null; end if;

  select * into v_payable
  from pci.payables py
  where py.purchase_id=v_purchase_id
    and py.concept_type='base_purchase';

  for v_grant in
    select rg.*
    from pci.rights_grants rg
    where rg.purchase_id=v_purchase_id
      and rg.status='active'
    order by rg.rights_grant_id
  loop
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
  end loop;

  return null;
end;
$$;

revoke all on function pci.assert_active_rights_paid_and_asset_backed() from public,anon,authenticated;
grant execute on function pci.assert_active_rights_paid_and_asset_backed() to service_role;

comment on function pci.assert_active_rights_paid_and_asset_backed() is
  'Deferred cross-table invariant: active Rights Grants require a paid base Payable, exact frozen version/hash and matching Creative Asset.';