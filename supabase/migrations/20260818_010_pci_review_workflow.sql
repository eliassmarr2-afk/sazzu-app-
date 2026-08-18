-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Submission review workflow
--
-- Adds immutable review decisions and the first Protocol-side evaluation
-- commands: start review, request changes, preselect and reject.
-- ============================================================================

begin;

create table pci.submission_reviews (
  submission_review_id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  submission_id uuid not null,
  submission_version_id uuid not null,

  decision text not null
    check (decision in ('review_started', 'changes_requested', 'preselected', 'rejected')),

  reason_code text,
  creator_feedback text,
  creator_feedback_visible boolean not null default false,
  internal_assessment jsonb not null default '{}'::jsonb,

  reviewed_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint pci_submission_reviews_submission_fk
    foreign key (workspace_id, submission_id)
    references pci.submissions(workspace_id, submission_id)
    on delete restrict,
  constraint pci_submission_reviews_version_fk
    foreign key (submission_id, submission_version_id)
    references pci.submission_versions(submission_id, submission_version_id)
    on delete restrict
);

create index pci_submission_reviews_history_idx
  on pci.submission_reviews (submission_id, created_at, submission_review_id);
create index pci_submission_reviews_workspace_decision_idx
  on pci.submission_reviews (workspace_id, decision, created_at desc);

alter table pci.submission_reviews enable row level security;
revoke all on table pci.submission_reviews from public, anon, authenticated;
grant select, insert on table pci.submission_reviews to service_role;

create or replace function pci.reject_review_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'submission_reviews_are_immutable';
end;
$$;

create trigger trg_pci_submission_reviews_immutable
before update or delete on pci.submission_reviews
for each row execute function pci.reject_review_mutation();

create table pci.internal_notes (
  internal_note_id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  submission_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  note_body text not null check (char_length(btrim(note_body)) > 0),
  created_at timestamptz not null default now(),

  constraint pci_internal_notes_submission_fk
    foreign key (workspace_id, submission_id)
    references pci.submissions(workspace_id, submission_id)
    on delete restrict
);

create index pci_internal_notes_submission_idx
  on pci.internal_notes (submission_id, created_at, internal_note_id);

alter table pci.internal_notes enable row level security;
revoke all on table pci.internal_notes from public, anon, authenticated;
grant select, insert on table pci.internal_notes to service_role;

create trigger trg_pci_internal_notes_immutable
before update or delete on pci.internal_notes
for each row execute function pci.reject_review_mutation();

-- --------------------------------------------------------------------------
-- Helper: exact latest ready version under review.
-- --------------------------------------------------------------------------

