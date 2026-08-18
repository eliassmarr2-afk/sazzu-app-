-- Protocol Creative Insights (PCI)
-- Phase 1I: Creator-side negotiation messages, offer rejection and counteroffers.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_send_negotiation_message(
  p_actor_user_id uuid,
  p_negotiation_id uuid,
  p_body text,
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
  v_negotiation pci.negotiations%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_message_id uuid;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_negotiation_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_negotiation_message_context_required';
  end if;
  if v_body = '' or length(v_body) > 5000 then
    raise exception using errcode = '22023', message = 'pci_negotiation_message_invalid';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = p_negotiation_id
    and n.creator_id = v_creator.creator_id
  for update;

  if v_negotiation.negotiation_id is null then
    raise exception using errcode = 'P0002', message = 'pci_negotiation_not_found';
  end if;
  if v_negotiation.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_negotiation_not_open';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_negotiation.workspace_id,
    'creator_send_negotiation_message', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_send_negotiation_message'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;

    if v_existing_receipt.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing_receipt.status = 'completed' then
      return v_existing_receipt.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  insert into pci.messages (
    negotiation_id, sender_type, sender_user_id, sender_creator_id, body
  ) values (
    v_negotiation.negotiation_id, 'creator', p_actor_user_id, v_creator.creator_id, v_body
  ) returning message_id into v_message_id;

  perform pci.append_event(
    v_negotiation.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'message', v_message_id,
    'negotiation.message_sent', null, null,
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'negotiation_id', v_negotiation.negotiation_id,
      'sender_type', 'creator'
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_negotiation.workspace_id,
    'notify_protocol_negotiation_message',
    'message', v_message_id,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'negotiation_id', v_negotiation.negotiation_id,
      'submission_id', v_negotiation.submission_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'message_id', v_message_id,
    'negotiation_id', v_negotiation.negotiation_id,
    'sender_type', 'creator',
    'created_at', now()
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'message',
      result_entity_id = v_message_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.creator_reject_offer(
  p_actor_user_id uuid,
  p_offer_id uuid,
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
  v_offer pci.purchase_offers%rowtype;
  v_negotiation pci.negotiations%rowtype;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_offer_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_offer_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_offer
  from pci.purchase_offers po
  where po.offer_id = p_offer_id
    and po.creator_id = v_creator.creator_id
  for update;

  if v_offer.offer_id is null then
    raise exception using errcode = 'P0002', message = 'pci_offer_not_found';
  end if;
  if v_offer.proposed_by_type <> 'workspace' then
    raise exception using errcode = '23514', message = 'pci_creator_can_only_reject_workspace_offer';
  end if;
  if v_offer.status <> 'sent' then
    raise exception using errcode = '23514', message = 'pci_offer_not_live';
  end if;
  if v_offer.expires_at is not null and v_offer.expires_at <= now() then
    raise exception using errcode = '23514', message = 'pci_offer_expired';
  end if;

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = v_offer.negotiation_id
    and n.creator_id = v_creator.creator_id;

  if v_negotiation.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_negotiation_not_open';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_offer.workspace_id,
    'creator_reject_offer', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_reject_offer'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;

    if v_existing_receipt.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing_receipt.status = 'completed' then
      return v_existing_receipt.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  update pci.purchase_offers
  set status = 'rejected', rejected_at = now()
  where offer_id = v_offer.offer_id;

  perform pci.append_event(
    v_offer.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'purchase_offer', v_offer.offer_id,
    'offer.rejected', 'sent', 'rejected',
    p_request_id, v_receipt_id,
    jsonb_build_object('negotiation_id', v_offer.negotiation_id)
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_offer.workspace_id,
    'notify_protocol_offer_rejected',
    'purchase_offer', v_offer.offer_id,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'negotiation_id', v_offer.negotiation_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'offer_id', v_offer.offer_id,
    'negotiation_id', v_offer.negotiation_id,
    'status', 'rejected'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'purchase_offer',
      result_entity_id = v_offer.offer_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.creator_counter_offer(
  p_actor_user_id uuid,
  p_parent_offer_id uuid,
  p_total_amount numeric,
  p_counter_note text,
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
  v_parent pci.purchase_offers%rowtype;
  v_parent_item pci.purchase_offer_items%rowtype;
  v_negotiation pci.negotiations%rowtype;
  v_offer_id uuid;
  v_offer_item_id uuid;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_note text := nullif(btrim(coalesce(p_counter_note, '')), '');
  v_commercial_terms jsonb;
  v_result jsonb;
begin
  if p_parent_offer_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_offer_context_required';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception using errcode = '22023', message = 'pci_offer_amount_invalid';
  end if;
  if v_note is not null and length(v_note) > 2000 then
    raise exception using errcode = '22023', message = 'pci_counter_note_invalid';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_parent
  from pci.purchase_offers po
  where po.offer_id = p_parent_offer_id
    and po.creator_id = v_creator.creator_id
  for update;

  if v_parent.offer_id is null then
    raise exception using errcode = 'P0002', message = 'pci_offer_not_found';
  end if;
  if v_parent.proposed_by_type <> 'workspace' then
    raise exception using errcode = '23514', message = 'pci_counter_requires_workspace_offer';
  end if;
  if v_parent.status <> 'sent' then
    raise exception using errcode = '23514', message = 'pci_offer_not_live';
  end if;
  if v_parent.expires_at is not null and v_parent.expires_at <= now() then
    raise exception using errcode = '23514', message = 'pci_offer_expired';
  end if;

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = v_parent.negotiation_id
    and n.creator_id = v_creator.creator_id
  for update;

  if v_negotiation.negotiation_id is null then
    raise exception using errcode = 'P0002', message = 'pci_negotiation_not_found';
  end if;
  if v_negotiation.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_negotiation_not_open';
  end if;

  select * into v_parent_item
  from pci.purchase_offer_items poi
  where poi.offer_id = v_parent.offer_id
  order by poi.created_at
  limit 1;

  if v_parent_item.offer_item_id is null then
    raise exception using errcode = '23514', message = 'pci_offer_item_required';
  end if;
  if (select count(*) from pci.purchase_offer_items poi where poi.offer_id = v_parent.offer_id) <> 1 then
    raise exception using errcode = '23514', message = 'pci_counter_multi_item_not_supported';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_parent.workspace_id,
    'creator_counter_offer', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_counter_offer'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;

    if v_existing_receipt.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing_receipt.status = 'completed' then
      return v_existing_receipt.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  update pci.purchase_offers
  set status = 'superseded'
  where offer_id = v_parent.offer_id;

  perform pci.append_event(
    v_parent.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'purchase_offer', v_parent.offer_id,
    'offer.superseded', 'sent', 'superseded',
    p_request_id, v_receipt_id,
    jsonb_build_object('reason', 'creator_counteroffer')
  );

  v_commercial_terms := coalesce(v_parent.commercial_terms_snapshot, '{}'::jsonb)
    || jsonb_build_object('creator_counter_note', v_note);

  insert into pci.purchase_offers (
    workspace_id,
    negotiation_id,
    creator_id,
    parent_offer_id,
    proposed_by_type,
    status,
    currency,
    total_amount,
    rights_package_snapshot,
    payment_terms_snapshot,
    bonus_terms_snapshot,
    commercial_terms_snapshot,
    expires_at,
    sent_at,
    created_by_creator_id
  ) values (
    v_parent.workspace_id,
    v_parent.negotiation_id,
    v_creator.creator_id,
    v_parent.offer_id,
    'creator',
    'sent',
    v_parent.currency,
    p_total_amount,
    v_parent.rights_package_snapshot,
    v_parent.payment_terms_snapshot,
    v_parent.bonus_terms_snapshot,
    v_commercial_terms,
    v_parent.expires_at,
    now(),
    v_creator.creator_id
  ) returning offer_id into v_offer_id;

  insert into pci.purchase_offer_items (
    offer_id, submission_id, submission_version_id, amount, item_terms_snapshot
  ) values (
    v_offer_id,
    v_parent_item.submission_id,
    v_parent_item.submission_version_id,
    p_total_amount,
    v_parent_item.item_terms_snapshot
  ) returning offer_item_id into v_offer_item_id;

  perform pci.append_event(
    v_parent.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'purchase_offer', v_offer_id,
    'offer.countered', null, 'sent',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'negotiation_id', v_parent.negotiation_id,
      'parent_offer_id', v_parent.offer_id,
      'submission_version_id', v_parent_item.submission_version_id,
      'amount', p_total_amount,
      'currency', v_parent.currency
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_parent.workspace_id,
    'notify_protocol_counteroffer',
    'purchase_offer', v_offer_id,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'negotiation_id', v_parent.negotiation_id,
      'parent_offer_id', v_parent.offer_id,
      'amount', p_total_amount,
      'currency', v_parent.currency
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'offer_id', v_offer_id,
    'offer_item_id', v_offer_item_id,
    'parent_offer_id', v_parent.offer_id,
    'negotiation_id', v_parent.negotiation_id,
    'status', 'sent',
    'proposed_by_type', 'creator',
    'amount', p_total_amount,
    'currency', v_parent.currency,
    'expires_at', v_parent.expires_at
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'purchase_offer',
      result_entity_id = v_offer_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.creator_send_negotiation_message(uuid,uuid,text,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_reject_offer(uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_counter_offer(uuid,uuid,numeric,text,uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.creator_send_negotiation_message(uuid,uuid,text,uuid,uuid) to service_role;
grant execute on function pci_api.creator_reject_offer(uuid,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.creator_counter_offer(uuid,uuid,numeric,text,uuid,uuid) to service_role;

comment on function pci_api.creator_counter_offer(uuid,uuid,numeric,text,uuid,uuid) is
  'Creator counteroffer preserves the exact creative version and inherited rights/payment/bonus snapshots; only price and explicit counter note are proposed anew.';