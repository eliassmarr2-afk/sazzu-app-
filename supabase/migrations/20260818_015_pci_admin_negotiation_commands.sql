-- Protocol Creative Insights (PCI)
-- Phase 1I: Protocol-side negotiation lifecycle and shared-message commands.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.open_negotiation(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_existing_open pci.negotiations%rowtype;
  v_existing_closed pci.negotiations%rowtype;
  v_negotiation_id uuid;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_negotiation_context_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.workspace_id = p_workspace_id
  for update;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;
  if v_submission.status <> 'preselected' then
    raise exception using errcode = '23514', message = 'pci_submission_not_preselected';
  end if;
  if v_submission.current_version_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_current_version_required';
  end if;

  select * into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = v_submission.current_version_id
    and sv.submission_id = v_submission.submission_id;

  if v_version.submission_version_id is null or v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_current_version_not_ready';
  end if;

  select * into v_existing_open
  from pci.negotiations n
  where n.submission_id = v_submission.submission_id
    and n.status = 'open'
  limit 1;

  if v_existing_open.negotiation_id is not null then
    raise exception using errcode = '23514', message = 'pci_negotiation_already_open';
  end if;

  select * into v_existing_closed
  from pci.negotiations n
  where n.submission_id = v_submission.submission_id
    and n.status = 'closed'
  order by n.opened_at desc
  limit 1;

  if v_existing_closed.negotiation_id is not null then
    raise exception using errcode = '23514', message = 'pci_negotiation_reopen_required';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'open_negotiation', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'open_negotiation'
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

  insert into pci.negotiations (
    workspace_id, creator_id, submission_id, status, opened_by, opened_at
  ) values (
    p_workspace_id, v_submission.creator_id, v_submission.submission_id,
    'open', p_actor_user_id, now()
  ) returning negotiation_id into v_negotiation_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'negotiation', v_negotiation_id,
    'negotiation.opened', null, 'open',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'submission_version_id', v_version.submission_version_id,
      'creator_id', v_submission.creator_id
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_negotiation_opened',
    'negotiation', v_negotiation_id,
    jsonb_build_object(
      'creator_id', v_submission.creator_id,
      'submission_id', v_submission.submission_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'negotiation_id', v_negotiation_id,
    'submission_id', v_submission.submission_id,
    'status', 'open'
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'negotiation',
      result_entity_id = v_negotiation_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.reopen_negotiation(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_negotiation_id uuid,
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
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_negotiation_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_negotiation_context_required';
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
  if v_negotiation.status <> 'closed' then
    raise exception using errcode = '23514', message = 'pci_negotiation_not_closed';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_negotiation.submission_id
    and s.workspace_id = p_workspace_id
  for update;

  if v_submission.status <> 'preselected' then
    raise exception using errcode = '23514', message = 'pci_submission_not_preselected';
  end if;

  if exists (
    select 1
    from pci.purchases p
    join pci.purchase_offers po on po.offer_id = p.offer_id
    where po.negotiation_id = v_negotiation.negotiation_id
  ) then
    raise exception using errcode = '23514', message = 'pci_negotiation_purchase_exists';
  end if;

  if exists (
    select 1 from pci.negotiations n
    where n.submission_id = v_negotiation.submission_id
      and n.status = 'open'
      and n.negotiation_id <> v_negotiation.negotiation_id
  ) then
    raise exception using errcode = '23514', message = 'pci_negotiation_already_open';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'reopen_negotiation', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'reopen_negotiation'
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

  update pci.negotiations
  set status = 'open', closed_at = null, close_reason = null
  where negotiation_id = v_negotiation.negotiation_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'negotiation', v_negotiation.negotiation_id,
    'negotiation.reopened', 'closed', 'open',
    p_request_id, v_receipt_id,
    jsonb_build_object('submission_id', v_negotiation.submission_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'negotiation_id', v_negotiation.negotiation_id,
    'submission_id', v_negotiation.submission_id,
    'status', 'open'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'negotiation',
      result_entity_id = v_negotiation.negotiation_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.close_negotiation(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_negotiation_id uuid,
  p_close_reason text,
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
  v_active_offer pci.purchase_offers%rowtype;
  v_reason text := lower(btrim(coalesce(p_close_reason, '')));
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_negotiation_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_negotiation_context_required';
  end if;
  if v_reason not in ('commercial_decision','inactivity','submission_rejected','creator_withdrew','offer_rejected','purchase_agreed','other') then
    raise exception using errcode = '22023', message = 'pci_negotiation_close_reason_invalid';
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

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'close_negotiation', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'close_negotiation'
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

  select * into v_active_offer
  from pci.purchase_offers po
  where po.negotiation_id = v_negotiation.negotiation_id
    and po.status = 'sent'
  for update;

  if v_active_offer.offer_id is not null then
    if v_active_offer.proposed_by_type = 'workspace' then
      update pci.purchase_offers
      set status = 'withdrawn', withdrawn_at = now()
      where offer_id = v_active_offer.offer_id;

      perform pci.append_event(
        p_workspace_id,
        'operator', p_actor_user_id, null,
        'purchase_offer', v_active_offer.offer_id,
        'offer.withdrawn', 'sent', 'withdrawn',
        p_request_id, v_receipt_id,
        jsonb_build_object('reason', 'negotiation_closed')
      );
    else
      update pci.purchase_offers
      set status = 'rejected', rejected_at = now()
      where offer_id = v_active_offer.offer_id;

      perform pci.append_event(
        p_workspace_id,
        'operator', p_actor_user_id, null,
        'purchase_offer', v_active_offer.offer_id,
        'offer.rejected', 'sent', 'rejected',
        p_request_id, v_receipt_id,
        jsonb_build_object('reason', 'negotiation_closed')
      );
    end if;
  end if;

  update pci.negotiations
  set status = 'closed', closed_at = now(), close_reason = v_reason
  where negotiation_id = v_negotiation.negotiation_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'negotiation', v_negotiation.negotiation_id,
    'negotiation.closed', 'open', 'closed',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'submission_id', v_negotiation.submission_id,
      'close_reason', v_reason,
      'resolved_offer_id', v_active_offer.offer_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'negotiation_id', v_negotiation.negotiation_id,
    'status', 'closed',
    'close_reason', v_reason,
    'resolved_offer_id', v_active_offer.offer_id
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'negotiation',
      result_entity_id = v_negotiation.negotiation_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.admin_send_negotiation_message(
  p_actor_user_id uuid,
  p_workspace_id text,
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

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'admin_send_negotiation_message', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'admin_send_negotiation_message'
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

  insert into pci.messages (
    negotiation_id, sender_type, sender_user_id, body
  ) values (
    v_negotiation.negotiation_id, 'operator', p_actor_user_id, v_body
  ) returning message_id into v_message_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'message', v_message_id,
    'negotiation.message_sent', null, null,
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'negotiation_id', v_negotiation.negotiation_id,
      'sender_type', 'operator'
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_negotiation_message',
    'message', v_message_id,
    jsonb_build_object(
      'creator_id', v_negotiation.creator_id,
      'negotiation_id', v_negotiation.negotiation_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'message_id', v_message_id,
    'negotiation_id', v_negotiation.negotiation_id,
    'sender_type', 'operator',
    'created_at', now()
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'message',
      result_entity_id = v_message_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.open_negotiation(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.reopen_negotiation(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.close_negotiation(uuid,text,uuid,text,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_send_negotiation_message(uuid,text,uuid,text,uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.open_negotiation(uuid,text,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.reopen_negotiation(uuid,text,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.close_negotiation(uuid,text,uuid,text,uuid,uuid) to service_role;
grant execute on function pci_api.admin_send_negotiation_message(uuid,text,uuid,text,uuid,uuid) to service_role;

comment on function pci_api.close_negotiation(uuid,text,uuid,text,uuid,uuid) is
  'Closes negotiation without changing ownership. Any live offer is formally resolved before closure.';