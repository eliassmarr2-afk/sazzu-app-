-- Protocol Creative Insights (PCI)
-- Phase 1L hardening: settlement requires every grant active and every asset available.
-- Exhausted asset promotions can be explicitly retried by an authenticated Protocol operator.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.assert_settled_purchase_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_purchase pci.purchases%rowtype;
  v_payable pci.payables%rowtype;
  v_total_grants integer;
  v_nonactive_grants integer;
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

  select count(*),count(*) filter(where rg.status <> 'active')
  into v_total_grants,v_nonactive_grants
  from pci.rights_grants rg
  where rg.purchase_id=v_purchase.purchase_id;

  select count(*),count(*) filter(where ca.status <> 'available')
  into v_assets,v_unavailable
  from pci.creative_assets ca
  where ca.purchase_id=v_purchase.purchase_id;

  if v_total_grants=0
     or v_nonactive_grants<>0
     or v_assets is distinct from v_total_grants
     or v_unavailable<>0
  then
    raise exception using errcode='23514',message='pci_settled_purchase_requires_all_active_rights_and_available_assets';
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

create or replace function pci_api.admin_retry_asset_promotion(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_creative_asset_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_asset pci.creative_assets%rowtype;
  v_rights pci.rights_grants%rowtype;
  v_purchase pci.purchases%rowtype;
  v_payable pci.payables%rowtype;
  v_job pci.outbox%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_creative_asset_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode='22023',message='pci_asset_retry_context_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_asset
  from pci.creative_assets ca
  where ca.creative_asset_id=p_creative_asset_id
    and ca.workspace_id=p_workspace_id
  for update;

  if v_asset.creative_asset_id is null then
    raise exception using errcode='P0002',message='pci_creative_asset_not_found';
  end if;
  if v_asset.status <> 'failed' then
    raise exception using errcode='23514',message='pci_asset_retry_requires_failed_asset';
  end if;

  select * into v_rights from pci.rights_grants rg
  where rg.rights_grant_id=v_asset.rights_grant_id
  for update;
  if v_rights.status <> 'active' then
    raise exception using errcode='23514',message='pci_asset_retry_requires_active_rights';
  end if;

  select * into v_purchase from pci.purchases p
  where p.purchase_id=v_asset.purchase_id and p.workspace_id=p_workspace_id
  for update;
  if v_purchase.status <> 'agreed' then
    raise exception using errcode='23514',message='pci_asset_retry_requires_agreed_purchase';
  end if;

  select * into v_payable from pci.payables py
  where py.purchase_id=v_purchase.purchase_id and py.concept_type='base_purchase'
  for update;
  if v_payable.status <> 'paid' then
    raise exception using errcode='23514',message='pci_asset_retry_requires_paid_payable';
  end if;

  select * into v_job from pci.outbox o
  where o.job_type='promote_asset' and o.entity_id=v_asset.creative_asset_id
  for update;
  if v_job.outbox_id is null then
    raise exception using errcode='P0002',message='pci_asset_retry_outbox_not_found';
  end if;
  if v_job.status <> 'failed' then
    raise exception using errcode='23514',message='pci_asset_retry_requires_failed_job';
  end if;

  insert into pci.command_receipts(
    idempotency_key,actor_type,actor_user_id,workspace_id,
    command_name,request_id,status
  ) values(
    p_idempotency_key,'operator',p_actor_user_id,p_workspace_id,
    'admin_retry_asset_promotion',p_request_id,'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='operator'
      and cr.actor_user_id=p_actor_user_id
      and cr.command_name='admin_retry_asset_promotion'
      and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;

    if v_existing.command_receipt_id is null then
      raise exception using errcode='23505',message='pci_idempotency_conflict';
    end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  update pci.creative_assets
  set status='provisioning',
      metadata=metadata || jsonb_build_object(
        'manual_retry_requested_at',now(),
        'manual_retry_requested_by',p_actor_user_id
      )
  where creative_asset_id=v_asset.creative_asset_id;

  update pci.outbox
  set status='pending',attempts=0,available_at=now(),locked_at=null,locked_by=null,
      last_error_code=null,last_error_message=null,completed_at=null
  where outbox_id=v_job.outbox_id;

  perform pci.append_event(
    p_workspace_id,'operator',p_actor_user_id,v_asset.creator_id,
    'creative_asset',v_asset.creative_asset_id,
    'asset.promotion_retry_requested','failed','provisioning',
    p_request_id,v_receipt_id,
    jsonb_build_object('outbox_id',v_job.outbox_id,'previous_attempts',v_job.attempts)
  );

  v_result := jsonb_build_object(
    'ok',true,
    'creative_asset_id',v_asset.creative_asset_id,
    'asset_status','provisioning',
    'outbox_id',v_job.outbox_id,
    'outbox_status','pending'
  );

  update pci.command_receipts
  set status='completed',result_entity_type='creative_asset',
      result_entity_id=v_asset.creative_asset_id,response_snapshot=v_result,completed_at=now()
  where command_receipt_id=v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.admin_retry_asset_promotion(uuid,text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function pci_api.admin_retry_asset_promotion(uuid,text,uuid,uuid,uuid) to service_role;

comment on function pci_api.admin_retry_asset_promotion(uuid,text,uuid,uuid,uuid) is
  'Explicitly resets the same exhausted promotion job after validating the paid purchase and active rights; no duplicate asset is created.';