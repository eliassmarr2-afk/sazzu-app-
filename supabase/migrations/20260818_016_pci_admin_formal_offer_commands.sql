-- Protocol Creative Insights (PCI)
-- Phase 1I: Protocol-side immutable formal offers.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.send_purchase_offer(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_negotiation_id uuid,
  p_submission_version_id uuid,
  p_total_amount numeric,
  p_currency text,
  p_expires_at timestamptz,
  p_rights_package_snapshot jsonb,
  p_payment_terms_snapshot jsonb,
  p_bonus_terms_snapshot jsonb,
  p_commercial_terms_snapshot jsonb,
  p_parent_offer_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_negotiation pci.negotiations%rowtype;
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_parent pci.purchase_offers%rowtype;
  v_active pci.purchase_offers%rowtype;
  v_offer_id uuid;
  v_offer_item_id uuid;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
  v_result jsonb;
begin
  if p_negotiation_id is null or p_submission_version_id is null
     or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_offer_context_required';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception using errcode = '22023', message = 'pci_offer_amount_invalid';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'pci_offer_currency_invalid';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'pci_offer_expiry_invalid';
  end if;
  if coalesce(p_rights_package_snapshot, '{}'::jsonb) = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'pci_offer_rights_snapshot_required';
  end if;
  if coalesce(p_payment_terms_snapshot, '{}'::jsonb) = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'pci_offer_payment_terms_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = p_negotiation_id
    and n.workspace_id = p_workspace_id
  for update;

  if v_negotiation.negotiation_id is null then
    raise exception using errcode = 'P0002', message = 'pci_negotiation_not_found';
  end if;
  if v_negotiation.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_negotiation_not_open';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_negotiation.submission_id
    and s.workspace_id = p_workspace_id
  for update;

  if v_submission.status <> 'preselected' then
    raise exception using errcode = '23514', message = 'pci_submission_not_preselected';
  end if;

  select * into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = p_submission_version_id
    and sv.submission_id = v_submission.submission_id;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_version_not_found';
  end if;
  if v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_ready';
  end if;
  if v_version.rights_clearance_status <> 'complete' then
    raise exception using errcode = '23514', message = 'pci_rights_clearance_incomplete';
  end if;
  if v_version.sha256 is null then
    raise exception using errcode = '23514', message = 'pci_submission_version_hash_required';
  end if;

  select * into v_active
  from pci.purchase_offers po
  where po.negotiation_id = v_negotiation.negotiation_id
    and po.status = 'sent'
  for update;

  if v_active.offer_id is not null and v_active.expires_at is not null and v_active.expires_at <= now() then
    update pci.purchase_offers
    set status = 'expired'
    where offer_id = v_active.offer_id;

    perform pci.append_event(
      p_workspace_id,
      'system', null, null,
      'purchase_offer', v_active.offer_id,
      'offer.expired', 'sent', 'expired',
      p_request_id, null,
      jsonb_build_object('negotiation_id', v_negotiation.negotiation_id)
    );
    v_active.offer_id := null;
  end if;

  if p_parent_offer_id is not null then
    select * into v_parent
    from pci.purchase_offers po
    where po.offer_id = p_parent_offer_id
      and po.negotiation_id = v_negotiation.negotiation_id
    for update;

    if v_parent.offer_id is null then
      raise exception using errcode = 'P0002', message = 'pci_parent_offer_not_found';
    end if;
    if v_parent.status <> 'sent' then
      raise exception using errcode = '23514', message = 'pci_parent_offer_not_live';
    end if;
    if v_active.offer_id is not null and v_active.offer_id <> v_parent.offer_id then
      raise exception using errcode = '23514', message = 'pci_another_offer_is_live';
    end if;
  elsif v_active.offer_id is not null then
    raise exception using errcode = '23514', message = 'pci_live_offer_exists';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'send_purchase_offer', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'send_purchase_offer'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing_receipt.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing_receipt.status = 'completed' then
      return v_existing_receipt.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  if v_parent.offer_id is not null then
    update pci.purchase_offers
    set status = 'superseded'
    where offer_id = v_parent.offer_id;

    perform pci.append_event(
      p_workspace_id,
      'operator', p_actor_user_id, null,
      'purchase_offer', v_parent.offer_id,
      'offer.superseded', 'sent', 'superseded',
      p_request_id, v_receipt_id,
      jsonb_build_object('negotiation_id', v_negotiation.negotiation_id)
    );
  end if;

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
    created_by_user_id
  ) values (
    p_workspace_id,
    v_negotiation.negotiation_id,
    v_negotiation.creator_id,
    v_parent.offer_id,
    'workspace',
    'sent',
    v_currency,
    p_total_amount,
    p_rights_package_snapshot,
    p_payment_terms_snapshot,
    coalesce(p_bonus_terms_snapshot, '{}'::jsonb),
    coalesce(p_commercial_terms_snapshot, '{}'::jsonb),
    p_expires_at,
    now(),
    p_actor_user_id
  ) returning offer_id into v_offer_id;

  insert into pci.purchase_offer_items (
    offer_id, submission_id, submission_version_id, amount, item_terms_snapshot
  ) values (
    v_offer_id,
    v_submission.submission_id,
    v_version.submission_version_id,
    p_total_amount,
    jsonb_build_object(
      'version_number', v_version.version_number,
      'sha256', v_version.sha256,
      'mime_type', v_version.mime_type,
      'original_filename', v_version.original_filename
    )
  ) returning offer_item_id into v_offer_item_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'purchase_offer', v_offer_id,
    'offer.sent', null, 'sent',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'negotiation_id', v_negotiation.negotiation_id,
      'submission_id', v_submission.submission_id,
      'submission_version_id', v_version.submission_version_id,
      'amount', p_total_amount,
      'currency', v_currency,
      'parent_offer_id', v_parent.offer_id
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_offer_sent',
    'purchase_offer', v_offer_id,
    jsonb_build_object(
      'creator_id', v_negotiation.creator_id,
      'negotiation_id', v_negotiation.negotiation_id,
      'amount', p_total_amount,
      'currency', v_currency
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'offer_id', v_offer_id,
    'offer_item_id', v_offer_item_id,
    'negotiation_id', v_negotiation.negotiation_id,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'status', 'sent',
    'proposed_by_type', 'workspace',
    'amount', p_total_amount,
    'currency', v_currency,
    'expires_at', p_expires_at,
    'parent_offer_id', v_parent.offer_id
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'purchase_offer',
      result_entity_id = v_offer_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.admin_reject_offer(
  p_actor_user_id uuid,
  p_workspace_id text,
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
  v_offer pci.purchase_offers%rowtype;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_offer_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_offer_context_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_offer
  from pci.purchase_offers po
  where po.offer_id = p_offer_id
    and po.workspace_id = p_workspace_id
  for update;

  if v_offer.offer_id is null then
    raise exception using errcode = 'P0002', message = 'pci_offer_not_found';
  end if;
  if v_offer.proposed_by_type <> 'creator' then
    raise exception using errcode = '23514', message = 'pci_admin_can_only_reject_creator_offer';
  end if;
  if v_offer.status <> 'sent' then
    raise exception using errcode = '23514', message = 'pci_offer_not_live';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'admin_reject_offer', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'admin_reject_offer'
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
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'purchase_offer', v_offer.offer_id,
    'offer.rejected', 'sent', 'rejected',
    p_request_id, v_receipt_id,
    jsonb_build_object('negotiation_id', v_offer.negotiation_id)
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id, 'notify_creator_offer_rejected', 'purchase_offer', v_offer.offer_id,
    jsonb_build_object('creator_id', v_offer.creator_id, 'negotiation_id', v_offer.negotiation_id)
  );

  v_result := jsonb_build_object(
    'ok', true, 'offer_id', v_offer.offer_id,
    'negotiation_id', v_offer.negotiation_id, 'status', 'rejected'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'purchase_offer',
      result_entity_id = v_offer.offer_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.withdraw_purchase_offer(
  p_actor_user_id uuid,
  p_workspace_id text,
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
  v_offer pci.purchase_offers%rowtype;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_offer_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_offer_context_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_offer
  from pci.purchase_offers po
  where po.offer_id = p_offer_id
    and po.workspace_id = p_workspace_id
  for update;

  if v_offer.offer_id is null then
    raise exception using errcode = 'P0002', message = 'pci_offer_not_found';
  end if;
  if v_offer.proposed_by_type <> 'workspace' then
    raise exception using errcode = '23514', message = 'pci_admin_can_only_withdraw_workspace_offer';
  end if;
  if v_offer.status <> 'sent' then
    raise exception using errcode = '23514', message = 'pci_offer_not_live';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'withdraw_purchase_offer', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'withdraw_purchase_offer'
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
  set status = 'withdrawn', withdrawn_at = now()
  where offer_id = v_offer.offer_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'purchase_offer', v_offer.offer_id,
    'offer.withdrawn', 'sent', 'withdrawn',
    p_request_id, v_receipt_id,
    jsonb_build_object('negotiation_id', v_offer.negotiation_id)
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id, 'notify_creator_offer_withdrawn', 'purchase_offer', v_offer.offer_id,
    jsonb_build_object('creator_id', v_offer.creator_id, 'negotiation_id', v_offer.negotiation_id)
  );

  v_result := jsonb_build_object(
    'ok', true, 'offer_id', v_offer.offer_id,
    'negotiation_id', v_offer.negotiation_id, 'status', 'withdrawn'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'purchase_offer',
      result_entity_id = v_offer.offer_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.send_purchase_offer(uuid,text,uuid,uuid,numeric,text,timestamptz,jsonb,jsonb,jsonb,jsonb,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_reject_offer(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.withdraw_purchase_offer(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.send_purchase_offer(uuid,text,uuid,uuid,numeric,text,timestamptz,jsonb,jsonb,jsonb,jsonb,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.admin_reject_offer(uuid,text,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.withdraw_purchase_offer(uuid,text,uuid,uuid,uuid) to service_role;

comment on function pci_api.send_purchase_offer(uuid,text,uuid,uuid,numeric,text,timestamptz,jsonb,jsonb,jsonb,jsonb,uuid,uuid,uuid) is
  'Creates an immutable formal Protocol offer for one exact ready/rights-cleared creative version. A replacement formally supersedes its live parent.';