-- Protocol Creative Insights (PCI)
-- Phase 1H: enrich the existing creator submission detail with creator-safe review history.
-- No internal review fields are selected here.

create or replace function pci_api.creator_submission_detail(
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
  v_versions jsonb;
  v_reviews jsonb;
  v_consignment_title text;
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

  select r.title into v_consignment_title
  from pci.consignments c
  join pci.consignment_revisions r on r.consignment_revision_id = c.current_revision_id
  where c.consignment_id = v_submission.consignment_id;

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
      'uploaded_at', sv.uploaded_at,
      'finalized_at', sv.finalized_at,
      'invalid_reason', sv.invalid_reason
    ) order by sv.version_number desc
  ), '[]'::jsonb)
  into v_versions
  from pci.submission_versions sv
  where sv.submission_id = v_submission.submission_id;

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_reviews
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
    'submission', jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'workspace_id', v_submission.workspace_id,
      'consignment_id', v_submission.consignment_id,
      'consignment_title', v_consignment_title,
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
    'versions', v_versions,
    'reviews', v_reviews
  );
end;
$$;

revoke all on function pci_api.creator_submission_detail(uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_submission_detail(uuid,uuid) to service_role;

comment on function pci_api.creator_submission_detail(uuid,uuid) is
  'Creator submission detail with version lineage and published review history only; never returns Protocol internal notes, internal summaries or reviewer identities.';