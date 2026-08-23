-- Protocol Creative Insights
-- 2.1K.1 · Edit the initial V1 Consignment draft as one complete snapshot.
--
-- This command is deliberately separate from future revision editing:
--   - Consignment must still be draft.
--   - current_revision must be revision_number=1 and status=draft.
--   - Consignment-level operating fields and V1 brief fields are updated together.
--   - IDs, lineage, statuses and publication timestamps are never client-editable.
--   - Publishing remains a separate explicit command.

create or replace function pci_api.admin_update_initial_consignment_draft(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid,
  p_revision jsonb,
  p_visibility text,
  p_max_submissions_per_creator integer,
  p_max_versions_per_submission integer,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
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

  v_title text;
  v_matching_json jsonb := coalesce(p_revision->'matching_tags', '[]'::jsonb);
  v_matching_tags text[] := '{}'::text[];

  v_base_price_amount numeric;
  v_slots_available integer;
  v_pre_purchase_revision_limit integer;

  v_old_snapshot jsonb;
  v_new_snapshot jsonb;
  v_changed boolean;
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if p_consignment_id is null
     or p_idempotency_key is null
     or p_request_id is null
     or p_revision is null
     or jsonb_typeof(p_revision) <> 'object'
  then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_revision_context_required';
  end if;

  if p_visibility not in ('open', 'invite_only') then
    raise exception
      using errcode = '22023',
      message = 'pci_invalid_consignment_visibility';
  end if;

  if p_max_submissions_per_creator is not null
     and p_max_submissions_per_creator <= 0
  then
    raise exception
      using errcode = '22023',
      message = 'pci_invalid_submission_limit';
  end if;

  if p_max_versions_per_submission is not null
     and p_max_versions_per_submission <= 0
  then
    raise exception
      using errcode = '22023',
      message = 'pci_invalid_version_limit';
  end if;

  if p_closes_at is not null
     and p_opens_at is not null
     and p_closes_at <= p_opens_at
  then
    raise exception
      using errcode = '22023',
      message = 'pci_invalid_consignment_window';
  end if;

  v_title := nullif(
    btrim(coalesce(p_revision->>'title', '')),
    ''
  );

  if v_title is null then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_title_required';
  end if;

  if jsonb_typeof(v_matching_json) <> 'array' then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_matching_tags_invalid';
  end if;

  if jsonb_array_length(v_matching_json) > 20
     or exists (
       select 1
       from jsonb_array_elements(v_matching_json) as e(value)
       where jsonb_typeof(e.value) <> 'string'
          or btrim(e.value #>> '{}') = ''
          or char_length(btrim(e.value #>> '{}')) > 60
     )
  then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_matching_tags_invalid';
  end if;

  select pci.normalize_tag_array(
    coalesce(
      array_agg(e.value #>> '{}' order by e.ord),
      '{}'::text[]
    )
  )
  into v_matching_tags
  from jsonb_array_elements(v_matching_json)
  with ordinality as e(value, ord);

  begin
    v_base_price_amount := case
      when nullif(p_revision->>'base_price_amount', '') is null then null
      else (p_revision->>'base_price_amount')::numeric
    end;

    v_slots_available := case
      when nullif(p_revision->>'slots_available', '') is null then null
      else (p_revision->>'slots_available')::integer
    end;

    v_pre_purchase_revision_limit := case
      when nullif(p_revision->>'pre_purchase_revision_limit', '') is null then null
      else (p_revision->>'pre_purchase_revision_limit')::integer
    end;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception
        using errcode = '22023',
        message = 'pci_consignment_revision_context_required';
  end;

  if v_base_price_amount is not null and v_base_price_amount < 0 then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_revision_context_required';
  end if;

  if v_slots_available is not null and v_slots_available <= 0 then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_revision_context_required';
  end if;

  if v_pre_purchase_revision_limit is not null
     and v_pre_purchase_revision_limit < 0
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
  ) values (
    p_idempotency_key,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_update_initial_consignment_draft',
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
      and cr.command_name = 'admin_update_initial_consignment_draft'
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

  if v_consignment.status <> 'draft'
     or v_consignment.current_revision_id is null
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_initial_draft_not_editable';
  end if;

  select *
  into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_consignment.current_revision_id
    and r.consignment_id = v_consignment.consignment_id
  for update;

  if v_revision.consignment_revision_id is null
     or v_revision.status <> 'draft'
     or v_revision.revision_number <> 1
     or exists (
       select 1
       from pci.consignment_revisions other
       where other.consignment_id = v_consignment.consignment_id
         and other.consignment_revision_id <> v_revision.consignment_revision_id
     )
  then
    raise exception
      using errcode = '23514',
      message = 'pci_consignment_initial_draft_not_editable';
  end if;

  v_old_snapshot := jsonb_build_object(
    'consignment', jsonb_build_object(
      'visibility', v_consignment.visibility,
      'max_submissions_per_creator', v_consignment.max_submissions_per_creator,
      'max_versions_per_submission', v_consignment.max_versions_per_submission,
      'opens_at', v_consignment.opens_at,
      'closes_at', v_consignment.closes_at
    ),
    'revision', jsonb_build_object(
      'title', v_revision.title,
      'summary', v_revision.summary,
      'objective', v_revision.objective,
      'creative_angle', v_revision.creative_angle,
      'hook_guidance', v_revision.hook_guidance,
      'format_requirements', v_revision.format_requirements,
      'acceptance_criteria', v_revision.acceptance_criteria,
      'subject_type', v_revision.subject_type,
      'subject_ref', v_revision.subject_ref,
      'subject_snapshot', v_revision.subject_snapshot,
      'base_price_amount', v_revision.base_price_amount,
      'currency', v_revision.currency,
      'slots_available', v_revision.slots_available,
      'performance_bonus_policy', v_revision.performance_bonus_policy,
      'pre_purchase_revision_limit', v_revision.pre_purchase_revision_limit,
      'rights_package_snapshot', v_revision.rights_package_snapshot,
      'matching_tags', to_jsonb(v_revision.matching_tags)
    )
  );

  v_new_snapshot := jsonb_build_object(
    'consignment', jsonb_build_object(
      'visibility', p_visibility,
      'max_submissions_per_creator', p_max_submissions_per_creator,
      'max_versions_per_submission', p_max_versions_per_submission,
      'opens_at', p_opens_at,
      'closes_at', p_closes_at
    ),
    'revision', jsonb_build_object(
      'title', v_title,
      'summary', nullif(p_revision->>'summary', ''),
      'objective', nullif(p_revision->>'objective', ''),
      'creative_angle', nullif(p_revision->>'creative_angle', ''),
      'hook_guidance', nullif(p_revision->>'hook_guidance', ''),
      'format_requirements', coalesce(p_revision->'format_requirements', '{}'::jsonb),
      'acceptance_criteria', coalesce(p_revision->'acceptance_criteria', '{}'::jsonb),
      'subject_type', nullif(p_revision->>'subject_type', ''),
      'subject_ref', nullif(p_revision->>'subject_ref', ''),
      'subject_snapshot', coalesce(p_revision->'subject_snapshot', '{}'::jsonb),
      'base_price_amount', v_base_price_amount,
      'currency', coalesce(nullif(p_revision->>'currency', ''), 'ARS'),
      'slots_available', v_slots_available,
      'performance_bonus_policy', coalesce(p_revision->'performance_bonus_policy', '{}'::jsonb),
      'pre_purchase_revision_limit', v_pre_purchase_revision_limit,
      'rights_package_snapshot', coalesce(p_revision->'rights_package_snapshot', '{}'::jsonb),
      'matching_tags', to_jsonb(v_matching_tags)
    )
  );

  v_changed := v_old_snapshot is distinct from v_new_snapshot;

  if v_changed then
    update pci.consignments
    set visibility = p_visibility,
        max_submissions_per_creator = p_max_submissions_per_creator,
        max_versions_per_submission = p_max_versions_per_submission,
        opens_at = p_opens_at,
        closes_at = p_closes_at
    where consignment_id = v_consignment.consignment_id;

    update pci.consignment_revisions
    set title = v_title,
        summary = nullif(p_revision->>'summary', ''),
        objective = nullif(p_revision->>'objective', ''),
        creative_angle = nullif(p_revision->>'creative_angle', ''),
        hook_guidance = nullif(p_revision->>'hook_guidance', ''),
        format_requirements = coalesce(p_revision->'format_requirements', '{}'::jsonb),
        acceptance_criteria = coalesce(p_revision->'acceptance_criteria', '{}'::jsonb),
        subject_type = nullif(p_revision->>'subject_type', ''),
        subject_ref = nullif(p_revision->>'subject_ref', ''),
        subject_snapshot = coalesce(p_revision->'subject_snapshot', '{}'::jsonb),
        base_price_amount = v_base_price_amount,
        currency = coalesce(nullif(p_revision->>'currency', ''), 'ARS'),
        slots_available = v_slots_available,
        performance_bonus_policy = coalesce(p_revision->'performance_bonus_policy', '{}'::jsonb),
        pre_purchase_revision_limit = v_pre_purchase_revision_limit,
        rights_package_snapshot = coalesce(p_revision->'rights_package_snapshot', '{}'::jsonb),
        matching_tags = v_matching_tags
    where consignment_revision_id = v_revision.consignment_revision_id;

    perform pci.append_event(
      p_workspace_id,
      'operator',
      p_actor_user_id,
      null,
      'consignment',
      v_consignment.consignment_id,
      'consignment.initial_draft_updated',
      'draft',
      'draft',
      p_request_id,
      v_receipt_id,
      jsonb_build_object(
        'consignment_revision_id', v_revision.consignment_revision_id,
        'revision_number', v_revision.revision_number,
        'old_snapshot', v_old_snapshot,
        'new_snapshot', v_new_snapshot
      )
    );
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'changed', v_changed,
    'consignment_id', v_consignment.consignment_id,
    'consignment_revision_id', v_revision.consignment_revision_id,
    'revision_number', v_revision.revision_number,
    'status', 'draft',
    'snapshot', v_new_snapshot
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'consignment',
      result_entity_id = v_consignment.consignment_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function
  pci_api.admin_update_initial_consignment_draft(
    uuid,
    text,
    uuid,
    jsonb,
    text,
    integer,
    integer,
    timestamptz,
    timestamptz,
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  pci_api.admin_update_initial_consignment_draft(
    uuid,
    text,
    uuid,
    jsonb,
    text,
    integer,
    integer,
    timestamptz,
    timestamptz,
    uuid,
    uuid
  )
to service_role;

comment on function
  pci_api.admin_update_initial_consignment_draft(
    uuid,
    text,
    uuid,
    jsonb,
    text,
    integer,
    integer,
    timestamptz,
    timestamptz,
    uuid,
    uuid
  )
is
  'Replaces the complete editable snapshot of an unpublished V1 Consignment draft. This command cannot edit future revisions or publish the Consignment.';
