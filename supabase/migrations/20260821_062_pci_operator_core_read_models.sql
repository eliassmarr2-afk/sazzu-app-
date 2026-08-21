-- Protocol Creative Insights (PCI)
-- Phase 2.0F.4B: operator core read models for the internal Protocol Data panel.
--
-- Read-only projections only. No business state mutation is introduced here.
-- Browser access remains mediated by pci-admin-api; these RPCs are service-role-only.

create or replace function pci_api.admin_dashboard_summary(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attention jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select coalesce(jsonb_agg(a.item order by a.priority desc, a.occurred_at asc), '[]'::jsonb)
  into v_attention
  from (
    select
      100 as priority,
      d.opened_at as occurred_at,
      jsonb_build_object(
        'entity_type','dispute',
        'entity_id',d.dispute_id,
        'priority',100,
        'reason','incident_open',
        'title','Incidencia abierta',
        'subtitle',coalesce(d.reason_code,d.category),
        'occurred_at',d.opened_at
      ) as item
    from pci.disputes d
    where d.workspace_id=p_workspace_id and d.status <> 'resolved'

    union all

    select
      90,
      ca.created_at,
      jsonb_build_object(
        'entity_type','creative_asset',
        'entity_id',ca.creative_asset_id,
        'priority',90,
        'reason','asset_failed',
        'title','Asset con promoción fallida',
        'subtitle',coalesce(s.concept_label,sv.original_filename,'Asset'),
        'occurred_at',ca.created_at
      )
    from pci.creative_assets ca
    join pci.submissions s on s.submission_id=ca.source_submission_id
    join pci.submission_versions sv on sv.submission_version_id=ca.source_submission_version_id
    where ca.workspace_id=p_workspace_id and ca.status='failed'

    union all

    select
      80,
      py.updated_at,
      jsonb_build_object(
        'entity_type','payable',
        'entity_id',py.payable_id,
        'priority',80,
        'reason','ready_to_pay',
        'title','Pago listo para ejecutar',
        'subtitle',c.display_name || ' · ' || py.currency || ' ' || py.amount_due::text,
        'occurred_at',py.updated_at
      )
    from pci.payables py
    join pci.creators c on c.creator_id=py.creator_id
    where py.workspace_id=p_workspace_id and py.status='ready_to_pay'

    union all

    select
      70,
      py.updated_at,
      jsonb_build_object(
        'entity_type','payable',
        'entity_id',py.payable_id,
        'priority',70,
        'reason','payment_processing',
        'title','Pago en procesamiento',
        'subtitle',c.display_name || ' · ' || py.currency || ' ' || py.amount_due::text,
        'occurred_at',py.updated_at
      )
    from pci.payables py
    join pci.creators c on c.creator_id=py.creator_id
    where py.workspace_id=p_workspace_id and py.status='processing'

    union all

    select
      60,
      coalesce(s.submitted_at,s.created_at),
      jsonb_build_object(
        'entity_type','submission',
        'entity_id',s.submission_id,
        'priority',60,
        'reason','rights_flagged',
        'title','Rights requiere atención',
        'subtitle',c.display_name || ' · ' || coalesce(s.concept_label,r.title,'Entrega'),
        'occurred_at',coalesce(s.submitted_at,s.created_at)
      )
    from pci.submissions s
    join pci.creators c on c.creator_id=s.creator_id
    join pci.consignment_participations cp on cp.participation_id=s.participation_id
    join pci.consignment_revisions r on r.consignment_revision_id=cp.consignment_revision_id
    join pci.submission_versions sv on sv.submission_version_id=s.current_version_id
    where s.workspace_id=p_workspace_id
      and s.status in ('submitted','under_review')
      and sv.rights_clearance_status='flagged'

    union all

    select
      50,
      coalesce(s.submitted_at,s.created_at),
      jsonb_build_object(
        'entity_type','submission',
        'entity_id',s.submission_id,
        'priority',50,
        'reason','waiting_review',
        'title','Entrega esperando revisión',
        'subtitle',c.display_name || ' · ' || coalesce(s.concept_label,r.title,'Entrega'),
        'occurred_at',coalesce(s.submitted_at,s.created_at)
      )
    from pci.submissions s
    join pci.creators c on c.creator_id=s.creator_id
    join pci.consignment_participations cp on cp.participation_id=s.participation_id
    join pci.consignment_revisions r on r.consignment_revision_id=cp.consignment_revision_id
    where s.workspace_id=p_workspace_id and s.status='submitted'
  ) a;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'summary',jsonb_build_object(
      'submissions_waiting_review',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.status='submitted'),
      'submissions_under_review',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.status='under_review'),
      'changes_requested',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.status='changes_requested'),
      'preselected',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.status='preselected'),
      'negotiations_open',(select count(*) from pci.negotiations n where n.workspace_id=p_workspace_id and n.status='open'),
      'live_offers',(select count(*) from pci.purchase_offers po where po.workspace_id=p_workspace_id and po.status='sent'),
      'payables_awaiting_confirmation',(select count(*) from pci.payables py where py.workspace_id=p_workspace_id and py.status='awaiting_confirmation'),
      'payables_ready_to_pay',(select count(*) from pci.payables py where py.workspace_id=p_workspace_id and py.status='ready_to_pay'),
      'payables_processing',(select count(*) from pci.payables py where py.workspace_id=p_workspace_id and py.status='processing'),
      'incidents_open',(select count(*) from pci.disputes d where d.workspace_id=p_workspace_id and d.status <> 'resolved'),
      'library_assets',(select count(*) from pci.creative_assets ca where ca.workspace_id=p_workspace_id and ca.status='available')
    ),
    'financial',jsonb_build_object(
      'ready_to_pay_amount',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.status='ready_to_pay'),0),
      'processing_amount',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.status='processing'),0),
      'paid_amount_total',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.status='paid'),0)
    ),
    'attention',v_attention
  );
