-- Protocol Creative Insights (PCI)
-- Phase 2.0F.4A: operator review/read-contract hardening before the internal panel.
--
-- Goals:
-- 1) Preselection is impossible unless the exact current READY version has
--    Rights Clearance COMPLETE.
-- 2) admin_submission_review_context.allowed_actions.preselect mirrors the
--    authoritative command rule instead of advertising an action the backend
--    should reject.
-- 3) admin_submission_detail is anchored to the exact consignment revision
--    accepted by the participation, never to consignments.current_revision_id.
--
-- This migration changes contracts only. It does not mutate historical PCI data.

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

  if v_version.rights_clearance_status <> 'complete' then
    raise exception using errcode = '23514', message = 'pci_rights_clearance_incomplete';
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
      'version_number', v_version.version_number,
      'rights_clearance_status', v_version.rights_clearance_status
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
    'status', 'preselected',
    'rights_clearance_status', v_version.rights_clearance_status
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

create or replace function pci_api.admin_submission_review_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_changes_used integer;
  v_remaining integer;
  v_latest_review jsonb;
  v_allowed_actions jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.workspace_id = p_workspace_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
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

  if v_submission.current_version_id is not null then
    select * into v_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_submission.current_version_id
      and sv.submission_id = v_submission.submission_id;
  end if;

  select count(*) into v_changes_used
  from pci.submission_reviews sr
  where sr.submission_id = v_submission.submission_id
    and sr.decision = 'changes_requested';

  if v_revision.pre_purchase_revision_limit is null then
    v_remaining := null;
  else
    v_remaining := greatest(v_revision.pre_purchase_revision_limit - v_changes_used, 0);
  end if;

  select jsonb_build_object(
    'review_id', sr.review_id,
    'submission_version_id', sr.submission_version_id,
    'version_number', sv.version_number,
    'decision', sr.decision,
    'rejection_reason_code', sr.rejection_reason_code,
    'internal_summary', sr.internal_summary,
    'creator_feedback', sr.creator_feedback,
    'reviewed_by', sr.reviewed_by,
    'created_at', sr.created_at
  )
  into v_latest_review
  from pci.submission_reviews sr
  join pci.submission_versions sv
    on sv.submission_version_id = sr.submission_version_id
  where sr.submission_id = v_submission.submission_id
  order by sr.created_at desc
  limit 1;

  v_allowed_actions := jsonb_build_object(
    'start_review', v_submission.status = 'submitted'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready',
    'request_changes', v_submission.status = 'under_review'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready'
      and (v_revision.pre_purchase_revision_limit is null or v_changes_used < v_revision.pre_purchase_revision_limit),
    'preselect', v_submission.status = 'under_review'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready'
      and v_version.rights_clearance_status = 'complete',
    'reject', v_submission.status = 'under_review'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready',
    'add_internal_note', true
  );

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'submission_id', v_submission.submission_id,
    'submission_status', v_submission.status,
    'current_version', case
      when v_version.submission_version_id is null then null
      else jsonb_build_object(
        'submission_version_id', v_version.submission_version_id,
        'version_number', v_version.version_number,
        'status', v_version.status,
        'rights_clearance_status', v_version.rights_clearance_status
      )
    end,
    'brief_revision', jsonb_build_object(
      'consignment_revision_id', v_revision.consignment_revision_id,
      'revision_number', v_revision.revision_number,
      'pre_purchase_revision_limit', v_revision.pre_purchase_revision_limit
    ),
    'revision_policy', jsonb_build_object(
      'changes_requested_used', v_changes_used,
      'changes_requested_remaining', v_remaining,
      'unlimited', v_revision.pre_purchase_revision_limit is null
    ),
    'latest_review', v_latest_review,
    'allowed_actions', v_allowed_actions
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
security invoker
set search_path = ''
as $$
declare
  v_submission pci.submissions%rowtype;
  v_creator pci.creators%rowtype;
  v_consignment pci.consignments%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_versions jsonb;
  v_reviews jsonb;
  v_notes jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.workspace_id = p_workspace_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  select * into v_creator
  from pci.creators cr
  where cr.creator_id = v_submission.creator_id;

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id = v_submission.consignment_id;

  select * into v_participation
  from pci.consignment_participations p
  where p.participation_id = v_submission.participation_id
    and p.workspace_id = p_workspace_id
    and p.consignment_id = v_submission.consignment_id
    and p.creator_id = v_submission.creator_id;

  if v_participation.participation_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_participation_invalid';
  end if;

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_participation.consignment_revision_id
    and r.consignment_id = v_submission.consignment_id;

  if v_revision.consignment_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_brief_revision_invalid';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'submission_version_id', sv.submission_version_id,
      'version_number', sv.version_number,
      'status', sv.status,
      'rights_clearance_status', sv.rights_clearance_status,
      'original_filename', sv.original_filename,
      'mime_type', sv.mime_type,
      'file_size_bytes', sv.file_size_bytes,
      'duration_seconds', sv.duration_seconds,
      'width', sv.width,
      'height', sv.height,
      'sha256', sv.sha256,
      'technical_validation', sv.technical_validation,
      'rights_declaration', sv.rights_declaration,
      'uploaded_at', sv.uploaded_at,
      'finalized_at', sv.finalized_at,
      'invalid_reason', sv.invalid_reason
    ) order by sv.version_number desc
  ), '[]'::jsonb)
  into v_versions
  from pci.submission_versions sv
  where sv.submission_id = v_submission.submission_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'review_id', sr.review_id,
      'submission_version_id', sr.submission_version_id,
      'decision', sr.decision,
      'rejection_reason_code', sr.rejection_reason_code,
      'internal_summary', sr.internal_summary,
      'creator_feedback', sr.creator_feedback,
      'reviewed_by', sr.reviewed_by,
      'created_at', sr.created_at
    ) order by sr.created_at desc
  ), '[]'::jsonb)
  into v_reviews
  from pci.submission_reviews sr
  where sr.submission_id = v_submission.submission_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'internal_note_id', n.internal_note_id,
      'body', n.body,
      'created_by', n.created_by,
      'created_at', n.created_at
    ) order by n.created_at desc
  ), '[]'::jsonb)
  into v_notes
  from pci.internal_notes n
  where n.workspace_id = p_workspace_id
    and n.submission_id = v_submission.submission_id;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'submission', jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'status', v_submission.status,
      'concept_label', v_submission.concept_label,
      'concept_metadata', v_submission.concept_metadata,
      'current_version_id', v_submission.current_version_id,
      'participation_id', v_submission.participation_id,
      'consignment_revision_id', v_revision.consignment_revision_id,
      'submitted_at', v_submission.submitted_at,
      'rejected_at', v_submission.rejected_at,
      'withdrawn_at', v_submission.withdrawn_at,
      'acquired_at', v_submission.acquired_at,
      'created_at', v_submission.created_at
    ),
    'creator', jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'display_name', v_creator.display_name,
      'legal_name', v_creator.legal_name,
      'email', v_creator.email,
      'status', v_creator.status
    ),
    'consignment', jsonb_build_object(
      'consignment_id', v_consignment.consignment_id,
      'status', v_consignment.status,
      'visibility', v_consignment.visibility,
      'revision', jsonb_build_object(
        'consignment_revision_id', v_revision.consignment_revision_id,
        'revision_number', v_revision.revision_number,
        'title', v_revision.title,
        'summary', v_revision.summary,
        'objective', v_revision.objective,
        'creative_angle', v_revision.creative_angle,
        'hook_guidance', v_revision.hook_guidance,
        'format_requirements', v_revision.format_requirements,
        'acceptance_criteria', v_revision.acceptance_criteria,
        'subject_snapshot', v_revision.subject_snapshot,
        'base_price_amount', v_revision.base_price_amount,
        'currency', v_revision.currency,
        'rights_package_snapshot', v_revision.rights_package_snapshot,
        'pre_purchase_revision_limit', v_revision.pre_purchase_revision_limit
      )
    ),
    'versions', v_versions,
    'reviews', v_reviews,
    'internal_notes', v_notes
  );
end;
$$;

comment on function pci_api.preselect_submission(uuid,text,uuid,uuid,uuid,text,text) is
  'Preselects only an under-review READY current version whose Rights Clearance is COMPLETE. Preselection remains distinct from purchase.';

comment on function pci_api.admin_submission_review_context(uuid,text,uuid) is
  'Internal review policy projection anchored to the exact accepted brief revision; allowed_actions.preselect requires Rights Clearance COMPLETE.';

comment on function pci_api.admin_submission_detail(uuid,text,uuid) is
  'Internal operator submission detail anchored to the exact consignment revision accepted by the participation, never to the mutable current consignment revision.';
