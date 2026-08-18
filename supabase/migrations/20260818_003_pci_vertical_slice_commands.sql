-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · First vertical-slice command/query API
--
-- Implements the first executable backend path:
--   Protocol creates draft -> publishes consignment -> creator discovers/joins
--   -> creator creates submission -> backend reserves immutable upload version.
--
-- All routines live in `pci_api` and are callable only by service_role.
-- Edge Functions remain responsible for validating JWTs, origins and payloads;
-- these routines independently re-check business ownership and state.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Internal authorization/event helpers.
-- --------------------------------------------------------------------------

create or replace function pci.require_operator(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_write boolean default false
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select m.role
    into v_role
  from public.protocol_workspace_members m
  where m.user_id = p_actor_user_id
    and m.workspace_id = p_workspace_id
    and m.status = 'active'
  limit 1;

  if v_role is null then
    raise exception using
      errcode = 'P0001',
      message = 'operator_workspace_forbidden';
  end if;

  if p_write and v_role not in ('owner', 'admin') then
    raise exception using
      errcode = 'P0001',
      message = 'operator_write_forbidden';
  end if;

  return v_role;
end;
$$;

create or replace function pci.require_creator(
  p_actor_user_id uuid,
  p_require_global_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_status text;
begin
  select c.creator_id, c.status
    into v_creator_id, v_status
  from pci.creators c
  where c.auth_user_id = p_actor_user_id
  limit 1;

  if v_creator_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'creator_identity_not_found';
  end if;

  if v_status = 'closed' then
    raise exception using
      errcode = 'P0001',
      message = 'creator_account_closed';
  end if;

  if p_require_global_active and v_status <> 'active' then
    raise exception using
      errcode = 'P0001',
      message = case
        when v_status = 'restricted' then 'creator_restricted'
        when v_status = 'suspended' then 'creator_suspended'
        else 'creator_not_active'
      end;
  end if;

  return v_creator_id;
end;
$$;

create or replace function pci.require_active_workspace_creator(
  p_creator_id uuid,
  p_workspace_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_creator_id uuid;
  v_status text;
begin
  select wc.workspace_creator_id, wc.status
    into v_workspace_creator_id, v_status
  from pci.workspace_creators wc
  where wc.creator_id = p_creator_id
    and wc.workspace_id = p_workspace_id
  limit 1;

  if v_workspace_creator_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'creator_workspace_relationship_not_found';
  end if;

  if v_status <> 'active' then
    raise exception using
      errcode = 'P0001',
      message = case
        when v_status = 'restricted' then 'creator_workspace_restricted'
        when v_status = 'suspended' then 'creator_workspace_suspended'
        when v_status = 'closed' then 'creator_workspace_closed'
        else 'creator_workspace_not_active'
      end;
  end if;

  return v_workspace_creator_id;
end;
$$;

create or replace function pci.append_event(
  p_request_id uuid,
  p_workspace_id text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_actor_creator_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_previous_state text default null,
  p_new_state text default null,
  p_reason_code text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  insert into pci.events (
    request_id,
    workspace_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    entity_type,
    entity_id,
    event_type,
    previous_state,
    new_state,
    reason_code,
    metadata
  ) values (
    p_request_id,
    p_workspace_id,
    p_actor_type,
    p_actor_user_id,
    p_actor_creator_id,
    p_entity_type,
    p_entity_id,
    p_event_type,
    p_previous_state,
    p_new_state,
    p_reason_code,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning event_id into v_event_id;

  return v_event_id;
end;
$$;

-- Lock one idempotency key for the duration of the transaction so concurrent
-- requests cannot both observe "no receipt" and execute the same command.
create or replace function pci.lock_command_key(
  p_scope text,
  p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_scope || '|' || p_idempotency_key::text, 0)
  );
end;
$$;

-- --------------------------------------------------------------------------
-- ADMIN COMMAND: create a consignment and revision 1 as one atomic draft.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_create_consignment(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt pci.command_receipts%rowtype;
  v_consignment_id uuid;
  v_revision_id uuid;
  v_result jsonb;
  v_visibility text;
  v_deliverable_type text;
  v_compensation_mode text;
  v_currency text;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);
  perform pci.lock_command_key(
    'operator:' || p_actor_user_id::text || ':admin_create_consignment',
    p_idempotency_key
  );

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'operator'
    and r.actor_user_id = p_actor_user_id
    and r.command_name = 'admin_create_consignment'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_create_consignment',
    p_request_hash,
    'processing'
  );

  if nullif(btrim(p_payload->>'title'), '') is null then
    raise exception using errcode = 'P0001', message = 'consignment_title_required';
  end if;

  v_visibility := coalesce(nullif(p_payload->>'visibility', ''), 'open');
  v_deliverable_type := coalesce(nullif(p_payload->>'deliverable_type', ''), 'video');
  v_compensation_mode := coalesce(nullif(p_payload->>'compensation_mode', ''), 'per_asset');
  v_currency := upper(coalesce(nullif(p_payload->>'currency', ''), 'ARS'));

  if v_visibility not in ('open', 'invite_only') then
    raise exception using errcode = 'P0001', message = 'invalid_consignment_visibility';
  end if;
  if v_deliverable_type not in ('video', 'image') then
    raise exception using errcode = 'P0001', message = 'invalid_deliverable_type';
  end if;
  if v_compensation_mode not in ('per_asset', 'package', 'negotiated') then
    raise exception using errcode = 'P0001', message = 'invalid_compensation_mode';
  end if;
  if char_length(v_currency) <> 3 then
    raise exception using errcode = 'P0001', message = 'invalid_currency';
  end if;

  insert into pci.consignments (
    workspace_id,
    status,
    visibility,
    max_submissions_per_creator,
    max_versions_per_submission,
    deadline_at,
    created_by_user_id,
    metadata
  ) values (
    p_workspace_id,
    'draft',
    v_visibility,
    coalesce((p_payload->>'max_submissions_per_creator')::integer, 2),
    (p_payload->>'max_versions_per_submission')::integer,
    (p_payload->>'deadline_at')::timestamptz,
    p_actor_user_id,
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  returning consignment_id into v_consignment_id;

  insert into pci.consignment_revisions (
    consignment_id,
    workspace_id,
    revision_number,
    status,
    title,
    summary,
    objective,
    angle,
    hook_guidance,
    deliverable_type,
    aspect_ratio,
    duration_min_seconds,
    duration_max_seconds,
    subject_type,
    subject_ref,
    subject_snapshot,
    compensation_mode,
    base_amount,
    currency,
    max_purchasable_assets,
    technical_requirements,
    acceptance_criteria,
    rights_package,
    performance_bonus_terms,
    commercial_terms,
    created_by_user_id
  ) values (
    v_consignment_id,
    p_workspace_id,
    1,
    'draft',
    btrim(p_payload->>'title'),
    nullif(btrim(p_payload->>'summary'), ''),
    nullif(btrim(p_payload->>'objective'), ''),
    nullif(btrim(p_payload->>'angle'), ''),
    nullif(btrim(p_payload->>'hook_guidance'), ''),
    v_deliverable_type,
    nullif(btrim(p_payload->>'aspect_ratio'), ''),
    (p_payload->>'duration_min_seconds')::numeric,
    (p_payload->>'duration_max_seconds')::numeric,
    nullif(btrim(p_payload->>'subject_type'), ''),
    nullif(btrim(p_payload->>'subject_ref'), ''),
    coalesce(p_payload->'subject_snapshot', '{}'::jsonb),
    v_compensation_mode,
    (p_payload->>'base_amount')::numeric,
    v_currency,
    (p_payload->>'max_purchasable_assets')::integer,
    coalesce(p_payload->'technical_requirements', '{}'::jsonb),
    coalesce(p_payload->'acceptance_criteria', '{}'::jsonb),
    coalesce(p_payload->'rights_package', '{}'::jsonb),
    coalesce(p_payload->'performance_bonus_terms', '{}'::jsonb),
    coalesce(p_payload->'commercial_terms', '{}'::jsonb),
    p_actor_user_id
  )
  returning consignment_revision_id into v_revision_id;

  perform pci.append_event(
    p_request_id,
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment',
    v_consignment_id,
    'consignment.created',
    null,
    'draft',
    null,
    jsonb_build_object('revision_id', v_revision_id, 'revision_number', 1)
  );

  perform pci.append_event(
    p_request_id,
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment_revision',
    v_revision_id,
    'consignment_revision.created',
    null,
    'draft',
    null,
    jsonb_build_object('consignment_id', v_consignment_id, 'revision_number', 1)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'consignment_id', v_consignment_id,
    'consignment_revision_id', v_revision_id,
    'status', 'draft'
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'consignment',
      result_entity_id = v_consignment_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'operator'
    and actor_user_id = p_actor_user_id
    and command_name = 'admin_create_consignment'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- ADMIN COMMAND: publish the current draft revision and open the opportunity.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_publish_consignment(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt pci.command_receipts%rowtype;
  v_consignment pci.consignments%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_result jsonb;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);
  perform pci.lock_command_key(
    'operator:' || p_actor_user_id::text || ':admin_publish_consignment',
    p_idempotency_key
  );

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'operator'
    and r.actor_user_id = p_actor_user_id
    and r.command_name = 'admin_publish_consignment'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_publish_consignment',
    p_request_hash,
    'processing'
  );

  select c.* into v_consignment
  from pci.consignments c
  where c.consignment_id = p_consignment_id
    and c.workspace_id = p_workspace_id
  for update;

  if v_consignment.consignment_id is null then
    raise exception using errcode = 'P0001', message = 'consignment_not_found';
  end if;
  if v_consignment.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'consignment_not_draft';
  end if;

  select r.* into v_revision
  from pci.consignment_revisions r
  where r.consignment_id = p_consignment_id
    and r.status = 'draft'
  order by r.revision_number desc
  limit 1
  for update;

  if v_revision.consignment_revision_id is null then
    raise exception using errcode = 'P0001', message = 'consignment_draft_revision_not_found';
  end if;

  update pci.consignment_revisions
  set status = 'published',
      published_at = now()
  where consignment_revision_id = v_revision.consignment_revision_id;

  update pci.consignments
  set status = 'open',
      current_revision_id = v_revision.consignment_revision_id,
      opens_at = coalesce(opens_at, now())
  where consignment_id = p_consignment_id;

  perform pci.append_event(
    p_request_id,
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment_revision',
    v_revision.consignment_revision_id,
    'consignment_revision.published',
    'draft',
    'published',
    null,
    jsonb_build_object('consignment_id', p_consignment_id, 'revision_number', v_revision.revision_number)
  );

  perform pci.append_event(
    p_request_id,
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment',
    p_consignment_id,
    'consignment.published',
    'draft',
    'open',
    null,
    jsonb_build_object('current_revision_id', v_revision.consignment_revision_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'consignment_id', p_consignment_id,
    'consignment_revision_id', v_revision.consignment_revision_id,
    'status', 'open'
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'consignment',
      result_entity_id = p_consignment_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'operator'
    and actor_user_id = p_actor_user_id
    and command_name = 'admin_publish_consignment'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR QUERY: opportunities visible to the authenticated creator.
-- Internal Protocol-only fields are never selected here.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_list_opportunities(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, false);

  return coalesce((
    select jsonb_agg(item order by (item->>'published_at')::timestamptz desc)
    from (
      select jsonb_build_object(
        'consignment_id', c.consignment_id,
        'workspace_id', c.workspace_id,
        'visibility', c.visibility,
        'deadline_at', c.deadline_at,
        'revision_id', r.consignment_revision_id,
        'title', r.title,
        'summary', r.summary,
        'objective', r.objective,
        'angle', r.angle,
        'hook_guidance', r.hook_guidance,
        'deliverable_type', r.deliverable_type,
        'aspect_ratio', r.aspect_ratio,
        'duration_min_seconds', r.duration_min_seconds,
        'duration_max_seconds', r.duration_max_seconds,
        'compensation_mode', r.compensation_mode,
        'base_amount', r.base_amount,
        'currency', r.currency,
        'technical_requirements', r.technical_requirements,
        'acceptance_criteria', r.acceptance_criteria,
        'rights_package', r.rights_package,
        'performance_bonus_terms', r.performance_bonus_terms,
        'published_at', r.published_at,
        'participation_status', p.status
      ) as item
      from pci.consignments c
      join pci.consignment_revisions r
        on r.consignment_revision_id = c.current_revision_id
      join pci.workspace_creators wc
        on wc.workspace_id = c.workspace_id
       and wc.creator_id = v_creator_id
      left join pci.consignment_participations p
        on p.consignment_id = c.consignment_id
       and p.creator_id = v_creator_id
      where c.status = 'open'
        and wc.status in ('active', 'restricted')
        and (c.deadline_at is null or c.deadline_at > now())
        and (
          c.visibility = 'open'
          or (c.visibility = 'invite_only' and p.status in ('invited', 'active'))
        )
    ) q
  ), '[]'::jsonb);
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: join an open consignment or accept an existing invitation.
-- The participation is bound to the exact current revision at join time.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_join_consignment(
  p_actor_user_id uuid,
  p_consignment_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_consignment pci.consignments%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_result jsonb;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, true);
  perform pci.lock_command_key(
    'creator:' || v_creator_id::text || ':creator_join_consignment',
    p_idempotency_key
  );

  select c.* into v_consignment
  from pci.consignments c
  where c.consignment_id = p_consignment_id
  for update;

  if v_consignment.consignment_id is null then
    raise exception using errcode = 'P0001', message = 'consignment_not_found';
  end if;

  perform pci.require_active_workspace_creator(v_creator_id, v_consignment.workspace_id);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_creator_id
    and r.command_name = 'creator_join_consignment'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    v_consignment.workspace_id,
    'creator_join_consignment',
    p_request_hash,
    'processing'
  );

  if v_consignment.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'consignment_not_open';
  end if;
  if v_consignment.deadline_at is not null and v_consignment.deadline_at <= now() then
    raise exception using errcode = 'P0001', message = 'consignment_deadline_passed';
  end if;
  if v_consignment.current_revision_id is null then
    raise exception using errcode = 'P0001', message = 'consignment_revision_not_published';
  end if;

  select p.* into v_participation
  from pci.consignment_participations p
  where p.consignment_id = p_consignment_id
    and p.creator_id = v_creator_id
  for update;

  if v_consignment.visibility = 'invite_only'
     and v_participation.participation_id is null then
    raise exception using errcode = 'P0001', message = 'consignment_invitation_required';
  end if;

  if v_participation.participation_id is null then
    insert into pci.consignment_participations (
      workspace_id,
      consignment_id,
      consignment_revision_id,
      creator_id,
      status,
      joined_at
    ) values (
      v_consignment.workspace_id,
      p_consignment_id,
      v_consignment.current_revision_id,
      v_creator_id,
      'active',
      now()
    )
    returning * into v_participation;
  elsif v_participation.status = 'invited' then
    update pci.consignment_participations
    set status = 'active',
        joined_at = now()
    where participation_id = v_participation.participation_id
    returning * into v_participation;
  elsif v_participation.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'participation_cannot_be_activated';
  end if;

  perform pci.append_event(
    p_request_id,
    v_consignment.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    'consignment_participation',
    v_participation.participation_id,
    'creator.joined_consignment',
    case when v_participation.invited_at is not null then 'invited' else null end,
    'active',
    null,
    jsonb_build_object(
      'consignment_id', p_consignment_id,
      'consignment_revision_id', v_participation.consignment_revision_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'participation_id', v_participation.participation_id,
    'consignment_id', p_consignment_id,
    'consignment_revision_id', v_participation.consignment_revision_id,
    'status', 'active'
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'consignment_participation',
      result_entity_id = v_participation.participation_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator_id
    and command_name = 'creator_join_consignment'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: create one creative proposal/submission.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_create_submission(
  p_actor_user_id uuid,
  p_participation_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_consignment pci.consignments%rowtype;
  v_submission_id uuid;
  v_existing_count integer;
  v_result jsonb;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, true);
  perform pci.lock_command_key(
    'creator:' || v_creator_id::text || ':creator_create_submission',
    p_idempotency_key
  );

  select p.* into v_participation
  from pci.consignment_participations p
  where p.participation_id = p_participation_id
    and p.creator_id = v_creator_id
  for update;

  if v_participation.participation_id is null then
    raise exception using errcode = 'P0001', message = 'participation_not_found';
  end if;

  perform pci.require_active_workspace_creator(v_creator_id, v_participation.workspace_id);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_creator_id
    and r.command_name = 'creator_create_submission'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    v_participation.workspace_id,
    'creator_create_submission',
    p_request_hash,
    'processing'
  );

  if v_participation.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'participation_not_active';
  end if;

  select c.* into v_consignment
  from pci.consignments c
  where c.consignment_id = v_participation.consignment_id
  for update;

  if v_consignment.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'consignment_not_accepting_submissions';
  end if;
  if v_consignment.deadline_at is not null and v_consignment.deadline_at <= now() then
    raise exception using errcode = 'P0001', message = 'consignment_deadline_passed';
  end if;

  select count(*)::integer into v_existing_count
  from pci.submissions s
  where s.participation_id = p_participation_id;

  if v_existing_count >= v_consignment.max_submissions_per_creator then
    raise exception using errcode = 'P0001', message = 'submission_limit_reached';
  end if;

  insert into pci.submissions (
    workspace_id,
    consignment_id,
    participation_id,
    creator_id,
    status,
    title,
    concept_label,
    hook_label,
    angle_label,
    creator_note,
    metadata
  ) values (
    v_participation.workspace_id,
    v_participation.consignment_id,
    p_participation_id,
    v_creator_id,
    'draft',
    nullif(btrim(p_payload->>'title'), ''),
    nullif(btrim(p_payload->>'concept_label'), ''),
    nullif(btrim(p_payload->>'hook_label'), ''),
    nullif(btrim(p_payload->>'angle_label'), ''),
    nullif(btrim(p_payload->>'creator_note'), ''),
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  returning submission_id into v_submission_id;

  perform pci.append_event(
    p_request_id,
    v_participation.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    'submission',
    v_submission_id,
    'submission.created',
    null,
    'draft',
    null,
    jsonb_build_object(
      'consignment_id', v_participation.consignment_id,
      'participation_id', p_participation_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', v_submission_id,
    'status', 'draft'
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'submission',
      result_entity_id = v_submission_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator_id
    and command_name = 'creator_create_submission'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: reserve an immutable Storage path for a new version.
-- The Edge Function uses the returned bucket/path to mint a signed upload URL.
-- It must never enable upsert for this path.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_prepare_submission_version(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_mime_type text,
  p_original_file_name text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_submission pci.submissions%rowtype;
  v_consignment pci.consignments%rowtype;
  v_version_id uuid;
  v_version_number integer;
  v_extension text;
  v_bucket text := 'pci-submissions';
  v_path text;
  v_expires_at timestamptz := now() + interval '1 hour';
  v_result jsonb;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, true);
  perform pci.lock_command_key(
    'creator:' || v_creator_id::text || ':creator_prepare_submission_version',
    p_idempotency_key
  );

  select s.* into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator_id
  for update;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  perform pci.require_active_workspace_creator(v_creator_id, v_submission.workspace_id);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_creator_id
    and r.command_name = 'creator_prepare_submission_version'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    v_submission.workspace_id,
    'creator_prepare_submission_version',
    p_request_hash,
    'processing'
  );

  if v_submission.status not in ('draft', 'changes_requested') then
    raise exception using errcode = 'P0001', message = 'submission_version_not_allowed_in_current_state';
  end if;

  select c.* into v_consignment
  from pci.consignments c
  where c.consignment_id = v_submission.consignment_id;

  if v_consignment.max_versions_per_submission is not null then
    if (
      select count(*)
      from pci.submission_versions sv
      where sv.submission_id = p_submission_id
    ) >= v_consignment.max_versions_per_submission then
      raise exception using errcode = 'P0001', message = 'submission_version_limit_reached';
    end if;
  end if;

  v_extension := case lower(p_mime_type)
    when 'video/mp4' then 'mp4'
    when 'video/quicktime' then 'mov'
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    else null
  end;

  if v_extension is null then
    raise exception using errcode = 'P0001', message = 'unsupported_submission_mime_type';
  end if;

  select coalesce(max(sv.version_number), 0) + 1
    into v_version_number
  from pci.submission_versions sv
  where sv.submission_id = p_submission_id;

  v_version_id := gen_random_uuid();
  v_path :=
    'workspace/' || v_submission.workspace_id ||
    '/creator/' || v_creator_id::text ||
    '/submission/' || p_submission_id::text ||
    '/version/' || v_version_id::text ||
    '/original.' || v_extension;

  insert into pci.submission_versions (
    submission_version_id,
    submission_id,
    workspace_id,
    creator_id,
    version_number,
    status,
    rights_clearance_status,
    storage_bucket,
    storage_path,
    original_file_name,
    mime_type,
    upload_authorized_at,
    upload_token_expires_at
  ) values (
    v_version_id,
    p_submission_id,
    v_submission.workspace_id,
    v_creator_id,
    v_version_number,
    'uploading',
    'pending',
    v_bucket,
    v_path,
    p_original_file_name,
    lower(p_mime_type),
    now(),
    v_expires_at
  );

  perform pci.append_event(
    p_request_id,
    v_submission.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    'submission_version',
    v_version_id,
    'submission.version_upload_authorized',
    null,
    'uploading',
    null,
    jsonb_build_object(
      'submission_id', p_submission_id,
      'version_number', v_version_number,
      'storage_bucket', v_bucket,
      'storage_path', v_path,
      'expires_at', v_expires_at
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'submission_version_id', v_version_id,
    'version_number', v_version_number,
    'status', 'uploading',
    'storage_bucket', v_bucket,
    'storage_path', v_path,
    'upload_authorization_expires_at', v_expires_at
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'submission_version',
      result_entity_id = v_version_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator_id
    and command_name = 'creator_prepare_submission_version'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- ADMIN QUERY: first review queue read model.
-- No creator-facing query can reach internal review data.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_review_queue(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, false);

  return coalesce((
    select jsonb_agg(item order by (item->>'created_at')::timestamptz asc)
    from (
      select jsonb_build_object(
        'submission_id', s.submission_id,
        'status', s.status,
        'title', s.title,
        'concept_label', s.concept_label,
        'hook_label', s.hook_label,
        'angle_label', s.angle_label,
        'creator_id', s.creator_id,
        'creator_name', cr.display_name,
        'consignment_id', s.consignment_id,
        'consignment_title', rev.title,
        'created_at', s.created_at,
        'submitted_at', s.submitted_at,
        'latest_version', (
          select jsonb_build_object(
            'submission_version_id', sv.submission_version_id,
            'version_number', sv.version_number,
            'status', sv.status,
            'rights_clearance_status', sv.rights_clearance_status,
            'storage_bucket', sv.storage_bucket,
            'storage_path', sv.storage_path,
            'mime_type', sv.mime_type,
            'file_size_bytes', sv.file_size_bytes,
            'duration_seconds', sv.duration_seconds,
            'width', sv.width,
            'height', sv.height,
            'sha256', sv.sha256
          )
          from pci.submission_versions sv
          where sv.submission_id = s.submission_id
          order by sv.version_number desc
          limit 1
        )
      ) as item
      from pci.submissions s
      join pci.creators cr on cr.creator_id = s.creator_id
      join pci.consignments c on c.consignment_id = s.consignment_id
      join pci.consignment_revisions rev
        on rev.consignment_revision_id = c.current_revision_id
      where s.workspace_id = p_workspace_id
        and s.status in ('submitted', 'under_review', 'changes_requested', 'preselected')
    ) q
  ), '[]'::jsonb);
end;
$$;

-- --------------------------------------------------------------------------
-- Routine permissions. Functions are SECURITY DEFINER, therefore EXECUTE is
-- deliberately restricted to trusted server-side service_role only.
-- --------------------------------------------------------------------------

revoke execute on all functions in schema pci from public, anon, authenticated;
revoke execute on all functions in schema pci_api from public, anon, authenticated;

grant execute on all functions in schema pci to service_role;
grant execute on all functions in schema pci_api to service_role;

commit;
