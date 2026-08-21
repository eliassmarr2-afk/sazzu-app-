-- Protocol Creative Insights (PCI)
-- Phase 2.0F.4B follow-up: keep the Control Tower attention projection bounded.
-- The dashboard is a prioritization surface, not an unbounded operational export.

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
    select *
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
    ) all_attention
    order by priority desc, occurred_at asc
    limit 25
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
    'attention',v_attention,
    'attention_limit',25
  );
end;
$$;

comment on function pci_api.admin_dashboard_summary(uuid,text) is
  'Aggregated PCI control-tower read model with a bounded 25-item attention queue. No private payment identifier material is exposed.';
