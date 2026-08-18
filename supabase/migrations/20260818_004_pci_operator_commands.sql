-- Protocol Creative Insights (PCI)
-- First transactional backend commands: create and publish consignments.
-- Functions are callable only by service_role through PCI backend/Edge Functions.

create or replace function pci.require_active_workspace_member(
  p_user_id uuid,
  p_workspace_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_user_id is null or p_workspace_id is null then
    raise exception using errcode = '42501', message = 'pci_operator_context_required';
  end if;

  if not exists (
    select 1
    from public.protocol_workspace_members pwm
    where pwm.user_id = p_user_id
      and pwm.workspace_id = p_workspace_id
      and pwm.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'pci_workspace_access_denied';
  end if;
end;
$$;

create or replace function pci.append_event(
  p_workspace_id text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_actor_creator_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_old_state text,
  p_new_state text,
  p_request_id uuid,
  p_command_receipt_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  insert into pci.events (
    workspace_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    entity_type,
    entity_id,
    event_type,
    old_state,
    new_state,
    request_id,
    command_receipt_id,
    metadata
  ) values (
    p_workspace_id,
    p_actor_type,
    p_actor_user_id,
    p_actor_creator_id,
    p_entity_type,
    p_entity_id,
    p_event_type,
    p_old_state,
    p_new_state,
    p_request_id,
    p_command_receipt_id,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning event_id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function pci.require_active_workspace_member(uuid,text) from public, anon, authenticated;
revoke all on function pci.append_event(text,text,uuid,uuid,text,uuid,text,text,text,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function pci.require_active_workspace_member(uuid,text) to service_role;
grant execute on function pci.append_event(text,text,uuid,uuid,text,uuid,text,text,text,uuid,uuid,jsonb) to service_role;

create or replace function pci_api.create_consignment(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_revision jsonb,
  p_visibility text default 'open',
  p_max_submissions_per_creator integer default null,
  p_max_versions_per_submission integer default null,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_consignment_id uuid;
  v_revision_id uuid;
  v_title text;
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  if p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_idempotency_and_request_required';
  end if;

  if p_visibility not in ('open','invite_only') then
    raise exception using errcode = '22023', message = 'pci_invalid_consignment_visibility';
  end if;

  if p_max_submissions_per_creator is not null and p_max_submissions_per_creator <= 0 then
    raise exception using errcode = '22023', message = 'pci_invalid_submission_limit';
  end if;

  if p_max_versions_per_submission is not null and p_max_versions_per_submission <= 0 then
    raise exception using errcode = '22023', message = 'pci_invalid_version_limit';
  end if;

  if p_closes_at is not null and p_opens_at is not null and p_closes_at <= p_opens_at then
    raise exception using errcode = '22023', message = 'pci_invalid_consignment_window';
  end if;

  v_title := nullif(btrim(coalesce(p_revision->>'title','')), '');
  if v_title is null then
    raise exception using errcode = '22023', message = 'pci_consignment_title_required';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'create_consignment', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id is null
      and cr.command_name = 'create_consignment'
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

  insert into pci.consignments (
    workspace_id,
    status,
    visibility,
    max_submissions_per_creator,
    max_versions_per_submission,
    opens_at,
    closes_at,
    created_by
  ) values (
    p_workspace_id,
    'draft',
    p_visibility,
    p_max_submissions_per_creator,
    p_max_versions_per_submission,
    p_opens_at,
    p_closes_at,
    p_actor_user_id
  ) returning consignment_id into v_consignment_id;

  insert into pci.consignment_revisions (
    consignment_id,
    revision_number,
    status,
    title,
    summary,
    objective,
    creative_angle,
    hook_guidance,
    format_requirements,
    acceptance_criteria,
    subject_type,
    subject_ref,
    subject_snapshot,
    base_price_amount,
    currency,
    slots_available,
    performance_bonus_policy,
    pre_purchase_revision_limit,
    rights_package_snapshot,
    created_by
  ) values (
    v_consignment_id,
    1,
    'draft',
    v_title,
    nullif(p_revision->>'summary',''),
    nullif(p_revision->>'objective',''),
    nullif(p_revision->>'creative_angle',''),
    nullif(p_revision->>'hook_guidance',''),
    coalesce(p_revision->'format_requirements','{}'::jsonb),
    coalesce(p_revision->'acceptance_criteria','{}'::jsonb),
    nullif(p_revision->>'subject_type',''),
    nullif(p_revision->>'subject_ref',''),
    coalesce(p_revision->'subject_snapshot','{}'::jsonb),
    case when nullif(p_revision->>'base_price_amount','') is null then null else (p_revision->>'base_price_amount')::numeric end,
    coalesce(nullif(p_revision->>'currency',''),'ARS'),
    case when nullif(p_revision->>'slots_available','') is null then null else (p_revision->>'slots_available')::integer end,
    coalesce(p_revision->'performance_bonus_policy','{}'::jsonb),
    case when nullif(p_revision->>'pre_purchase_revision_limit','') is null then null else (p_revision->>'pre_purchase_revision_limit')::integer end,
    coalesce(p_revision->'rights_package_snapshot','{}'::jsonb),
    p_actor_user_id
  ) returning consignment_revision_id into v_revision_id;

  update pci.consignments
  set current_revision_id = v_revision_id
  where consignment_id = v_consignment_id;

  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment',
    v_consignment_id,
    'consignment.created',
    null,
    'draft',
    p_request_id,
    v_receipt_id,
    jsonb_build_object('revision_id', v_revision_id, 'revision_number', 1)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'consignment_id', v_consignment_id,
    'consignment_revision_id', v_revision_id,
    'status', 'draft'
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'consignment',
      result_entity_id = v_consignment_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.publish_consignment(
  p_actor_user_id uuid,
  p_workspace_id text,
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
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_consignment pci.consignments%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_now timestamptz := now();
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  if p_consignment_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_publish_context_required';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'publish_consignment', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id is null
      and cr.command_name = 'publish_consignment'
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

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id = p_consignment_id
    and c.workspace_id = p_workspace_id
  for update;

  if v_consignment.consignment_id is null then
    raise exception using errcode = 'P0002', message = 'pci_consignment_not_found';
  end if;

  if v_consignment.status <> 'draft' then
    raise exception using errcode = '23514', message = 'pci_consignment_not_publishable';
  end if;

  if v_consignment.current_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_consignment_revision_required';
  end if;

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_consignment.current_revision_id
    and r.consignment_id = v_consignment.consignment_id
  for update;

  if v_revision.consignment_revision_id is null or v_revision.status <> 'draft' then
    raise exception using errcode = '23514', message = 'pci_consignment_revision_not_publishable';
  end if;

  update pci.consignment_revisions
  set status = 'published', published_at = v_now
  where consignment_revision_id = v_revision.consignment_revision_id;

  update pci.consignments
  set status = 'open', published_at = v_now
  where consignment_id = v_consignment.consignment_id;

  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment',
    p_consignment_id,
    'consignment.published',
    'draft',
    'open',
    p_request_id,
    v_receipt_id,
    jsonb_build_object('revision_id', v_revision.consignment_revision_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'consignment_id', p_consignment_id,
    'consignment_revision_id', v_revision.consignment_revision_id,
    'status', 'open',
    'published_at', v_now
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

revoke all on function pci_api.create_consignment(uuid,text,uuid,uuid,jsonb,text,integer,integer,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function pci_api.publish_consignment(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.create_consignment(uuid,text,uuid,uuid,jsonb,text,integer,integer,timestamptz,timestamptz) to service_role;
grant execute on function pci_api.publish_consignment(uuid,text,uuid,uuid,uuid) to service_role;

comment on function pci_api.create_consignment(uuid,text,uuid,uuid,jsonb,text,integer,integer,timestamptz,timestamptz) is
  'Atomic operator command: creates a draft consignment and immutable revision lineage root.';
comment on function pci_api.publish_consignment(uuid,text,uuid,uuid,uuid) is
  'Atomic operator command: publishes the current draft revision and opens the consignment.';