create or replace function pci.latest_ready_submission_version(p_submission_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sv.submission_version_id
  from pci.submission_versions sv
  where sv.submission_id = p_submission_id
    and sv.status = 'ready'
  order by sv.version_number desc
  limit 1
$$;

-- --------------------------------------------------------------------------
-- ADMIN COMMAND: submitted -> under_review.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_start_submission_review(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
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
  v_submission pci.submissions%rowtype;
  v_version_id uuid;
  v_review_id uuid;
  v_result jsonb;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);
  perform pci.lock_command_key('operator:' || p_actor_user_id::text || ':admin_start_submission_review', p_idempotency_key);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'operator'
    and r.actor_user_id = p_actor_user_id
    and r.command_name = 'admin_start_submission_review'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  select s.* into v_submission
  from pci.submissions s
  where s.workspace_id = p_workspace_id and s.submission_id = p_submission_id
  for update;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;
  if v_submission.status <> 'submitted' then
    raise exception using errcode = 'P0001', message = 'submission_not_ready_for_review';
  end if;

  v_version_id := pci.latest_ready_submission_version(p_submission_id);
  if v_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_not_ready';
  end if;

  insert into pci.command_receipts (
    idempotency_key, request_id, actor_type, actor_user_id, workspace_id,
    command_name, request_hash, status
  ) values (
    p_idempotency_key, p_request_id, 'operator', p_actor_user_id, p_workspace_id,
    'admin_start_submission_review', p_request_hash, 'processing'
  );

  update pci.submissions
  set status = 'under_review'
  where submission_id = p_submission_id;

  insert into pci.submission_reviews (
    workspace_id, submission_id, submission_version_id, decision,
    reviewed_by_user_id
  ) values (
    p_workspace_id, p_submission_id, v_version_id, 'review_started', p_actor_user_id
  ) returning submission_review_id into v_review_id;

  perform pci.append_event(
    p_request_id, p_workspace_id, 'operator', p_actor_user_id, null,
    'submission', p_submission_id, 'submission.review_started',
    'submitted', 'under_review', null,
    jsonb_build_object('submission_version_id', v_version_id, 'review_id', v_review_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'submission_version_id', v_version_id,
    'review_id', v_review_id,
    'status', 'under_review'
  );

  update pci.command_receipts
  set status = 'succeeded', result_entity_type = 'submission_review',
      result_entity_id = v_review_id, result_payload = v_result, completed_at = now()
  where actor_type = 'operator' and actor_user_id = p_actor_user_id
    and command_name = 'admin_start_submission_review'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- Shared review decision executor.
-- --------------------------------------------------------------------------

create or replace function pci.perform_review_decision(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
  p_decision text,
  p_reason_code text,
  p_creator_feedback text,
  p_internal_assessment jsonb,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_version_id uuid;
  v_review_id uuid;
  v_new_status text;
  v_allowed boolean := false;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);

  if p_decision not in ('changes_requested', 'preselected', 'rejected') then
    raise exception using errcode = 'P0001', message = 'invalid_review_decision';
  end if;

  select s.* into v_submission
  from pci.submissions s
  where s.workspace_id = p_workspace_id and s.submission_id = p_submission_id
  for update;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  v_allowed := case
    when p_decision = 'changes_requested' then v_submission.status in ('under_review', 'preselected')
    when p_decision = 'preselected' then v_submission.status = 'under_review'
    when p_decision = 'rejected' then v_submission.status in ('under_review', 'preselected', 'changes_requested')
    else false
  end;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'review_decision_invalid_for_submission_state';
  end if;

  if p_decision in ('changes_requested', 'rejected')
     and nullif(btrim(p_reason_code), '') is null then
    raise exception using errcode = 'P0001', message = 'review_reason_required';
  end if;

  v_version_id := pci.latest_ready_submission_version(p_submission_id);
  if v_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_not_ready';
  end if;

  v_new_status := case p_decision
    when 'changes_requested' then 'changes_requested'
    when 'preselected' then 'preselected'
    when 'rejected' then 'rejected'
  end;

  update pci.submissions
  set status = v_new_status,
      rejected_at = case when p_decision = 'rejected' then now() else rejected_at end
  where submission_id = p_submission_id;

  insert into pci.submission_reviews (
    workspace_id,
    submission_id,
    submission_version_id,
    decision,
    reason_code,
    creator_feedback,
    creator_feedback_visible,
    internal_assessment,
    reviewed_by_user_id
  ) values (
    p_workspace_id,
    p_submission_id,
    v_version_id,
    p_decision,
    nullif(btrim(p_reason_code), ''),
    nullif(btrim(p_creator_feedback), ''),
    nullif(btrim(p_creator_feedback), '') is not null,
    coalesce(p_internal_assessment, '{}'::jsonb),
    p_actor_user_id
  ) returning submission_review_id into v_review_id;

  perform pci.append_event(
    p_request_id,
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'submission',
    p_submission_id,
    'submission.' || p_decision,
    v_submission.status,
    v_new_status,
    nullif(btrim(p_reason_code), ''),
    jsonb_build_object(
      'submission_version_id', v_version_id,
      'review_id', v_review_id,
      'creator_feedback_published', nullif(btrim(p_creator_feedback), '') is not null
    )
  );

  return jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'submission_version_id', v_version_id,
    'review_id', v_review_id,
    'decision', p_decision,
    'status', v_new_status
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Idempotent public command wrappers.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_review_decision(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid,
  p_decision text,
  p_reason_code text,
  p_creator_feedback text,
  p_internal_assessment jsonb,
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
  v_result jsonb;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);
  perform pci.lock_command_key('operator:' || p_actor_user_id::text || ':admin_review_decision', p_idempotency_key);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'operator'
    and r.actor_user_id = p_actor_user_id
    and r.command_name = 'admin_review_decision'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key, request_id, actor_type, actor_user_id, workspace_id,
    command_name, request_hash, status
  ) values (
    p_idempotency_key, p_request_id, 'operator', p_actor_user_id, p_workspace_id,
    'admin_review_decision', p_request_hash, 'processing'
  );

  v_result := pci.perform_review_decision(
    p_actor_user_id,
    p_workspace_id,
    p_submission_id,
    p_decision,
    p_reason_code,
    p_creator_feedback,
    p_internal_assessment,
    p_request_id
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'submission_review',
      result_entity_id = (v_result->>'review_id')::uuid,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'operator' and actor_user_id = p_actor_user_id
    and command_name = 'admin_review_decision'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- Read models: creator sees only explicitly published feedback; admin sees the
-- full immutable review history plus internal assessment.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_submission_detail(
  p_actor_user_id uuid,
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_submission pci.submissions%rowtype;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, false);

  select s.* into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  return jsonb_build_object(
    'submission_id', v_submission.submission_id,
    'status', v_submission.status,
    'title', v_submission.title,
    'concept_label', v_submission.concept_label,
    'hook_label', v_submission.hook_label,
    'angle_label', v_submission.angle_label,
    'creator_note', v_submission.creator_note,
    'created_at', v_submission.created_at,
    'submitted_at', v_submission.submitted_at,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'submission_version_id', sv.submission_version_id,
        'version_number', sv.version_number,
        'status', sv.status,
        'rights_clearance_status', sv.rights_clearance_status,
        'original_file_name', sv.original_file_name,
        'mime_type', sv.mime_type,
        'file_size_bytes', sv.file_size_bytes,
        'duration_seconds', sv.duration_seconds,
        'width', sv.width,
        'height', sv.height,
        'uploaded_at', sv.uploaded_at,
        'finalized_at', sv.finalized_at,
        'invalid_reason', sv.invalid_reason
      ) order by sv.version_number)
      from pci.submission_versions sv
      where sv.submission_id = v_submission.submission_id
    ), '[]'::jsonb),
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'review_id', sr.submission_review_id,
        'decision', sr.decision,
        'reason_code', sr.reason_code,
        'feedback', sr.creator_feedback,
        'created_at', sr.created_at
      ) order by sr.created_at)
      from pci.submission_reviews sr
      where sr.submission_id = v_submission.submission_id
        and sr.creator_feedback_visible = true
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function pci_api.admin_submission_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, false);

  select s.* into v_submission
  from pci.submissions s
  where s.workspace_id = p_workspace_id
    and s.submission_id = p_submission_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  return jsonb_build_object(
    'submission', to_jsonb(v_submission),
    'reviews', coalesce((
      select jsonb_agg(to_jsonb(sr) order by sr.created_at)
      from pci.submission_reviews sr
      where sr.submission_id = p_submission_id
    ), '[]'::jsonb),
    'internal_notes', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at)
      from pci.internal_notes n
      where n.submission_id = p_submission_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on all functions in schema pci from public, anon, authenticated;
revoke execute on all functions in schema pci_api from public, anon, authenticated;
grant execute on all functions in schema pci to service_role;
grant execute on all functions in schema pci_api to service_role;

commit;