end;
$$;

create or replace function pci_api.admin_consignments(
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
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc),'[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'consignment_id',c.consignment_id,
      'status',c.status,
      'visibility',c.visibility,
      'opens_at',c.opens_at,
      'closes_at',c.closes_at,
      'published_at',c.published_at,
      'closed_at',c.closed_at,
      'archived_at',c.archived_at,
      'created_at',c.created_at,
      'updated_at',c.updated_at,
      'max_submissions_per_creator',c.max_submissions_per_creator,
      'max_versions_per_submission',c.max_versions_per_submission,
      'current_revision',case when r.consignment_revision_id is null then null else jsonb_build_object(
        'consignment_revision_id',r.consignment_revision_id,
        'revision_number',r.revision_number,
        'status',r.status,
        'title',r.title,
        'summary',r.summary,
        'base_price_amount',r.base_price_amount,
        'currency',r.currency,
        'slots_available',r.slots_available,
        'pre_purchase_revision_limit',r.pre_purchase_revision_limit,
        'published_at',r.published_at
      ) end,
      'counts',jsonb_build_object(
        'participants',(select count(*) from pci.consignment_participations cp where cp.consignment_id=c.consignment_id and cp.status in ('active','invited')),
        'submissions',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id),
        'waiting_review',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id and s.status='submitted'),
        'preselected',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id and s.status='preselected'),
        'acquired',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id and s.status='acquired')
      )
    ) item
    from pci.consignments c
    left join pci.consignment_revisions r on r.consignment_revision_id=c.current_revision_id
    where c.workspace_id=p_workspace_id
  ) q;

  return jsonb_build_object('ok',true,'workspace_id',p_workspace_id,'items',v_items);
end;
$$;

