-- Protocol Creative Insights (PCI)
-- Phase 1K: manual payout registration, confirmation, failure and pre-rights reversal.
-- Intentionally stored in Git only; not applied to production yet.

alter table pci.payouts
  add column if not exists transferred_at timestamptz null;

alter table pci.payout_allocations
  add column if not exists payment_confirmation_id uuid null
    references pci.payable_payment_confirmations(confirmation_id) on delete restrict,
  add column if not exists payment_destination_snapshot jsonb not null default '{}'::jsonb;

-- A provider operation/reference may only be registered once inside a workspace.
create unique index if not exists pci_payouts_provider_reference_uidx
  on pci.payouts (workspace_id, provider, provider_reference)
  where provider_reference is not null;

create index if not exists pci_payout_allocations_payable_idx
  on pci.payout_allocations (payable_id, created_at desc);

-- Payout financial identity is immutable after creation. Only lifecycle status/timestamps
-- and narrowly scoped operational metadata may evolve through commands.
create or replace function pci.guard_payout_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payout_id is distinct from old.payout_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.provider is distinct from old.provider
     or new.method is distinct from old.method
     or new.currency is distinct from old.currency
     or new.amount is distinct from old.amount
     or new.provider_reference is distinct from old.provider_reference
     or new.payment_destination_snapshot is distinct from old.payment_destination_snapshot
     or new.proof_storage_bucket is distinct from old.proof_storage_bucket
     or new.proof_storage_path is distinct from old.proof_storage_path
     or new.transferred_at is distinct from old.transferred_at
     or new.initiated_at is distinct from old.initiated_at
     or new.registered_by is distinct from old.registered_by
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514', message = 'pci_payout_identity_immutable';
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_payout_identity() from public, anon, authenticated;
grant execute on function pci.guard_payout_identity() to service_role;

drop trigger if exists pci_payouts_identity_guard on pci.payouts;
create trigger pci_payouts_identity_guard
before update on pci.payouts
for each row execute function pci.guard_payout_identity();

create or replace function pci.guard_payout_allocation_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = 'pci_payout_allocation_append_only';
end;
$$;

revoke all on function pci.guard_payout_allocation_append_only() from public, anon, authenticated;
grant execute on function pci.guard_payout_allocation_append_only() to service_role;

drop trigger if exists pci_payout_allocations_append_only on pci.payout_allocations;
create trigger pci_payout_allocations_append_only
before update or delete on pci.payout_allocations
for each row execute function pci.guard_payout_allocation_append_only();

