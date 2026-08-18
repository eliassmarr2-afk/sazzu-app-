-- Protocol Creative Insights (PCI)
-- Phase 1J refinement: exact retries of payment-destination confirmation must
-- return the original confirmation even if the payable later advances state.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_confirm_payable_payment_account(
  p_actor_user_id uuid,
  p_payable_id uuid,
  p_payment_account_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_payable pci.payables%rowtype;
  v_purchase pci.purchases%rowtype;
  v_account pci.creator_payment_accounts%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_confirmation_id uuid;
  v_snapshot jsonb;
  v_old_status text;
  v_result jsonb;
begin
  if p_payable_id is null or p_payment_account_id is null
     or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_payable_confirmation_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_payable
  from pci.payables p
  where p.payable_id = p_payable_id
    and p.creator_id = v_creator.creator_id
  for update;

  if v_payable.payable_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payable_not_found';
  end if;

  -- Idempotency is resolved before mutable status validation. This makes an
  -- exact retry safe even if Protocol already moved the payable to processing.
  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_payable.workspace_id,
    'creator_confirm_payable_payment_account', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_confirm_payable_payment_account'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;

    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  if v_payable.concept_type <> 'base_purchase' then
    raise exception using errcode = '23514', message = 'pci_payable_confirmation_not_supported';
  end if;

  if v_payable.status not in ('awaiting_confirmation','ready_to_pay') then
    raise exception using errcode = '23514', message = 'pci_payable_not_confirmable';
  end if;

  select * into v_purchase
  from pci.purchases p
  where p.purchase_id = v_payable.purchase_id
    and p.creator_id = v_creator.creator_id
  for update;

  if v_purchase.purchase_id is null or v_purchase.status <> 'agreed' then
    raise exception using errcode = '23514', message = 'pci_purchase_not_payable';
  end if;

  select * into v_account
  from pci.creator_payment_accounts a
  where a.payment_account_id = p_payment_account_id
    and a.creator_id = v_creator.creator_id
  for update;

  if v_account.payment_account_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payment_account_not_found';
  end if;

  if v_account.status <> 'active' then
    raise exception using errcode = '23514', message = 'pci_payment_account_not_active';
  end if;

  v_snapshot := jsonb_build_object(
    'payment_account_id', v_account.payment_account_id,
    'provider', v_account.provider,
    'account_type', v_account.account_type,
    'holder_name', v_account.holder_name,
    'holder_document_masked', v_account.holder_document_masked,
    'alias', v_account.alias,
    'account_identifier_ciphertext', v_account.account_identifier_ciphertext,
    'account_identifier_last4', v_account.account_identifier_last4,
    'account_created_at', v_account.created_at
  );

  insert into pci.payable_payment_confirmations (
    payable_id, workspace_id, creator_id, payment_account_id,
    payment_account_snapshot, confirmed_by_user_id, confirmed_at,
    request_id, command_receipt_id
  ) values (
    v_payable.payable_id, v_payable.workspace_id, v_creator.creator_id,
    v_account.payment_account_id, v_snapshot, p_actor_user_id, now(),
    p_request_id, v_receipt_id
  ) returning confirmation_id into v_confirmation_id;

  v_old_status := v_payable.status;

  update pci.payables
  set payment_account_id = v_account.payment_account_id,
      payment_account_snapshot = v_snapshot,
      payment_account_confirmed_at = now(),
      status = 'ready_to_pay'
  where payable_id = v_payable.payable_id;

  perform pci.append_event(
    v_payable.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'payable', v_payable.payable_id,
    'payable.payment_destination_confirmed', v_old_status, 'ready_to_pay',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'confirmation_id', v_confirmation_id,
      'payment_account_id', v_account.payment_account_id,
      'provider', v_account.provider,
      'account_type', v_account.account_type,
      'identifier_last4', v_account.account_identifier_last4
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_payable.workspace_id,
    'notify_protocol_payable_ready',
    'payable', v_payable.payable_id,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'purchase_id', v_purchase.purchase_id,
      'confirmation_id', v_confirmation_id,
      'amount_due', v_payable.amount_due,
      'currency', v_payable.currency
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'confirmation_id', v_confirmation_id,
    'payable_id', v_payable.payable_id,
    'purchase_id', v_purchase.purchase_id,
    'status', 'ready_to_pay',
    'payment_account', jsonb_build_object(
      'payment_account_id', v_account.payment_account_id,
      'provider', v_account.provider,
      'account_type', v_account.account_type,
      'holder_name', v_account.holder_name,
      'holder_document_masked', v_account.holder_document_masked,
      'alias', v_account.alias,
      'account_identifier_last4', v_account.account_identifier_last4
    ),
    'amount_due', v_payable.amount_due,
    'currency', v_payable.currency
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'payable_payment_confirmation',
      result_entity_id = v_confirmation_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.creator_confirm_payable_payment_account(uuid,uuid,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_confirm_payable_payment_account(uuid,uuid,uuid,uuid,uuid) to service_role;
