-- Protocol Creative Insights (PCI)
-- Phase 1H: internal review workflow commands and bounded pre-purchase revisions.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.start_review(
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
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_review_context_required';
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

  if v_submission.status <> 'submitted' then
    raise exception using errcode = '23514', message = 'pci_submission_not_reviewable';
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

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'start_review', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'start_review'
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

  update pci.submissions
  set status = 'under_review'
  where submission_id = v_submission.submission_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'submission', v_submission.submission_id,
    'submission.review_started', 'submitted', 'under_review',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'submission_version_id', v_version.submission_version_id,
      'version_number', v_version.version_number
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'version_number', v_version.version_number,
    'status', 'under_review'
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'submission',
      result_entity_id = v_submission.submission_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.request_changes(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
  p_creator_feedback text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_internal_summary text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_changes_used integer;
  v_review_id uuid;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_review_context_required';
  end if;

  if nullif(btrim(coalesce(p_creator_feedback, '')), '') is null then
    raise exception using errcode = '22023', message = 'pci_creator_feedback_required';
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

  if v_submission.status <> 'under_review' then
    raise exception using errcode = '23514', message = 'pci_submission_review_decision_not_allowed';
  end if;

  select * into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = v_submission.current_version_id
    and sv.submission_id = v_submission.submission_id;

  if v_version.submission_version_id is null or v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_current_version_not_ready';
  end if;

  select * into v_participation
  from pci.consignment_participations p
  where p.participation_id = v_submission.participation_id;

  if v_participation.participation_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_participation_invalid';
  end if;

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_participation.consignment_revision_id;

  if v_revision.consignment_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_brief_revision_invalid';
  end if;

  select count(*) into v_changes_used
  from pci.submission_reviews sr
  where sr.submission_id = v_submission.submission_id
    and sr.decision = 'changes_requested';

  if v_revision.pre_purchase_revision_limit is not null
     and v_changes_used >= v_revision.pre_purchase_revision_limit then
    raise exception using errcode = '23514', message = 'pci_pre_purchase_revision_limit_reached';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'request_changes', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'request_changes'
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

  insert into pci.submission_reviews (
    submission_id,
    submission_version_id,
    workspace_id,
    decision,
    internal_summary,
    creator_feedback,
    reviewed_by
  ) values (
    v_submission.submission_id,
    v_version.submission_version_id,
    p_workspace_id,
    'changes_requested',
    nullif(btrim(coalesce(p_internal_summary, '')), ''),
    btrim(p_creator_feedback),
    p_actor_user_id
  ) returning review_id into v_review_id;

  update pci.submissions
  set status = 'changes_requested'
  where submission_id = v_submission.submission_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'submission', v_submission.submission_id,
    'submission.changes_requested', 'under_review', 'changes_requested',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'review_id', v_review_id,
      'submission_version_id', v_version.submission_version_id,
      'version_number', v_version.version_number,
      'revision_round', v_changes_used + 1,
      'revision_limit', v_revision.pre_purchase_revision_limit
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_review_decision',
    'submission_review',
    v_review_id,
    jsonb_build_object(
      'creator_id', v_submission.creator_id,
      'submission_id', v_submission.submission_id,
      'decision', 'changes_requested'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'review_id', v_review_id,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'decision', 'changes_requested',
    'status', 'changes_requested',
    'revision_round', v_changes_used + 1,
    'revision_limit', v_revision.pre_purchase_revision_limit
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'submission_review',
      result_entity_id = v_review_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.preselect_submission(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_creator_feedback text default null,
  p_internal_summary text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_review_id uuid;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_review_context_required';
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

  if v_submission.status <> 'under_review' then
    raise exception using errcode = '23514', message = 'pci_submission_review_decision_not_allowed';
  end if;

  select * into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = v_submission.current_version_id
    and sv.submission_id = v_submission.submission_id;

  if v_version.submission_version_id is null or v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_current_version_not_ready';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'preselect_submission', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'preselect_submission'
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

  insert into pci.submission_reviews (
    submission_id,
    submission_version_id,
    workspace_id,
    decision,
    internal_summary,
    creator_feedback,
    reviewed_by
  ) values (
    v_submission.submission_id,
    v_version.submission_version_id,
    p_workspace_id,
    'preselected',
    nullif(btrim(coalesce(p_internal_summary, '')), ''),
    nullif(btrim(coalesce(p_creator_feedback, '')), ''),
    p_actor_user_id
  ) returning review_id into v_review_id;

  update pci.submissions
  set status = 'preselected'
  where submission_id = v_submission.submission_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'submission', v_submission.submission_id,
    'submission.preselected', 'under_review', 'preselected',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'review_id', v_review_id,
      'submission_version_id', v_version.submission_version_id,
      'version_number', v_version.version_number
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_review_decision',
    'submission_review',
    v_review_id,
    jsonb_build_object(
      'creator_id', v_submission.creator_id,
      'submission_id', v_submission.submission_id,
      'decision', 'preselected'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'review_id', v_review_id,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'decision', 'preselected',
    'status', 'preselected'
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'submission_review',
      result_entity_id = v_review_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.reject_submission(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
  p_rejection_reason_code text,
  p_creator_feedback text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_internal_summary text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_review_id uuid;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_reason text;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_review_context_required';
  end if;

  v_reason := lower(btrim(coalesce(p_rejection_reason_code, '')));
  if v_reason = '' or length(v_reason) > 80 or v_reason !~ '^[a-z0-9_:-]+$' then
    raise exception using errcode = '22023', message = 'pci_rejection_reason_invalid';
  end if;

  if nullif(btrim(coalesce(p_creator_feedback, '')), '') is null then
    raise exception using errcode = '22023', message = 'pci_creator_feedback_required';
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

  if v_submission.status <> 'under_review' then
    raise exception using errcode = '23514', message = 'pci_submission_review_decision_not_allowed';
  end if;

  select * into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = v_submission.current_version_id
    and sv.submission_id = v_submission.submission_id;

  if v_version.submission_version_id is null or v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_current_version_not_ready';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'reject_submission', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'reject_submission'
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

  insert into pci.submission_reviews (
    submission_id,
    submission_version_id,
    workspace_id,
    decision,
    rejection_reason_code,
    internal_summary,
    creator_feedback,
    reviewed_by
  ) values (
    v_submission.submission_id,
    v_version.submission_version_id,
    p_workspace_id,
    'rejected',
    v_reason,
    nullif(btrim(coalesce(p_internal_summary, '')), ''),
    btrim(p_creator_feedback),
    p_actor_user_id
  ) returning review_id into v_review_id;

  update pci.submissions
  set status = 'rejected',
      rejected_at = now()
  where submission_id = v_submission.submission_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'submission', v_submission.submission_id,
    'submission.rejected', 'under_review', 'rejected',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'review_id', v_review_id,
      'submission_version_id', v_version.submission_version_id,
      'version_number', v_version.version_number,
      'rejection_reason_code', v_reason
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_review_decision',
    'submission_review',
    v_review_id,
    jsonb_build_object(
      'creator_id', v_submission.creator_id,
      'submission_id', v_submission.submission_id,
      'decision', 'rejected'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'review_id', v_review_id,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'decision', 'rejected',
    'rejection_reason_code', v_reason,
    'status', 'rejected'
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'submission_review',
      result_entity_id = v_review_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.add_internal_note(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
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
  v_submission pci.submissions%rowtype;
  v_note_id uuid;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_internal_note_context_required';
  end if;

  if nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception using errcode = '22023', message = 'pci_internal_note_body_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.workspace_id = p_workspace_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'add_internal_note', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'add_internal_note'
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

  insert into pci.internal_notes (
    workspace_id, submission_id, body, created_by
  ) values (
    p_workspace_id, v_submission.submission_id, btrim(p_body), p_actor_user_id
  ) returning internal_note_id into v_note_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'internal_note', v_note_id,
    'submission.internal_note_added', null, null,
    p_request_id, v_receipt_id,
    jsonb_build_object('submission_id', v_submission.submission_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'internal_note_id', v_note_id,
    'submission_id', v_submission.submission_id,
    'created_at', now()
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'internal_note',
      result_entity_id = v_note_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.start_review(uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.request_changes(uuid,text,uuid,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function pci_api.preselect_submission(uuid,text,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function pci_api.reject_submission(uuid,text,uuid,text,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function pci_api.add_internal_note(uuid,text,uuid,text,uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.start_review(uuid,text,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.request_changes(uuid,text,uuid,text,uuid,uuid,text) to service_role;
grant execute on function pci_api.preselect_submission(uuid,text,uuid,uuid,uuid,text,text) to service_role;
grant execute on function pci_api.reject_submission(uuid,text,uuid,text,text,uuid,uuid,text) to service_role;
grant execute on function pci_api.add_internal_note(uuid,text,uuid,text,uuid,uuid) to service_role;

comment on function pci_api.request_changes(uuid,text,uuid,text,uuid,uuid,text) is
  'Requests a bounded pre-purchase revision against the exact current version and publishes only creator_feedback externally.';
comment on function pci_api.add_internal_note(uuid,text,uuid,text,uuid,uuid) is
  'Creates a Protocol-only submission note; creator-facing read models never select this table.';