-- Protocol Creative Insights (PCI)
-- Phase 2.1D.0
--
-- Review Queue hardening:
-- 1. Show the exact consignment revision accepted by the Creator participation.
-- 2. Never project consignments.current_revision_id as accepted brief context.
-- 3. Bound the operator queue to 100 rows while preserving total count.
-- 4. Read-only contract change; no historical business data is mutated.

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
  v_total bigint;
  v_queue_limit constant integer := 100;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select count(*)
  into v_total
  from pci.submissions s
  where s.workspace_id = p_workspace_id
    and s.status in (
      'submitted',
      'under_review',
      'changes_requested',
      'preselected'
    );

  select coalesce(
    jsonb_agg(
      q.item
      order by q.sort_at desc nulls last
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select
      coalesce(s.submitted_at, s.created_at) as sort_at,

      jsonb_build_object(
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
          'consignment_id', s.consignment_id,
          'title', r.title,
          'revision_number', r.revision_number,
          'consignment_revision_id',
            r.consignment_revision_id
        ),

        'current_version',
          case
            when sv.submission_version_id is null
              then null
            else jsonb_build_object(
              'submission_version_id',
                sv.submission_version_id,
              'version_number',
                sv.version_number,
              'status',
                sv.status,
              'rights_clearance_status',
                sv.rights_clearance_status,
              'original_filename',
                sv.original_filename,
              'mime_type',
                sv.mime_type,
              'file_size_bytes',
                sv.file_size_bytes,
              'duration_seconds',
                sv.duration_seconds,
              'width',
                sv.width,
              'height',
                sv.height,
              'finalized_at',
                sv.finalized_at
            )
          end
      ) as item

    from pci.submissions s

    join pci.creators cr
      on cr.creator_id = s.creator_id

    join pci.consignment_participations cp
      on cp.participation_id = s.participation_id
     and cp.workspace_id = s.workspace_id
     and cp.consignment_id = s.consignment_id
     and cp.creator_id = s.creator_id

    join pci.consignment_revisions r
      on r.consignment_revision_id =
           cp.consignment_revision_id
     and r.consignment_id = s.consignment_id

    left join pci.submission_versions sv
      on sv.submission_version_id =
           s.current_version_id
     and sv.submission_id =
           s.submission_id

    where s.workspace_id = p_workspace_id
      and s.status in (
        'submitted',
        'under_review',
        'changes_requested',
        'preselected'
      )

    order by
      coalesce(s.submitted_at, s.created_at) desc

    limit v_queue_limit
  ) q;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'total', v_total,
    'queue_limit', v_queue_limit,
    'items', v_items
  );
end;
$$;

comment on function pci_api.admin_review_queue(uuid,text) is
  'Bounded operator review queue anchored to the exact consignment revision accepted by each Creator participation.';
