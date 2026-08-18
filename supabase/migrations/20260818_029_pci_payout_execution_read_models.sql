-- Protocol Creative Insights (PCI)
-- Phase 1K: payout queue, execution context and Creator-visible payment history.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.admin_payable_execution_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payable_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payable pci.payables%rowtype;
  v_creator pci.creators%rowtype;
  v_confirmation pci.payable_payment_confirmations%rowtype;
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_payable
  from pci.payables py
  where py.payable_id = p_payable_id
    and py.workspace_id = p_workspace_id;

  if v_payable.payable_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payable_not_found';
  end if;
  if v_payable.status <> 'ready_to_pay' then
    raise exception using errcode = '23514', message = 'pci_payable_not_ready_to_pay';
  end if;

  select * into v_creator from pci.creators c where c.creator_id = v_payable.creator_id;
  select * into v_confirmation
  from pci.payable_payment_confirmations pc
  where pc.payable_id = v_payable.payable_id
  order by pc.confirmed_at desc, pc.confirmation_id desc
  limit 1;

  if v_confirmation.confirmation_id is null
     or v_confirmation.payment_account_snapshot is distinct from v_payable.payment_account_snapshot then
    raise exception using errcode = '23514', message = 'pci_payable_destination_confirmation_mismatch';
  end if;

  select coalesce(sum(pa.amount),0) into v_confirmed
  from pci.payout_allocations pa
  join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='confirmed';

  select coalesce(sum(pa.amount),0) into v_inflight
  from pci.payout_allocations pa
  join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='initiated';

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'payable_id', v_payable.payable_id,
    'purchase_id', v_payable.purchase_id,
    'concept_type', v_payable.concept_type,
    'currency', v_payable.currency,
    'amount_due', v_payable.amount_due,
    'confirmed_amount', v_confirmed,
    'inflight_amount', v_inflight,
    'remaining_amount', greatest(v_payable.amount_due-v_confirmed-v_inflight,0),
    'creator', jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'display_name', v_creator.display_name,
      'email', v_creator.email
    ),
    'payment_confirmation_id', v_confirmation.confirmation_id,
    'payment_account_confirmed_at', v_confirmation.confirmed_at,
    -- This function is service-role-only. The Edge Function must decrypt only on explicit execution request.
    'payment_destination_private', jsonb_build_object(
      'payment_account_id', v_payable.payment_account_id,
      'provider', v_payable.payment_account_snapshot->>'provider',
      'account_type', v_payable.payment_account_snapshot->>'account_type',
      'holder_name', v_payable.payment_account_snapshot->>'holder_name',
      'holder_document_masked', v_payable.payment_account_snapshot->>'holder_document_masked',
      'alias', v_payable.payment_account_snapshot->>'alias',
      'account_identifier_ciphertext', v_payable.payment_account_snapshot->>'account_identifier_ciphertext',
      'account_identifier_last4', v_payable.payment_account_snapshot->>'account_identifier_last4'
    )
  );
end;
$$;

create or replace function pci_api.admin_payouts(
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
      'payout_id',po.payout_id,
      'status',po.status,
      'provider',po.provider,
      'method',po.method,
      'currency',po.currency,
      'amount',po.amount,
      'provider_reference',po.provider_reference,
      'transferred_at',po.transferred_at,
      'initiated_at',po.initiated_at,
      'confirmed_at',po.confirmed_at,
      'failed_at',po.failed_at,
      'reversed_at',po.reversed_at,
      'proof_available',po.proof_storage_path is not null,
      'created_at',po.created_at,
      'creator',jsonb_build_object(
        'creator_id',c.creator_id,
        'display_name',c.display_name,
        'email',c.email
      ),
      'allocation',(
        select jsonb_build_object(
          'payout_allocation_id',pa.payout_allocation_id,
          'payable_id',pa.payable_id,
          'amount',pa.amount,
          'payment_confirmation_id',pa.payment_confirmation_id
        )
        from pci.payout_allocations pa
        where pa.payout_id=po.payout_id
        order by pa.created_at
        limit 1
      )
    ) as item
    from pci.payouts po
    join pci.creators c on c.creator_id=po.creator_id
    where po.workspace_id=p_workspace_id
  )q;

  return jsonb_build_object('ok',true,'workspace_id',p_workspace_id,'items',v_items);
end;
$$;