create or replace function pci_api.admin_register_payout(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payable_id uuid,
  p_amount numeric,
  p_provider text,
  p_method text,
  p_provider_reference text,
  p_transferred_at timestamptz,
  p_proof_storage_bucket text,
  p_proof_storage_path text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payable pci.payables%rowtype;
  v_purchase pci.purchases%rowtype;
  v_confirmation pci.payable_payment_confirmations%rowtype;
  v_provider text := lower(btrim(coalesce(p_provider, '')));
  v_method text := lower(btrim(coalesce(p_method, '')));
  v_reference text := btrim(coalesce(p_provider_reference, ''));
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
  v_available numeric(14,2);
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_payout_id uuid;
  v_allocation_id uuid;
  v_result jsonb;
begin
  if p_payable_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_payout_context_required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'pci_payout_amount_invalid';
  end if;
  if v_provider = '' or v_provider !~ '^[a-z0-9_:-]{1,80}$' then
    raise exception using errcode = '22023', message = 'pci_payout_provider_invalid';
  end if;
  if v_method = '' or v_method !~ '^[a-z0-9_:-]{1,80}$' then
    raise exception using errcode = '22023', message = 'pci_payout_method_invalid';
  end if;
  if v_reference = '' or length(v_reference) > 200 then
    raise exception using errcode = '22023', message = 'pci_payout_reference_required';
  end if;
  if p_transferred_at is null or p_transferred_at > now() + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'pci_payout_transferred_at_invalid';
  end if;
  if p_proof_storage_bucket is not null and p_proof_storage_bucket <> 'pci-payout-proofs' then
    raise exception using errcode = '22023', message = 'pci_payout_proof_bucket_invalid';
  end if;
  if (p_proof_storage_bucket is null) <> (p_proof_storage_path is null) then
    raise exception using errcode = '22023', message = 'pci_payout_proof_context_invalid';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_payable
  from pci.payables py
  where py.payable_id = p_payable_id
    and py.workspace_id = p_workspace_id
  for update;

  if v_payable.payable_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payable_not_found';
  end if;
  if v_payable.status <> 'ready_to_pay' then
    raise exception using errcode = '23514', message = 'pci_payable_not_ready_to_pay';
  end if;
  if v_payable.payment_account_id is null
     or v_payable.payment_account_confirmed_at is null
     or v_payable.payment_account_snapshot = '{}'::jsonb then
    raise exception using errcode = '23514', message = 'pci_payable_destination_not_confirmed';
  end if;

  select * into v_purchase
  from pci.purchases p
  where p.purchase_id = v_payable.purchase_id
    and p.workspace_id = p_workspace_id
  for update;

  if v_purchase.purchase_id is null or v_purchase.status <> 'agreed' then
    raise exception using errcode = '23514', message = 'pci_purchase_not_payable';
  end if;

  select * into v_confirmation
  from pci.payable_payment_confirmations pc
  where pc.payable_id = v_payable.payable_id
  order by pc.confirmed_at desc, pc.confirmation_id desc
  limit 1;

  if v_confirmation.confirmation_id is null
     or v_confirmation.payment_account_id is distinct from v_payable.payment_account_id
     or v_confirmation.payment_account_snapshot is distinct from v_payable.payment_account_snapshot then
    raise exception using errcode = '23514', message = 'pci_payable_destination_confirmation_mismatch';
  end if;

  -- Protect the command before allocating money.
  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'admin_register_payout', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'admin_register_payout'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc
    limit 1;
    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  select coalesce(sum(pa.amount), 0)
  into v_confirmed
  from pci.payout_allocations pa
  join pci.payouts po on po.payout_id = pa.payout_id
  where pa.payable_id = v_payable.payable_id
    and po.status = 'confirmed';

  select coalesce(sum(pa.amount), 0)
  into v_inflight
  from pci.payout_allocations pa
  join pci.payouts po on po.payout_id = pa.payout_id
  where pa.payable_id = v_payable.payable_id
    and po.status = 'initiated';

  v_available := v_payable.amount_due - v_confirmed - v_inflight;
  if v_available <= 0 or p_amount > v_available then
    raise exception using errcode = '23514', message = 'pci_payout_exceeds_remaining_balance';
  end if;

  if exists (
    select 1 from pci.payouts po
    where po.workspace_id = p_workspace_id
      and po.provider = v_provider
      and po.provider_reference = v_reference
  ) then
    raise exception using errcode = '23505', message = 'pci_payout_reference_duplicate';
  end if;

  if p_proof_storage_path is not null then
    if p_proof_storage_path !~ ('^workspace/' || replace(p_workspace_id, '/', '') || '/payable/' || v_payable.payable_id::text || '/proof/') then
      raise exception using errcode = '23514', message = 'pci_payout_proof_path_invalid';
    end if;
  end if;

  insert into pci.payouts (
    workspace_id, creator_id, status, provider, method, currency, amount,
    provider_reference, payment_destination_snapshot,
    proof_storage_bucket, proof_storage_path,
    transferred_at, initiated_at, registered_by,
    metadata
  ) values (
    p_workspace_id, v_payable.creator_id, 'initiated', v_provider, v_method,
    v_payable.currency, p_amount, v_reference,
    v_payable.payment_account_snapshot,
    p_proof_storage_bucket, p_proof_storage_path,
    p_transferred_at, now(), p_actor_user_id,
    jsonb_build_object(
      'purchase_id', v_purchase.purchase_id,
      'payment_confirmation_id', v_confirmation.confirmation_id
    )
  ) returning payout_id into v_payout_id;

  insert into pci.payout_allocations (
    payout_id, payable_id, amount, payment_confirmation_id, payment_destination_snapshot
  ) values (
    v_payout_id, v_payable.payable_id, p_amount,
    v_confirmation.confirmation_id, v_payable.payment_account_snapshot
  ) returning payout_allocation_id into v_allocation_id;

  update pci.payables
  set status = 'processing'
  where payable_id = v_payable.payable_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'payout', v_payout_id,
    'payout.registered', null, 'initiated',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'payable_id', v_payable.payable_id,
      'allocation_id', v_allocation_id,
      'amount', p_amount,
      'currency', v_payable.currency,
      'provider', v_provider,
      'provider_reference', v_reference,
      'transferred_at', p_transferred_at,
      'payment_confirmation_id', v_confirmation.confirmation_id
    )
  );

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'payable', v_payable.payable_id,
    'payable.payout_processing', 'ready_to_pay', 'processing',
    p_request_id, v_receipt_id,
    jsonb_build_object('payout_id', v_payout_id, 'amount', p_amount)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'payout_id', v_payout_id,
    'payout_status', 'initiated',
    'payout_allocation_id', v_allocation_id,
    'payable_id', v_payable.payable_id,
    'payable_status', 'processing',
    'amount', p_amount,
    'currency', v_payable.currency,
    'remaining_unreserved', v_available - p_amount,
    'provider', v_provider,
    'provider_reference', v_reference,
    'transferred_at', p_transferred_at
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'payout', result_entity_id = v_payout_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.admin_confirm_payout(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payout_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
  v_allocation pci.payout_allocations%rowtype;
  v_payable pci.payables%rowtype;
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
  v_new_status text;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_payout_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_payout_confirmation_context_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_payout
  from pci.payouts po
  where po.payout_id = p_payout_id
    and po.workspace_id = p_workspace_id
  for update;

  if v_payout.payout_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payout_not_found';
  end if;

  -- Exact retry after a committed confirmation returns the current result.
  if v_payout.status = 'confirmed' then
    select pa.* into v_allocation
    from pci.payout_allocations pa
    where pa.payout_id = v_payout.payout_id
    order by pa.created_at
    limit 1;
    select * into v_payable from pci.payables py where py.payable_id = v_allocation.payable_id;
    return jsonb_build_object(
      'ok', true,
      'payout_id', v_payout.payout_id,
      'payout_status', 'confirmed',
      'payable_id', v_payable.payable_id,
      'payable_status', v_payable.status,
      'amount', v_payout.amount,
      'currency', v_payout.currency,
      'confirmed_at', v_payout.confirmed_at,
      'idempotent_replay', true
    );
  end if;

  if v_payout.status <> 'initiated' then
    raise exception using errcode = '23514', message = 'pci_payout_not_confirmable';
  end if;

  select pa.* into v_allocation
  from pci.payout_allocations pa
  where pa.payout_id = v_payout.payout_id
  order by pa.created_at
  limit 1;

  if v_allocation.payout_allocation_id is null then
    raise exception using errcode = '23514', message = 'pci_payout_allocation_required';
  end if;
  if (select count(*) from pci.payout_allocations pa where pa.payout_id = v_payout.payout_id) <> 1 then
    raise exception using errcode = '23514', message = 'pci_multi_payable_payout_not_supported';
  end if;

  select * into v_payable
  from pci.payables py
  where py.payable_id = v_allocation.payable_id
    and py.workspace_id = p_workspace_id
  for update;

  if v_payable.payable_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payable_not_found';
  end if;
  if v_payable.status <> 'processing' then
    raise exception using errcode = '23514', message = 'pci_payable_not_processing';
  end if;

  if v_payout.payment_destination_snapshot is distinct from v_allocation.payment_destination_snapshot
     or v_allocation.payment_destination_snapshot is distinct from v_payable.payment_account_snapshot then
    raise exception using errcode = '23514', message = 'pci_payout_destination_snapshot_mismatch';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'admin_confirm_payout', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'admin_confirm_payout'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  update pci.payouts
  set status = 'confirmed', confirmed_at = now()
  where payout_id = v_payout.payout_id;

  select coalesce(sum(pa.amount), 0)
  into v_confirmed
  from pci.payout_allocations pa
  join pci.payouts po on po.payout_id = pa.payout_id
  where pa.payable_id = v_payable.payable_id
    and po.status = 'confirmed';

  select coalesce(sum(pa.amount), 0)
  into v_inflight
  from pci.payout_allocations pa
  join pci.payouts po on po.payout_id = pa.payout_id
  where pa.payable_id = v_payable.payable_id
    and po.status = 'initiated';

  if v_confirmed >= v_payable.amount_due then
    v_new_status := 'paid';
    update pci.payables
    set status = 'paid', paid_at = now()
    where payable_id = v_payable.payable_id;
  elsif v_inflight > 0 then
    v_new_status := 'processing';
  else
    v_new_status := 'ready_to_pay';
    update pci.payables
    set status = 'ready_to_pay', paid_at = null
    where payable_id = v_payable.payable_id;
  end if;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'payout', v_payout.payout_id,
    'payout.confirmed', 'initiated', 'confirmed',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'payable_id', v_payable.payable_id,
      'amount', v_payout.amount,
      'currency', v_payout.currency,
      'confirmed_total', v_confirmed
    )
  );

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'payable', v_payable.payable_id,
    case when v_new_status = 'paid' then 'payable.paid' else 'payable.partial_payment_confirmed' end,
    'processing', v_new_status,
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'payout_id', v_payout.payout_id,
      'confirmed_total', v_confirmed,
      'amount_due', v_payable.amount_due,
      'remaining_due', greatest(v_payable.amount_due - v_confirmed, 0)
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_payout_confirmed',
    'payout', v_payout.payout_id,
    jsonb_build_object(
      'creator_id', v_payout.creator_id,
      'payable_id', v_payable.payable_id,
      'amount', v_payout.amount,
      'currency', v_payout.currency,
      'payable_status', v_new_status
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'payout_id', v_payout.payout_id,
    'payout_status', 'confirmed',
    'payable_id', v_payable.payable_id,
    'payable_status', v_new_status,
    'amount', v_payout.amount,
    'currency', v_payout.currency,
    'confirmed_total', v_confirmed,
    'remaining_due', greatest(v_payable.amount_due - v_confirmed, 0),
    'confirmed_at', now()
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'payout', result_entity_id = v_payout.payout_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.admin_fail_payout(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payout_id uuid,
  p_reason text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
  v_allocation pci.payout_allocations%rowtype;
  v_payable pci.payables%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
  v_new_status text;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_payout_id is null or p_idempotency_key is null or p_request_id is null or v_reason is null then
    raise exception using errcode = '22023', message = 'pci_payout_failure_context_required';
  end if;
  if length(v_reason) > 2000 then
    raise exception using errcode = '22023', message = 'pci_payout_failure_reason_invalid';
  end if;
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_payout from pci.payouts po
  where po.payout_id = p_payout_id and po.workspace_id = p_workspace_id
  for update;
  if v_payout.payout_id is null then raise exception using errcode = 'P0002', message = 'pci_payout_not_found'; end if;
  if v_payout.status <> 'initiated' then raise exception using errcode = '23514', message = 'pci_payout_not_failable'; end if;

  select * into v_allocation from pci.payout_allocations pa where pa.payout_id = v_payout.payout_id order by pa.created_at limit 1;
  if v_allocation.payout_allocation_id is null then raise exception using errcode = '23514', message = 'pci_payout_allocation_required'; end if;
  select * into v_payable from pci.payables py where py.payable_id = v_allocation.payable_id for update;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id, command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id, 'admin_fail_payout', p_request_id, 'processing'
  ) on conflict do nothing returning command_receipt_id into v_receipt_id;
  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='operator' and cr.actor_user_id=p_actor_user_id and cr.command_name='admin_fail_payout'
      and cr.idempotency_key=p_idempotency_key order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  update pci.payouts set status='failed', failed_at=now(), metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('failure_reason',v_reason)
  where payout_id=v_payout.payout_id;

  select coalesce(sum(pa.amount),0) into v_confirmed
  from pci.payout_allocations pa join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='confirmed';
  select coalesce(sum(pa.amount),0) into v_inflight
  from pci.payout_allocations pa join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='initiated';

  if v_confirmed >= v_payable.amount_due then
    v_new_status := 'paid';
    update pci.payables set status='paid', paid_at=coalesce(paid_at,now()) where payable_id=v_payable.payable_id;
  elsif v_inflight > 0 then
    v_new_status := 'processing';
  else
    v_new_status := 'ready_to_pay';
    update pci.payables set status='ready_to_pay', paid_at=null where payable_id=v_payable.payable_id;
  end if;

  perform pci.append_event(p_workspace_id,'operator',p_actor_user_id,null,'payout',v_payout.payout_id,
    'payout.failed','initiated','failed',p_request_id,v_receipt_id,jsonb_build_object('reason',v_reason,'payable_id',v_payable.payable_id));
  perform pci.append_event(p_workspace_id,'operator',p_actor_user_id,null,'payable',v_payable.payable_id,
    'payable.payout_failed','processing',v_new_status,p_request_id,v_receipt_id,jsonb_build_object('payout_id',v_payout.payout_id));

  v_result := jsonb_build_object('ok',true,'payout_id',v_payout.payout_id,'payout_status','failed',
    'payable_id',v_payable.payable_id,'payable_status',v_new_status,'reason',v_reason);
  update pci.command_receipts set status='completed',result_entity_type='payout',result_entity_id=v_payout.payout_id,
    response_snapshot=v_result,completed_at=now() where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

create or replace function pci_api.admin_reverse_payout(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payout_id uuid,
  p_reason text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
  v_allocation pci.payout_allocations%rowtype;
  v_payable pci.payables%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
  v_new_status text;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_payout_id is null or p_idempotency_key is null or p_request_id is null or v_reason is null then
    raise exception using errcode = '22023', message = 'pci_payout_reversal_context_required';
  end if;
  if length(v_reason) > 2000 then raise exception using errcode='22023',message='pci_payout_reversal_reason_invalid'; end if;
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_payout from pci.payouts po where po.payout_id=p_payout_id and po.workspace_id=p_workspace_id for update;
  if v_payout.payout_id is null then raise exception using errcode='P0002',message='pci_payout_not_found'; end if;
  if v_payout.status <> 'confirmed' then raise exception using errcode='23514',message='pci_payout_not_reversible'; end if;

  select * into v_allocation from pci.payout_allocations pa where pa.payout_id=v_payout.payout_id order by pa.created_at limit 1;
  select * into v_payable from pci.payables py where py.payable_id=v_allocation.payable_id for update;

  if exists (
    select 1 from pci.rights_grants rg
    where rg.purchase_id=v_payable.purchase_id and rg.status <> 'pending_payment'
  ) then
    raise exception using errcode='23514',message='pci_payout_reversal_requires_incident_after_rights_activation';
  end if;

  insert into pci.command_receipts(idempotency_key,actor_type,actor_user_id,workspace_id,command_name,request_id,status)
  values(p_idempotency_key,'operator',p_actor_user_id,p_workspace_id,'admin_reverse_payout',p_request_id,'processing')
  on conflict do nothing returning command_receipt_id into v_receipt_id;
  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='operator' and cr.actor_user_id=p_actor_user_id and cr.command_name='admin_reverse_payout'
      and cr.idempotency_key=p_idempotency_key order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  update pci.payouts set status='reversed',reversed_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('reversal_reason',v_reason)
  where payout_id=v_payout.payout_id;

  select coalesce(sum(pa.amount),0) into v_confirmed
  from pci.payout_allocations pa join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='confirmed';
  select coalesce(sum(pa.amount),0) into v_inflight
  from pci.payout_allocations pa join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='initiated';

  if v_confirmed >= v_payable.amount_due then
    v_new_status := 'paid';
    update pci.payables set status='paid',paid_at=coalesce(paid_at,now()) where payable_id=v_payable.payable_id;
  elsif v_inflight > 0 then
    v_new_status := 'processing';
    update pci.payables set status='processing',paid_at=null where payable_id=v_payable.payable_id;
  else
    v_new_status := 'ready_to_pay';
    update pci.payables set status='ready_to_pay',paid_at=null where payable_id=v_payable.payable_id;
  end if;

  perform pci.append_event(p_workspace_id,'operator',p_actor_user_id,null,'payout',v_payout.payout_id,
    'payout.reversed','confirmed','reversed',p_request_id,v_receipt_id,jsonb_build_object('reason',v_reason,'payable_id',v_payable.payable_id));
  perform pci.append_event(p_workspace_id,'operator',p_actor_user_id,null,'payable',v_payable.payable_id,
    'payable.payout_reversed',v_payable.status,v_new_status,p_request_id,v_receipt_id,
    jsonb_build_object('payout_id',v_payout.payout_id,'confirmed_total',v_confirmed,'remaining_due',greatest(v_payable.amount_due-v_confirmed,0)));

  v_result:=jsonb_build_object('ok',true,'payout_id',v_payout.payout_id,'payout_status','reversed',
    'payable_id',v_payable.payable_id,'payable_status',v_new_status,'confirmed_total',v_confirmed,
    'remaining_due',greatest(v_payable.amount_due-v_confirmed,0),'reason',v_reason);
  update pci.command_receipts set status='completed',result_entity_type='payout',result_entity_id=v_payout.payout_id,
    response_snapshot=v_result,completed_at=now() where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

revoke all on function pci_api.admin_register_payout(uuid,text,uuid,numeric,text,text,text,timestamptz,text,text,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_confirm_payout(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_fail_payout(uuid,text,uuid,text,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_reverse_payout(uuid,text,uuid,text,uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.admin_register_payout(uuid,text,uuid,numeric,text,text,text,timestamptz,text,text,uuid,uuid) to service_role;
grant execute on function pci_api.admin_confirm_payout(uuid,text,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.admin_fail_payout(uuid,text,uuid,text,uuid,uuid) to service_role;
grant execute on function pci_api.admin_reverse_payout(uuid,text,uuid,text,uuid,uuid) to service_role;

comment on function pci_api.admin_register_payout(uuid,text,uuid,numeric,text,text,text,timestamptz,text,text,uuid,uuid) is
  'Registers one external manual transfer against one confirmed payable destination. The transfer does not count as paid until explicitly confirmed.';
comment on function pci_api.admin_confirm_payout(uuid,text,uuid,uuid,uuid) is
  'Confirms an initiated payout. Confirmed allocation amounts determine whether the payable becomes paid or returns ready_to_pay for a remaining balance.';