-- Protocol Creative Insights (PCI)
-- Phase 1H: creator-safe review history and internal review context.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_submission_review_history(
  p_actor_user_id uuid,
  p_submission_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_submission pci.submissions%rowtype;
  v_items jsonb;
begin
  if p_submission_id is null then
    raise exception using errcode = '22023', message = 'pci_submission_id_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'review_id', sr.review_id,
      'submission_version_id', sr.submission_version_id,
      'version_number', sv.version_number,
      'decision', sr.decision,
      'rejection_reason_code', sr.rejection_reason_code,
      'creator_feedback', sr.creator_feedback,
      'created_at', sr.created_at
    ) as item
    from pci.submission_reviews sr
    join pci.submission_versions sv
      on sv.submission_version_id = sr.submission_version_id
    where sr.submission_id = v_submission.submission_id
      and sr.decision in ('changes_requested','preselected','rejected')
  ) q;

  return jsonb_build_object(
    'ok', true,
    'submission_id', v_submission.submission_id,
    'submission_status', v_submission.status,
    'items', v_items
  );
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
    where sv.submission_version_id = v_submission.current_version_id;
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
      and v_version.status = 'ready',
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

revoke all on function pci_api.creator_submission_review_history(uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_submission_review_context(uuid,text,uuid) from public, anon, authenticated;

grant execute on function pci_api.creator_submission_review_history(uuid,uuid) to service_role;
grant execute on function pci_api.admin_submission_review_context(uuid,text,uuid) to service_role;

comment on function pci_api.creator_submission_review_history(uuid,uuid) is
  'Creator-safe review projection: exposes published decisions/feedback only and never internal_summary, internal_notes or reviewer identity.';
comment on function pci_api.admin_submission_review_context(uuid,text,uuid) is
  'Internal review policy projection calculated from the exact brief revision accepted by the creator.';