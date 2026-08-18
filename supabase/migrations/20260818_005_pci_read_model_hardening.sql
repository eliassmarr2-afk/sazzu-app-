-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Read-model hardening
--
-- 1) New opportunities are only shown to creators who are currently active in
--    both global and workspace relationship state.
-- 2) Review queue reads the exact consignment revision bound to the creator's
--    participation, never a newer revision published later by Protocol.
-- ============================================================================

begin;

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
  -- Opportunities represent new commercial participation, so restricted or
  -- suspended creators must not receive them as actionable opportunities.
  v_creator_id := pci.require_creator(p_actor_user_id, true);

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
        and wc.status = 'active'
        and (c.deadline_at is null or c.deadline_at > now())
        and (
          c.visibility = 'open'
          or (c.visibility = 'invite_only' and p.status in ('invited', 'active'))
        )
    ) q
  ), '[]'::jsonb);
end;
$$;

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
        'consignment_revision_id', p.consignment_revision_id,
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
      join pci.creators cr
        on cr.creator_id = s.creator_id
      join pci.consignment_participations p
        on p.participation_id = s.participation_id
      join pci.consignment_revisions rev
        on rev.consignment_revision_id = p.consignment_revision_id
      where s.workspace_id = p_workspace_id
        and s.status in ('submitted', 'under_review', 'changes_requested', 'preselected')
    ) q
  ), '[]'::jsonb);
end;
$$;

revoke execute on function pci_api.creator_list_opportunities(uuid)
  from public, anon, authenticated;
revoke execute on function pci_api.admin_review_queue(uuid, text)
  from public, anon, authenticated;

grant execute on function pci_api.creator_list_opportunities(uuid)
  to service_role;
grant execute on function pci_api.admin_review_queue(uuid, text)
  to service_role;

commit;