create or replace function pci_api.admin_consignment_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consignment pci.consignments%rowtype;
  v_current_revision pci.consignment_revisions%rowtype;
  v_revisions jsonb;
  v_participants jsonb;
  v_submissions jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id=p_consignment_id and c.workspace_id=p_workspace_id;

  if v_consignment.consignment_id is null then
    raise exception using errcode='P0002',message='pci_consignment_not_found';
  end if;

  if v_consignment.current_revision_id is not null then
    select * into v_current_revision
    from pci.consignment_revisions r
    where r.consignment_revision_id=v_consignment.current_revision_id
      and r.consignment_id=v_consignment.consignment_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'consignment_revision_id',r.consignment_revision_id,
    'revision_number',r.revision_number,
    'status',r.status,
    'title',r.title,
    'summary',r.summary,
    'objective',r.objective,
    'creative_angle',r.creative_angle,
    'hook_guidance',r.hook_guidance,
    'format_requirements',r.format_requirements,
    'acceptance_criteria',r.acceptance_criteria,
    'subject_type',r.subject_type,
    'subject_ref',r.subject_ref,
    'subject_snapshot',r.subject_snapshot,
    'base_price_amount',r.base_price_amount,
    'currency',r.currency,
    'slots_available',r.slots_available,
    'performance_bonus_policy',r.performance_bonus_policy,
    'pre_purchase_revision_limit',r.pre_purchase_revision_limit,
    'rights_package_snapshot',r.rights_package_snapshot,
    'published_at',r.published_at,
    'superseded_at',r.superseded_at,
    'created_at',r.created_at
  ) order by r.revision_number desc),'[]'::jsonb)
  into v_revisions
  from pci.consignment_revisions r
  where r.consignment_id=v_consignment.consignment_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'participation_id',cp.participation_id,
    'status',cp.status,
    'consignment_revision_id',cp.consignment_revision_id,
    'joined_at',cp.joined_at,
    'declined_at',cp.declined_at,
    'withdrawn_at',cp.withdrawn_at,
    'created_at',cp.created_at,
    'creator',jsonb_build_object(
      'creator_id',cr.creator_id,
      'display_name',cr.display_name,
      'email',cr.email,
      'status',cr.status
    )
  ) order by cp.created_at desc),'[]'::jsonb)
  into v_participants
  from pci.consignment_participations cp
  join pci.creators cr on cr.creator_id=cp.creator_id
  where cp.workspace_id=p_workspace_id and cp.consignment_id=v_consignment.consignment_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'submission_id',s.submission_id,
    'status',s.status,
    'concept_label',s.concept_label,
    'current_version_id',s.current_version_id,
    'submitted_at',s.submitted_at,
    'acquired_at',s.acquired_at,
    'created_at',s.created_at,
    'creator',jsonb_build_object('creator_id',cr.creator_id,'display_name',cr.display_name),
    'accepted_revision',jsonb_build_object(
      'consignment_revision_id',ar.consignment_revision_id,
      'revision_number',ar.revision_number,
      'title',ar.title
    )
  ) order by coalesce(s.submitted_at,s.created_at) desc),'[]'::jsonb)
  into v_submissions
  from pci.submissions s
  join pci.creators cr on cr.creator_id=s.creator_id
  join pci.consignment_participations cp on cp.participation_id=s.participation_id
  join pci.consignment_revisions ar on ar.consignment_revision_id=cp.consignment_revision_id
  where s.workspace_id=p_workspace_id and s.consignment_id=v_consignment.consignment_id;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'consignment',jsonb_build_object(
      'consignment_id',v_consignment.consignment_id,
      'status',v_consignment.status,
      'visibility',v_consignment.visibility,
      'max_submissions_per_creator',v_consignment.max_submissions_per_creator,
      'max_versions_per_submission',v_consignment.max_versions_per_submission,
      'opens_at',v_consignment.opens_at,
      'closes_at',v_consignment.closes_at,
      'cancelled_reason',v_consignment.cancelled_reason,
      'published_at',v_consignment.published_at,
      'closed_at',v_consignment.closed_at,
      'archived_at',v_consignment.archived_at,
      'created_at',v_consignment.created_at,
      'updated_at',v_consignment.updated_at
    ),
    'current_revision',case when v_current_revision.consignment_revision_id is null then null else jsonb_build_object(
      'consignment_revision_id',v_current_revision.consignment_revision_id,
      'revision_number',v_current_revision.revision_number,
      'status',v_current_revision.status,
      'title',v_current_revision.title,
      'summary',v_current_revision.summary,
      'objective',v_current_revision.objective,
      'creative_angle',v_current_revision.creative_angle,
      'hook_guidance',v_current_revision.hook_guidance,
      'format_requirements',v_current_revision.format_requirements,
      'acceptance_criteria',v_current_revision.acceptance_criteria,
      'subject_snapshot',v_current_revision.subject_snapshot,
      'base_price_amount',v_current_revision.base_price_amount,
      'currency',v_current_revision.currency,
      'slots_available',v_current_revision.slots_available,
      'performance_bonus_policy',v_current_revision.performance_bonus_policy,
      'pre_purchase_revision_limit',v_current_revision.pre_purchase_revision_limit,
      'rights_package_snapshot',v_current_revision.rights_package_snapshot,
      'published_at',v_current_revision.published_at
    ) end,
    'counts',jsonb_build_object(
      'participants',jsonb_array_length(v_participants),
      'submissions',jsonb_array_length(v_submissions),
      'waiting_review',(select count(*) from pci.submissions s where s.consignment_id=v_consignment.consignment_id and s.status='submitted'),
      'preselected',(select count(*) from pci.submissions s where s.consignment_id=v_consignment.consignment_id and s.status='preselected'),
      'acquired',(select count(*) from pci.submissions s where s.consignment_id=v_consignment.consignment_id and s.status='acquired')
    ),
    'revisions',v_revisions,
    'participants',v_participants,
    'submissions',v_submissions
  );
