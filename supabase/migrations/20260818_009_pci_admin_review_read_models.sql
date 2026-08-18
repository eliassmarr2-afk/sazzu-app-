-- Protocol Creative Insights (PCI)
-- Internal Protocol read models for the first vertical slice.
-- No review mutation is introduced here; this closes receive-and-view only.

create or replace function pci_api.admin_review_queue(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select coalesce(jsonb_agg(item order by (item->>'submitted_at') desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'submission_id', s.submission_id,
      'status', s.status,
      'concept_label', s.concept_label,
      'created_at', s.created_at,
      'submitted_at', s.submitted_at,
      'creator', jsonb_build_object(
        'creator_id', cr.creator_id,
        'display_name', cr.display_name,
        'status', cr.status
      ),
      'consignment', jsonb_build_object(
        'consignment_id', c.consignment_id,
        'title', r.title,
        'revision_number', r.revision_number
      ),
      'current_version', case when sv.submission_version_id is null then null else jsonb_build_object(
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
        'finalized_at', sv.finalized_at
      ) end
    ) as item
    from pci.submissions s
    join pci.creators cr on cr.creator_id = s.creator_id
    join pci.consignments c on c.consignment_id = s.consignment_id
    join pci.consignment_revisions r on r.consignment_revision_id = c.current_revision_id
    left join pci.submission_versions sv on sv.submission_version_id = s.current_version_id
    where s.workspace_id = p_workspace_id
      and s.status in ('submitted','under_review','changes_requested','preselected')
  ) q;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'items', v_items
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

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_consignment.current_revision_id;

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
        'rights_package_snapshot', v_revision.rights_package_snapshot
      )
    ),
    'versions', v_versions,
    'reviews', v_reviews,
    'internal_notes', v_notes
  );
end;
$$;

create or replace function pci_api.admin_version_playback_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_version_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select sv.* into v_version
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.workspace_id = p_workspace_id;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_version_not_found';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_version.submission_id;

  if v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_ready';
  end if;

  if v_version.storage_bucket <> 'pci-submissions' or v_version.storage_path is null then
    raise exception using errcode = '23514', message = 'pci_submission_version_storage_invalid';
  end if;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'submission_id', v_submission.submission_id,
    'submission_status', v_submission.status,
    'submission_version_id', v_version.submission_version_id,
    'version_number', v_version.version_number,
    'storage_bucket', v_version.storage_bucket,
    'storage_path', v_version.storage_path,
    'mime_type', v_version.mime_type,
    'original_filename', v_version.original_filename,
    'file_size_bytes', v_version.file_size_bytes,
    'duration_seconds', v_version.duration_seconds,
    'width', v_version.width,
    'height', v_version.height,
    'sha256', v_version.sha256
  );
end;
$$;

revoke all on function pci_api.admin_review_queue(uuid,text) from public, anon, authenticated;
revoke all on function pci_api.admin_submission_detail(uuid,text,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_version_playback_context(uuid,text,uuid) from public, anon, authenticated;

grant execute on function pci_api.admin_review_queue(uuid,text) to service_role;
grant execute on function pci_api.admin_submission_detail(uuid,text,uuid) to service_role;
grant execute on function pci_api.admin_version_playback_context(uuid,text,uuid) to service_role;
