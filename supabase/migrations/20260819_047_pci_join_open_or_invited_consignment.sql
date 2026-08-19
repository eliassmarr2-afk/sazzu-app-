-- Protocol Creative Insights (PCI)
-- Phase 1N frontend support: one safe Creator join command for both
-- open opportunities and explicit invite-only participations.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.join_consignment(
  p_actor_user_id uuid,
  p_consignment_id uuid,
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
  v_consignment pci.consignments%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_participation_id uuid;
  v_revision_id uuid;
  v_previous_status text;
  v_result jsonb;
begin
  if p_consignment_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_join_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id = p_consignment_id
  for update;

  if v_consignment.consignment_id is null then
    raise exception using errcode = 'P0002', message = 'pci_consignment_not_found';
  end if;
  if v_consignment.status <> 'open'
     or (v_consignment.opens_at is not null and v_consignment.opens_at > now())
     or (v_consignment.closes_at is not null and v_consignment.closes_at <= now()) then
    raise exception using errcode = '23514', message = 'pci_consignment_not_open';
  end if;
  if v_consignment.current_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_consignment_revision_required';
  end if;

  select * into v_relationship
  from pci.workspace_creators wc
  where wc.workspace_id = v_consignment.workspace_id
    and wc.creator_id = v_creator.creator_id
  for update;

  if v_relationship.workspace_creator_id is null or v_relationship.status <> 'active' then
    raise exception using errcode = '42501', message = 'pci_creator_workspace_access_denied';
  end if;

  select * into v_participation
  from pci.consignment_participations p
  where p.consignment_id = v_consignment.consignment_id
    and p.creator_id = v_creator.creator_id
  for update;

  if v_consignment.visibility = 'invite_only' then
    if v_participation.participation_id is null
       or v_participation.status not in ('invited','active') then
      raise exception using errcode = '42501', message = 'pci_consignment_invitation_required';
    end if;
    -- An invite is consent to one exact published brief revision. If Protocol
    -- superseded it before acceptance, a new invitation is required. Once the
    -- participation is active, its revision remains the accepted snapshot.
    if v_participation.status = 'invited'
       and v_participation.consignment_revision_id is distinct from v_consignment.current_revision_id then
      raise exception using errcode = '42501', message = 'pci_consignment_invitation_required';
    end if;
    v_revision_id := v_participation.consignment_revision_id;
  elsif v_consignment.visibility = 'open' then
    if v_participation.participation_id is not null
       and v_participation.status in ('declined','withdrawn') then
      raise exception using errcode = '23514', message = 'pci_participation_not_joinable';
    end if;
    v_revision_id := case
      when v_participation.status = 'active' then v_participation.consignment_revision_id
      else v_consignment.current_revision_id
    end;
  else
    raise exception using errcode = '23514', message = 'pci_participation_not_joinable';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_consignment.workspace_id,
    'join_consignment', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'join_consignment'
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

  if v_participation.participation_id is null then
    insert into pci.consignment_participations (
      workspace_id, consignment_id, consignment_revision_id, creator_id,
      status, joined_at
    ) values (
      v_consignment.workspace_id, v_consignment.consignment_id, v_revision_id, v_creator.creator_id,
      'active', now()
    )
    returning participation_id into v_participation_id;
    v_previous_status := null;
  elsif v_participation.status = 'active' then
    v_participation_id := v_participation.participation_id;
    v_previous_status := 'active';
  else
    v_previous_status := v_participation.status;
    update pci.consignment_participations
    set status = 'active',
        joined_at = coalesce(joined_at, now()),
        declined_at = null,
        withdrawn_at = null
    where participation_id = v_participation.participation_id
      and status = 'invited'
    returning participation_id into v_participation_id;

    if v_participation_id is null then
      raise exception using errcode = '23514', message = 'pci_participation_not_joinable';
    end if;
  end if;

  perform pci.append_event(
    v_consignment.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'consignment_participation', v_participation_id,
    case when v_previous_status = 'invited'
      then 'creator.accepted_consignment_invitation'
      else 'creator.joined_consignment'
    end,
    v_previous_status, 'active',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'consignment_id', v_consignment.consignment_id,
      'revision_id', v_revision_id,
      'visibility', v_consignment.visibility
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'participation_id', v_participation_id,
    'consignment_id', v_consignment.consignment_id,
    'consignment_revision_id', v_revision_id,
    'visibility', v_consignment.visibility,
    'status', 'active'
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'consignment_participation',
      result_entity_id = v_participation_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.join_consignment(uuid,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.join_consignment(uuid,uuid,uuid,uuid) to service_role;

comment on function pci_api.join_consignment(uuid,uuid,uuid,uuid) is
  'Creator joins an open consignment or accepts an existing invite-only participation. Once active, repeated calls preserve the exact revision captured by the participation.';
