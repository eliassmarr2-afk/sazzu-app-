-- Protocol Creative Insights
-- 2.1J.1 · Publish future Consignment revision transactionally.
--
-- Contract:
--   - open/paused Consignment only
--   - current revision must be published
--   - target revision must be an explicit future draft of the same Consignment
--   - current published revision becomes superseded
--   - target draft becomes published/current
--   - invited participations follow the newly published revision
--   - active/declined/withdrawn participations remain bound exactly as-is
--   - Consignment published_at is intentionally preserved

create or replace function pci_api.admin_publish_consignment_revision(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid,
  p_consignment_revision_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consignment pci.consignments%rowtype;
  v_current pci.consignment_revisions%rowtype;
  v_target pci.consignment_revisions%rowtype;
  v_invite pci.consignment_participations%rowtype;

  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;

  v_now timestamptz := now();
  v_invited_rebound_count integer := 0;
  v_active_preserved_count integer := 0;
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if p_consignment_id is null
     or p_consignment_revision_id is null
     or p_idempotency_key is null
     or p_request_id is null
  then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_revision_context_required';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_id,
    status
  )
  values (
    p_idempotency_key,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_publish_consignment_revision',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning command_receipt_id
  into v_receipt_id;

  if v_receipt_id is null then
    select *
    into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id is null
      and cr.command_name = 'admin_publish_consignment_revision'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing_receipt.command_receipt_id is null then
      raise exception
        using errcode = '23505',
        message = 'pci_idempotency_conflict';
    end if;

    if v_existing_receipt.status = 'completed' then
      return v_existing_receipt.response_snapshot;
    end if;

    raise exception
      using errcode = '40001',
      message = 'pci_command_already_processing';
  end if;

  select *
  into v_consignment
  from pci.consignments c
  where c.workspace_id = p_workspace_id
    and c.consignment_id = p_consignment_id
  for update;

  if v_consignment.consignment_id is null then
    raise exception
      using errcode = 'P0002',
      message = 'pci_consignment_not_found';
  end if;

  if v_consignment.status not in ('open', 'paused')
     or v_consignment.current_revision_id is null
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_revision_not_publishable';
  end if;

  select *
  into v_current
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_consignment.current_revision_id
    and r.consignment_id = v_consignment.consignment_id
  for update;

  if v_current.consignment_revision_id is null
     or v_current.status <> 'published'
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_revision_not_publishable';
  end if;

  select *
  into v_target
  from pci.consignment_revisions r
  where r.consignment_revision_id = p_consignment_revision_id
    and r.consignment_id = v_consignment.consignment_id
  for update;

  if v_target.consignment_revision_id is null
     or v_target.status <> 'draft'
     or v_target.consignment_revision_id = v_current.consignment_revision_id
     or v_target.revision_number <= v_current.revision_number
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_revision_not_publishable';
  end if;

  select count(*)::integer
  into v_active_preserved_count
  from pci.consignment_participations cp
  where cp.workspace_id = p_workspace_id
    and cp.consignment_id = v_consignment.consignment_id
    and cp.status = 'active';

  update pci.consignment_revisions
  set status = 'superseded',
      superseded_at = v_now
  where consignment_revision_id = v_current.consignment_revision_id;

  update pci.consignment_revisions
  set status = 'published',
      published_at = v_now
  where consignment_revision_id = v_target.consignment_revision_id;

  update pci.consignments
  set current_revision_id = v_target.consignment_revision_id
  where consignment_id = v_consignment.consignment_id;

  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment_revision',
    v_current.consignment_revision_id,
    'consignment.revision_superseded',
    'published',
    'superseded',
    p_request_id,
    v_receipt_id,
    jsonb_build_object(
      'consignment_id', v_consignment.consignment_id,
      'revision_number', v_current.revision_number,
      'new_revision_id', v_target.consignment_revision_id,
      'new_revision_number', v_target.revision_number
    )
  );

  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment_revision',
    v_target.consignment_revision_id,
    'consignment.revision_published',
    'draft',
    'published',
    p_request_id,
    v_receipt_id,
    jsonb_build_object(
      'consignment_id', v_consignment.consignment_id,
      'revision_number', v_target.revision_number,
      'previous_revision_id', v_current.consignment_revision_id,
      'previous_revision_number', v_current.revision_number
    )
  );

  for v_invite in
    select cp.*
    from pci.consignment_participations cp
    where cp.workspace_id = p_workspace_id
      and cp.consignment_id = v_consignment.consignment_id
      and cp.status = 'invited'
    order by cp.participation_id
    for update
  loop
    if v_invite.consignment_revision_id
         is distinct from v_target.consignment_revision_id
    then
      update pci.consignment_participations
      set consignment_revision_id = v_target.consignment_revision_id
      where participation_id = v_invite.participation_id;

      v_invited_rebound_count :=
        v_invited_rebound_count + 1;

      perform pci.append_event(
        p_workspace_id,
        'operator',
        p_actor_user_id,
        null,
        'consignment_participation',
        v_invite.participation_id,
        'consignment_participation.revision_rebound',
        'invited',
        'invited',
        p_request_id,
        v_receipt_id,
        jsonb_build_object(
          'consignment_id', v_consignment.consignment_id,
          'old_revision_id', v_invite.consignment_revision_id,
          'new_revision_id', v_target.consignment_revision_id,
          'new_revision_number', v_target.revision_number
        )
      );
    end if;
  end loop;

  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment',
    v_consignment.consignment_id,
    'consignment.current_revision_changed',
    v_consignment.status,
    v_consignment.status,
    p_request_id,
    v_receipt_id,
    jsonb_build_object(
      'previous_revision_id', v_current.consignment_revision_id,
      'previous_revision_number', v_current.revision_number,
      'current_revision_id', v_target.consignment_revision_id,
      'current_revision_number', v_target.revision_number,
      'invited_rebound_count', v_invited_rebound_count,
      'active_preserved_count', v_active_preserved_count
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'consignment_id', v_consignment.consignment_id,
    'previous_revision_id', v_current.consignment_revision_id,
    'published_revision_id', v_target.consignment_revision_id,
    'previous_revision_number', v_current.revision_number,
    'published_revision_number', v_target.revision_number,
    'consignment_status', v_consignment.status,
    'invited_rebound_count', v_invited_rebound_count,
    'active_preserved_count', v_active_preserved_count,
    'published_at', v_now
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'consignment_revision',
      result_entity_id = v_target.consignment_revision_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function
  pci_api.admin_publish_consignment_revision(
    uuid,
    text,
    uuid,
    uuid,
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  pci_api.admin_publish_consignment_revision(
    uuid,
    text,
    uuid,
    uuid,
    uuid,
    uuid
  )
to service_role;

comment on function
  pci_api.admin_publish_consignment_revision(
    uuid,
    text,
    uuid,
    uuid,
    uuid,
    uuid
  )
is
  'Publishes one explicit future Consignment revision atomically. Active participations preserve their accepted revision; invited participations follow the newly published revision.';
