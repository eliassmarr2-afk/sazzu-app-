-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Policy hardening
--
-- 1) Restricted/suspended global creators cannot receive/claim new workspace
--    invitations through a stale onboarding path.
-- 2) Structured rejection/change reasons are creator-visible even when no
--    additional free-text feedback was supplied.
-- ============================================================================

begin;

-- Guard stale or inappropriate onboarding transitions at the database level.
create or replace function pci.guard_creator_invitation_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_status text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select c.status into v_creator_status
    from pci.creators c
    where c.creator_id = new.creator_id;

    if v_creator_status in ('restricted', 'suspended', 'closed') then
      raise exception using errcode = 'P0001', message = 'creator_global_invitation_forbidden';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_pci_creator_invitation_activation_guard
before update on pci.creator_invitations
for each row execute function pci.guard_creator_invitation_activation();

-- Rebuild the review decision helper so a structured reason is itself a
-- published explanation for changes_requested/rejected decisions.
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
  v_reason text := nullif(btrim(p_reason_code), '');
  v_feedback text := nullif(btrim(p_creator_feedback), '');
  v_feedback_visible boolean;
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

  if p_decision in ('changes_requested', 'rejected') and v_reason is null then
    raise exception using errcode = 'P0001', message = 'review_reason_required';
  end if;

  if v_reason is not null and v_reason not in (
    'brief_mismatch',
    'quality_insufficient',
    'weak_hook',
    'confusing_execution',
    'rights_issue',
    'incomplete_material',
    'late_submission',
    'strategy_mismatch',
    'other'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_review_reason';
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

  v_feedback_visible :=
    p_decision in ('changes_requested', 'rejected')
    or v_feedback is not null;

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
    v_reason,
    v_feedback,
    v_feedback_visible,
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
    v_reason,
    jsonb_build_object(
      'submission_version_id', v_version_id,
      'review_id', v_review_id,
      'creator_feedback_published', v_feedback_visible
    )
  );

  return jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'submission_version_id', v_version_id,
    'review_id', v_review_id,
    'decision', p_decision,
    'reason_code', v_reason,
    'status', v_new_status
  );
end;
$$;

revoke execute on function pci.guard_creator_invitation_activation()
  from public, anon, authenticated;
revoke execute on function pci.perform_review_decision(uuid, text, uuid, text, text, text, jsonb, uuid)
  from public, anon, authenticated;

grant execute on function pci.guard_creator_invitation_activation() to service_role;
grant execute on function pci.perform_review_decision(uuid, text, uuid, text, text, text, jsonb, uuid)
  to service_role;

commit;
