-- Protocol Creative Insights (PCI)
-- Phase 1N.5 frontend support: expose only the minimum rights-action state needed by Dashboard/My Work lists.
-- The full declaration remains available only in Creator-owned submission detail.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_submissions(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'submission_id', s.submission_id,
      'workspace_id', s.workspace_id,
      'consignment_id', s.consignment_id,
      'consignment_revision_id', r.consignment_revision_id,
      'consignment_revision_number', r.revision_number,
      'consignment_title', r.title,
      'status', s.status,
      'concept_label', s.concept_label,
      'created_at', s.created_at,
      'submitted_at', s.submitted_at,
      'current_version', case when sv.submission_version_id is null then null else jsonb_build_object(
        'submission_version_id', sv.submission_version_id,
        'version_number', sv.version_number,
        'status', sv.status,
        'rights_clearance_status', sv.rights_clearance_status,
        'rights_declaration_submitted', coalesce(sv.rights_declaration, '{}'::jsonb) <> '{}'::jsonb,
        'rights_declaration_submitted_at', (
          select max(e.created_at)
          from pci.events e
          where e.entity_type = 'submission_version'
            and e.entity_id = sv.submission_version_id
            and e.event_type = 'rights.declaration_submitted'
        ),
        'rights_declaration_locked', exists (
          select 1 from pci.rights_grants rg
          where rg.submission_version_id = sv.submission_version_id
        ),
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
    join pci.consignment_participations p
      on p.participation_id = s.participation_id
     and p.creator_id = v_creator.creator_id
    join pci.consignment_revisions r
      on r.consignment_revision_id = p.consignment_revision_id
     and r.consignment_id = s.consignment_id
    left join pci.submission_versions sv
      on sv.submission_version_id = s.current_version_id
    where s.creator_id = v_creator.creator_id
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

revoke all on function pci_api.creator_submissions(uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_submissions(uuid) to service_role;

comment on function pci_api.creator_submissions(uuid) is
  'Creator-safe work-list projection with frozen brief context and minimum current-version rights action state; full rights declaration is intentionally excluded from list/dashboard reads.';