end;
$$;

create or replace function pci_api.admin_submissions(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text:=nullif(lower(btrim(coalesce(p_status,''))),'');
  v_items jsonb;
  v_total bigint;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  if v_status is not null and v_status not in ('draft','submitted','under_review','changes_requested','preselected','rejected','withdrawn','acquired') then
    raise exception using errcode='22023',message='pci_submission_status_invalid';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 then
    raise exception using errcode='22023',message='pci_pagination_invalid';
  end if;

  select count(*) into v_total
  from pci.submissions s
  where s.workspace_id=p_workspace_id
    and (v_status is null or s.status=v_status);

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_items
  from (
    select
      coalesce(s.submitted_at,s.created_at) as sort_at,
      jsonb_build_object(
        'submission_id',s.submission_id,
        'status',s.status,
        'concept_label',s.concept_label,
        'concept_metadata',s.concept_metadata,
        'current_version_id',s.current_version_id,
        'submitted_at',s.submitted_at,
        'rejected_at',s.rejected_at,
        'withdrawn_at',s.withdrawn_at,
        'acquired_at',s.acquired_at,
        'created_at',s.created_at,
        'updated_at',s.updated_at,
        'creator',jsonb_build_object(
          'creator_id',cr.creator_id,
          'display_name',cr.display_name,
          'email',cr.email,
          'status',cr.status
        ),
        'consignment',jsonb_build_object(
          'consignment_id',c.consignment_id,
          'status',c.status,
          'accepted_revision',jsonb_build_object(
            'consignment_revision_id',r.consignment_revision_id,
            'revision_number',r.revision_number,
            'title',r.title
          )
        ),
        'current_version',case when sv.submission_version_id is null then null else jsonb_build_object(
          'submission_version_id',sv.submission_version_id,
          'version_number',sv.version_number,
          'status',sv.status,
          'rights_clearance_status',sv.rights_clearance_status,
          'original_filename',sv.original_filename,
          'mime_type',sv.mime_type,
          'file_size_bytes',sv.file_size_bytes,
          'duration_seconds',sv.duration_seconds,
          'width',sv.width,
          'height',sv.height,
          'sha256',sv.sha256,
          'finalized_at',sv.finalized_at
        ) end
      ) as item
    from pci.submissions s
    join pci.creators cr on cr.creator_id=s.creator_id
    join pci.consignments c on c.consignment_id=s.consignment_id
    join pci.consignment_participations cp on cp.participation_id=s.participation_id
    join pci.consignment_revisions r on r.consignment_revision_id=cp.consignment_revision_id
    left join pci.submission_versions sv on sv.submission_version_id=s.current_version_id
    where s.workspace_id=p_workspace_id
      and (v_status is null or s.status=v_status)
    order by coalesce(s.submitted_at,s.created_at) desc
    limit p_limit offset p_offset
  ) q;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'status_filter',v_status,
    'total',v_total,
    'limit',p_limit,
    'offset',p_offset,
    'items',v_items
  );
end;
$$;

revoke all on function pci_api.admin_dashboard_summary(uuid,text) from public,anon,authenticated;
revoke all on function pci_api.admin_consignments(uuid,text) from public,anon,authenticated;
revoke all on function pci_api.admin_consignment_detail(uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_submissions(uuid,text,text,integer,integer) from public,anon,authenticated;

grant execute on function pci_api.admin_dashboard_summary(uuid,text) to service_role;
grant execute on function pci_api.admin_consignments(uuid,text) to service_role;
grant execute on function pci_api.admin_consignment_detail(uuid,text,uuid) to service_role;
grant execute on function pci_api.admin_submissions(uuid,text,text,integer,integer) to service_role;

comment on function pci_api.admin_dashboard_summary(uuid,text) is
  'Aggregated PCI control-tower read model. Returns counts, financial aggregates and minimal attention items only; no private payment identifier material.';
comment on function pci_api.admin_consignments(uuid,text) is
  'Operator consignment list with current revision metadata and operational counts.';
comment on function pci_api.admin_consignment_detail(uuid,text,uuid) is
  'Operator consignment detail with revision history, participants and submissions; submission rows retain their accepted revision context.';
comment on function pci_api.admin_submissions(uuid,text,text,integer,integer) is
  'Universal operator submission list across all lifecycle states, paginated and anchored to each participation accepted revision.';
