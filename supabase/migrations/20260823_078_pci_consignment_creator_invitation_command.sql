-- Protocol Creative Insights (PCI)
-- 2.1L.1 · Operator-directed Creator invitations for invite-only Consignments.
-- Runtime-test first. No production deployment in this phase.

create or replace function pci_api.admin_invite_consignment_creators(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid,
  p_creator_ids uuid[],
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
  v_revision pci.consignment_revisions%rowtype;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_creator_ids uuid[];
  v_creator_id uuid;
  v_participation pci.consignment_participations%rowtype;
  v_participation_id uuid;
  v_items jsonb := '[]'::jsonb;
  v_invited_count integer := 0;
  v_already_invited_count integer := 0;
  v_rebound_count integer := 0;
  v_changed boolean := false;
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if p_consignment_id is null
     or p_creator_ids is null
     or p_idempotency_key is null
     or p_request_id is null
  then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_invite_context_required';
  end if;

  select coalesce(
    array_agg(x.creator_id order by x.first_ord),
    '{}'::uuid[]
  )
  into v_creator_ids
  from (
    select e.creator_id, min(e.ord) as first_ord
    from unnest(p_creator_ids)
      with ordinality as e(creator_id, ord)
    where e.creator_id is not null
    group by e.creator_id
  ) x;

  if cardinality(v_creator_ids) < 1
     or cardinality(v_creator_ids) > 50
  then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_invite_creator_ids_invalid';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_id,
    status
  ) values (
    p_idempotency_key,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_invite_consignment_creators',
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
      and cr.command_name = 'admin_invite_consignment_creators'
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

  if v_consignment.status <> 'open'
     or (v_consignment.opens_at is not null and v_consignment.opens_at > now())
     or (v_consignment.closes_at is not null and v_consignment.closes_at <= now())
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_not_open';
  end if;

  if v_consignment.visibility <> 'invite_only' then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_invitation_mode_required';
  end if;

  if v_consignment.current_revision_id is null then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_revision_required';
  end if;

  select *
  into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_consignment.current_revision_id
    and r.consignment_id = v_consignment.consignment_id
  for update;

  if v_revision.consignment_revision_id is null
     or v_revision.status <> 'published'
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_revision_not_published';
  end if;

  if exists (
    select 1
    from unnest(v_creator_ids) as ids(creator_id)
    left join pci.creators c
      on c.creator_id = ids.creator_id
    left join pci.workspace_creators wc
      on wc.workspace_id = p_workspace_id
     and wc.creator_id = ids.creator_id
    where c.creator_id is null
       or c.status <> 'active'
       or wc.workspace_creator_id is null
       or wc.status <> 'active'
  ) then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_creator_not_eligible';
  end if;

  if exists (
    select 1
    from pci.consignment_participations p
    where p.consignment_id = p_consignment_id
      and p.creator_id = any(v_creator_ids)
      and p.status <> 'invited'
  ) then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_creator_participation_conflict';
  end if;

  foreach v_creator_id in array v_creator_ids
  loop
    v_participation := null;
    v_participation_id := null;

    select *
    into v_participation
    from pci.consignment_participations p
    where p.consignment_id = p_consignment_id
      and p.creator_id = v_creator_id
    for update;

    if v_participation.participation_id is null then
      insert into pci.consignment_participations (
        workspace_id,
        consignment_id,
        consignment_revision_id,
        creator_id,
        status
      ) values (
        p_workspace_id,
        p_consignment_id,
        v_revision.consignment_revision_id,
        v_creator_id,
        'invited'
      )
      returning participation_id
      into v_participation_id;

      v_invited_count := v_invited_count + 1;
      v_changed := true;

      perform pci.append_event(
        p_workspace_id,
        'operator',
        p_actor_user_id,
        null,
        'consignment_participation',
        v_participation_id,
        'operator.invited_creator_to_consignment',
        null,
        'invited',
        p_request_id,
        v_receipt_id,
        jsonb_build_object(
          'consignment_id', p_consignment_id,
          'consignment_revision_id', v_revision.consignment_revision_id,
          'creator_id', v_creator_id,
          'visibility', v_consignment.visibility
        )
      );

      v_items := v_items || jsonb_build_array(
        jsonb_build_object(
          'creator_id', v_creator_id,
          'participation_id', v_participation_id,
          'status', 'invited',
          'changed', true
        )
      );

    elsif v_participation.consignment_revision_id
          is distinct from v_revision.consignment_revision_id
    then
      update pci.consignment_participations
      set consignment_revision_id = v_revision.consignment_revision_id
      where participation_id = v_participation.participation_id
        and status = 'invited'
      returning participation_id
      into v_participation_id;

      if v_participation_id is null then
        raise exception
          using errcode = '23514',
          message = 'pci_consignment_creator_participation_conflict';
      end if;

      v_rebound_count := v_rebound_count + 1;
      v_changed := true;

      perform pci.append_event(
        p_workspace_id,
        'operator',
        p_actor_user_id,
        null,
        'consignment_participation',
        v_participation_id,
        'operator.invited_creator_to_consignment',
        'invited',
        'invited',
        p_request_id,
        v_receipt_id,
        jsonb_build_object(
          'consignment_id', p_consignment_id,
          'old_consignment_revision_id', v_participation.consignment_revision_id,
          'consignment_revision_id', v_revision.consignment_revision_id,
          'creator_id', v_creator_id,
          'visibility', v_consignment.visibility,
          'rebound', true
        )
      );

      v_items := v_items || jsonb_build_array(
        jsonb_build_object(
          'creator_id', v_creator_id,
          'participation_id', v_participation_id,
          'status', 'invited',
          'changed', true,
          'rebound', true
        )
      );

    else
      v_already_invited_count := v_already_invited_count + 1;

      v_items := v_items || jsonb_build_array(
        jsonb_build_object(
          'creator_id', v_creator_id,
          'participation_id', v_participation.participation_id,
          'status', 'invited',
          'changed', false
        )
      );
    end if;
  end loop;

  v_result := jsonb_build_object(
    'ok', true,
    'changed', v_changed,
    'consignment_id', p_consignment_id,
    'consignment_revision_id', v_revision.consignment_revision_id,
    'invited_count', v_invited_count,
    'already_invited_count', v_already_invited_count,
    'rebound_count', v_rebound_count,
    'items', v_items
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'consignment',
      result_entity_id = p_consignment_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.admin_invite_consignment_creators(
  uuid,
  text,
  uuid,
  uuid[],
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function pci_api.admin_invite_consignment_creators(
  uuid,
  text,
  uuid,
  uuid[],
  uuid,
  uuid
) to service_role;

comment on function pci_api.admin_invite_consignment_creators(
  uuid,
  text,
  uuid,
  uuid[],
  uuid,
  uuid
) is
  'Atomic operator command: invites one or more eligible Creators to the current published revision of an open invite-only Consignment.';

-- Extend lifecycle authority so frontend does not duplicate invitation rules.
create or replace function pci_api.admin_consignment_lifecycle_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_consignment pci.consignments%rowtype;
  v_current pci.consignment_revisions%rowtype;
  v_draft pci.consignment_revisions%rowtype;
  v_active_current bigint;
  v_active_legacy bigint;
  v_invited_current bigint;
  v_invited_legacy bigint;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select *
  into v_consignment
  from pci.consignments c
  where c.workspace_id = p_workspace_id
    and c.consignment_id = p_consignment_id;

  if v_consignment.consignment_id is null then
    raise exception
      using errcode = 'P0002',
      message = 'pci_consignment_not_found';
  end if;

  if v_consignment.current_revision_id is not null then
    select *
    into v_current
    from pci.consignment_revisions r
    where r.consignment_revision_id = v_consignment.current_revision_id
      and r.consignment_id = v_consignment.consignment_id;
  end if;

  select *
  into v_draft
  from pci.consignment_revisions r
  where r.consignment_id = v_consignment.consignment_id
    and r.status = 'draft'
  order by r.revision_number desc
  limit 1;

  select count(*)
  into v_active_current
  from pci.consignment_participations cp
  where cp.workspace_id = p_workspace_id
    and cp.consignment_id = p_consignment_id
    and cp.status = 'active'
    and cp.consignment_revision_id = v_consignment.current_revision_id;

  select count(*)
  into v_active_legacy
  from pci.consignment_participations cp
  where cp.workspace_id = p_workspace_id
    and cp.consignment_id = p_consignment_id
    and cp.status = 'active'
    and cp.consignment_revision_id is distinct from v_consignment.current_revision_id;

  select count(*)
  into v_invited_current
  from pci.consignment_participations cp
  where cp.workspace_id = p_workspace_id
    and cp.consignment_id = p_consignment_id
    and cp.status = 'invited'
    and cp.consignment_revision_id = v_consignment.current_revision_id;

  select count(*)
  into v_invited_legacy
  from pci.consignment_participations cp
  where cp.workspace_id = p_workspace_id
    and cp.consignment_id = p_consignment_id
    and cp.status = 'invited'
    and cp.consignment_revision_id is distinct from v_consignment.current_revision_id;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'consignment_id', v_consignment.consignment_id,
    'status', v_consignment.status,
    'visibility', v_consignment.visibility,
    'current_revision', case
      when v_current.consignment_revision_id is null then null
      else jsonb_build_object(
        'consignment_revision_id', v_current.consignment_revision_id,
        'revision_number', v_current.revision_number,
        'status', v_current.status,
        'title', v_current.title,
        'matching_tags', v_current.matching_tags,
        'published_at', v_current.published_at
      )
    end,
    'draft_revision', case
      when v_draft.consignment_revision_id is null then null
      else jsonb_build_object(
        'consignment_revision_id', v_draft.consignment_revision_id,
        'revision_number', v_draft.revision_number,
        'status', v_draft.status,
        'title', v_draft.title,
        'matching_tags', v_draft.matching_tags,
        'created_at', v_draft.created_at
      )
    end,
    'participation_binding', jsonb_build_object(
      'active_current_revision', v_active_current,
      'active_legacy_revision', v_active_legacy,
      'invited_current_revision', v_invited_current,
      'invited_legacy_revision', v_invited_legacy
    ),
    'allowed_actions', jsonb_build_object(
      'update_initial_draft', (
        v_consignment.status = 'draft'
        and v_current.status = 'draft'
      ),
      'publish_initial', (
        v_consignment.status = 'draft'
        and v_current.status = 'draft'
      ),
      'create_revision', (
        v_consignment.status in ('open', 'paused')
        and v_current.status = 'published'
        and v_draft.consignment_revision_id is null
      ),
      'update_revision_draft', (
        v_consignment.status in ('open', 'paused')
        and v_draft.consignment_revision_id is not null
      ),
      'publish_revision', (
        v_consignment.status in ('open', 'paused')
        and v_current.status = 'published'
        and v_draft.consignment_revision_id is not null
      ),
      'invite_creators', (
        v_consignment.status = 'open'
        and v_consignment.visibility = 'invite_only'
        and v_current.status = 'published'
      ),
      'pause', v_consignment.status = 'open',
      'resume', v_consignment.status = 'paused',
      'close', v_consignment.status in ('open', 'paused'),
      'archive', v_consignment.status = 'closed'
    )
  );
end;
$$;

revoke all on function pci_api.admin_consignment_lifecycle_context(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function pci_api.admin_consignment_lifecycle_context(
  uuid,
  text,
  uuid
) to service_role;
