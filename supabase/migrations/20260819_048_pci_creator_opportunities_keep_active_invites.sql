-- Protocol Creative Insights (PCI)
-- Phase 1N frontend support: invite-only briefs remain visible after acceptance.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_opportunities(
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

  select coalesce(jsonb_agg(item order by (item->>'published_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'consignment_id', c.consignment_id,
      'workspace_id', c.workspace_id,
      'visibility', c.visibility,
      'status', c.status,
      'published_at', c.published_at,
      'closes_at', c.closes_at,
      'revision', jsonb_build_object(
        'consignment_revision_id', r.consignment_revision_id,
        'revision_number', r.revision_number,
        'title', r.title,
        'summary', r.summary,
        'objective', r.objective,
        'creative_angle', r.creative_angle,
        'hook_guidance', r.hook_guidance,
        'format_requirements', r.format_requirements,
        'acceptance_criteria', r.acceptance_criteria,
        'subject_type', r.subject_type,
        'subject_ref', r.subject_ref,
        'subject_snapshot', r.subject_snapshot,
        'base_price_amount', r.base_price_amount,
        'currency', r.currency,
        'slots_available', r.slots_available,
        'performance_bonus_policy', r.performance_bonus_policy,
        'pre_purchase_revision_limit', r.pre_purchase_revision_limit,
        'rights_package_snapshot', r.rights_package_snapshot
      ),
      'participation', case when p.participation_id is null then null else jsonb_build_object(
        'participation_id', p.participation_id,
        'status', p.status,
        'joined_at', p.joined_at
      ) end
    ) as item
    from pci.consignments c
    join pci.consignment_revisions r
      on r.consignment_revision_id = c.current_revision_id
    join pci.workspace_creators wc
      on wc.workspace_id = c.workspace_id
     and wc.creator_id = v_creator.creator_id
     and wc.status in ('active','restricted')
    left join pci.consignment_participations p
      on p.consignment_id = c.consignment_id
     and p.creator_id = v_creator.creator_id
    where c.status = 'open'
      and (c.opens_at is null or c.opens_at <= now())
      and (c.closes_at is null or c.closes_at > now())
      and (
        c.visibility = 'open'
        or (
          c.visibility = 'invite_only'
          and p.status in ('invited','active')
        )
      )
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

revoke all on function pci_api.creator_opportunities(uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_opportunities(uuid) to service_role;

comment on function pci_api.creator_opportunities(uuid) is
  'Creator-safe opportunity projection. Invite-only briefs remain visible after the Creator accepts the exact invited participation.';