create or replace function pci_api.admin_payout_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payout_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
  v_creator pci.creators%rowtype;
  v_allocation pci.payout_allocations%rowtype;
  v_payable pci.payables%rowtype;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_payout from pci.payouts po where po.payout_id=p_payout_id and po.workspace_id=p_workspace_id;
  if v_payout.payout_id is null then raise exception using errcode='P0002',message='pci_payout_not_found'; end if;
  select * into v_creator from pci.creators c where c.creator_id=v_payout.creator_id;
  select * into v_allocation from pci.payout_allocations pa where pa.payout_id=v_payout.payout_id order by pa.created_at limit 1;
  select * into v_payable from pci.payables py where py.payable_id=v_allocation.payable_id;

  return jsonb_build_object(
    'ok',true,
    'payout',jsonb_build_object(
      'payout_id',v_payout.payout_id,'status',v_payout.status,'provider',v_payout.provider,'method',v_payout.method,
      'currency',v_payout.currency,'amount',v_payout.amount,'provider_reference',v_payout.provider_reference,
      'transferred_at',v_payout.transferred_at,'initiated_at',v_payout.initiated_at,'confirmed_at',v_payout.confirmed_at,
      'failed_at',v_payout.failed_at,'reversed_at',v_payout.reversed_at,
      'proof_available',v_payout.proof_storage_path is not null,'created_at',v_payout.created_at
    ),
    'creator',jsonb_build_object('creator_id',v_creator.creator_id,'display_name',v_creator.display_name,'email',v_creator.email),
    'allocation',jsonb_build_object('payout_allocation_id',v_allocation.payout_allocation_id,'payable_id',v_allocation.payable_id,
      'amount',v_allocation.amount,'payment_confirmation_id',v_allocation.payment_confirmation_id),
    'payable',jsonb_build_object('payable_id',v_payable.payable_id,'purchase_id',v_payable.purchase_id,'status',v_payable.status,
      'amount_due',v_payable.amount_due,'currency',v_payable.currency,'paid_at',v_payable.paid_at),
    'payment_destination',jsonb_build_object(
      'provider',v_payout.payment_destination_snapshot->>'provider',
      'account_type',v_payout.payment_destination_snapshot->>'account_type',
      'holder_name',v_payout.payment_destination_snapshot->>'holder_name',
      'holder_document_masked',v_payout.payment_destination_snapshot->>'holder_document_masked',
      'alias',v_payout.payment_destination_snapshot->>'alias',
      'account_identifier_last4',v_payout.payment_destination_snapshot->>'account_identifier_last4'
    )
  );
end;
$$;

create or replace function pci_api.creator_payouts(
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
  v_creator:=pci.require_active_creator(p_actor_user_id);
  select coalesce(jsonb_agg(item order by (item->>'created_at') desc),'[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'payout_id',po.payout_id,
      'status',po.status,
      'provider',po.provider,
      'method',po.method,
      'currency',po.currency,
      'amount',po.amount,
      'provider_reference',po.provider_reference,
      'transferred_at',po.transferred_at,
      'confirmed_at',po.confirmed_at,
      'failed_at',po.failed_at,
      'reversed_at',po.reversed_at,
      'proof_available',po.proof_storage_path is not null,
      'created_at',po.created_at,
      'payable_id',(
        select pa.payable_id from pci.payout_allocations pa where pa.payout_id=po.payout_id order by pa.created_at limit 1
      )
    )as item
    from pci.payouts po
    where po.creator_id=v_creator.creator_id
  )q;
  return jsonb_build_object('ok',true,'items',v_items);
end;
$$;

create or replace function pci_api.admin_payout_proof_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payout_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_payout from pci.payouts po where po.payout_id=p_payout_id and po.workspace_id=p_workspace_id;
  if v_payout.payout_id is null then raise exception using errcode='P0002',message='pci_payout_not_found'; end if;
  if v_payout.proof_storage_bucket <> 'pci-payout-proofs' or v_payout.proof_storage_path is null then
    raise exception using errcode='23514',message='pci_payout_proof_not_available';
  end if;
  return jsonb_build_object('ok',true,'payout_id',v_payout.payout_id,'storage_bucket',v_payout.proof_storage_bucket,
    'storage_path',v_payout.proof_storage_path);
end;
$$;

revoke all on function pci_api.admin_payable_execution_context(uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_payouts(uuid,text) from public,anon,authenticated;
revoke all on function pci_api.admin_payout_detail(uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.creator_payouts(uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_payout_proof_context(uuid,text,uuid) from public,anon,authenticated;

grant execute on function pci_api.admin_payable_execution_context(uuid,text,uuid) to service_role;
grant execute on function pci_api.admin_payouts(uuid,text) to service_role;
grant execute on function pci_api.admin_payout_detail(uuid,text,uuid) to service_role;
grant execute on function pci_api.creator_payouts(uuid) to service_role;
grant execute on function pci_api.admin_payout_proof_context(uuid,text,uuid) to service_role;

comment on function pci_api.admin_payable_execution_context(uuid,text,uuid) is
  'Service-role-only payment execution context. Contains ciphertext solely so pci-admin-api can decrypt on explicit operator request; normal read models never expose it.';