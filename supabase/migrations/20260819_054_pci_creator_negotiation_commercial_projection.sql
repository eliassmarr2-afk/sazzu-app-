-- Protocol Creative Insights (PCI)
-- Phase 1N.6 frontend support: Creator-safe negotiation projection with exact
-- accepted brief/version context and formal-offer action state.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_negotiations(
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

  select coalesce(jsonb_agg(item order by (item->>'updated_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'negotiation_id', n.negotiation_id,
      'workspace_id', n.workspace_id,
      'status', n.status,
      'opened_at', n.opened_at,
      'closed_at', n.closed_at,
      'close_reason', n.close_reason,
      'updated_at', n.updated_at,
      'submission', jsonb_build_object(
        'submission_id', s.submission_id,
        'status', s.status,
        'concept_label', s.concept_label,
        'current_version_id', s.current_version_id,
        'consignment_id', s.consignment_id,
        'consignment_revision_id', r.consignment_revision_id,
        'consignment_revision_number', r.revision_number,
        'consignment_title', r.title
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
        'sha256', sv.sha256,
        'finalized_at', sv.finalized_at
      ) end,
      'live_offer', case when po.offer_id is null then null else jsonb_build_object(
        'offer_id', po.offer_id,
        'parent_offer_id', po.parent_offer_id,
        'proposed_by_type', po.proposed_by_type,
        'status', po.status,
        'currency', po.currency,
        'total_amount', po.total_amount,
        'expires_at', po.expires_at,
        'sent_at', po.sent_at,
        'creator_action_required', po.proposed_by_type = 'workspace'
          and po.status = 'sent'
          and (po.expires_at is null or po.expires_at > now())
          and n.status = 'open',
        'item', (
          select jsonb_build_object(
            'submission_version_id', poi.submission_version_id,
            'amount', poi.amount,
            'version_number', coalesce((poi.item_terms_snapshot->>'version_number')::integer, ov.version_number),
            'sha256', coalesce(poi.item_terms_snapshot->>'sha256', ov.sha256),
            'original_filename', coalesce(poi.item_terms_snapshot->>'original_filename', ov.original_filename),
            'mime_type', coalesce(poi.item_terms_snapshot->>'mime_type', ov.mime_type)
          )
          from pci.purchase_offer_items poi
          join pci.submission_versions ov on ov.submission_version_id = poi.submission_version_id
          where poi.offer_id = po.offer_id
          order by poi.created_at
          limit 1
        )
      ) end,
      'latest_message', (
        select jsonb_build_object(
          'message_id', m.message_id,
          'sender_type', m.sender_type,
          'body', m.body,
          'created_at', m.created_at
        )
        from pci.messages m
        where m.negotiation_id = n.negotiation_id
        order by m.created_at desc
        limit 1
      ),
      'message_count', (select count(*) from pci.messages m where m.negotiation_id = n.negotiation_id)
    ) as item
    from pci.negotiations n
    join pci.submissions s
      on s.submission_id = n.submission_id
     and s.creator_id = v_creator.creator_id
    join pci.consignment_participations p
      on p.participation_id = s.participation_id
     and p.creator_id = v_creator.creator_id
    join pci.consignment_revisions r
      on r.consignment_revision_id = p.consignment_revision_id
     and r.consignment_id = s.consignment_id
    left join pci.submission_versions sv
      on sv.submission_version_id = s.current_version_id
    left join pci.purchase_offers po
      on po.negotiation_id = n.negotiation_id
     and po.status = 'sent'
    where n.creator_id = v_creator.creator_id
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

create or replace function pci_api.creator_negotiation_detail(
  p_actor_user_id uuid,
  p_negotiation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_negotiation pci.negotiations%rowtype;
  v_submission pci.submissions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_current_version pci.submission_versions%rowtype;
  v_messages jsonb;
  v_offers jsonb;
  v_live_offer pci.purchase_offers%rowtype;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = p_negotiation_id
    and n.creator_id = v_creator.creator_id;

  if v_negotiation.negotiation_id is null then
    raise exception using errcode = 'P0002', message = 'pci_negotiation_not_found';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_negotiation.submission_id
    and s.creator_id = v_creator.creator_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  select * into v_participation
  from pci.consignment_participations p
  where p.participation_id = v_submission.participation_id
    and p.creator_id = v_creator.creator_id;

  if v_participation.participation_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_participation_context_invalid';
  end if;

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_participation.consignment_revision_id
    and r.consignment_id = v_submission.consignment_id;

  if v_revision.consignment_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_revision_context_invalid';
  end if;

  if v_submission.current_version_id is not null then
    select * into v_current_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_submission.current_version_id;
  end if;

  select * into v_live_offer
  from pci.purchase_offers po
  where po.negotiation_id = v_negotiation.negotiation_id
    and po.status = 'sent'
  order by po.created_at desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'message_id', m.message_id,
      'sender_type', m.sender_type,
      'body', m.body,
      'created_at', m.created_at
    ) order by m.created_at
  ), '[]'::jsonb)
  into v_messages
  from pci.messages m
  where m.negotiation_id = v_negotiation.negotiation_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'offer_id', po.offer_id,
      'parent_offer_id', po.parent_offer_id,
      'proposed_by_type', po.proposed_by_type,
      'status', po.status,
      'currency', po.currency,
      'total_amount', po.total_amount,
      'rights_package_snapshot', po.rights_package_snapshot,
      'payment_terms_snapshot', po.payment_terms_snapshot,
      'bonus_terms_snapshot', po.bonus_terms_snapshot,
      'commercial_terms_snapshot', po.commercial_terms_snapshot,
      'expires_at', po.expires_at,
      'sent_at', po.sent_at,
      'accepted_at', po.accepted_at,
      'rejected_at', po.rejected_at,
      'withdrawn_at', po.withdrawn_at,
      'created_at', po.created_at,
      'creator_action_required', po.proposed_by_type = 'workspace'
        and po.status = 'sent'
        and (po.expires_at is null or po.expires_at > now())
        and v_negotiation.status = 'open',
      'items', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'submission_id', poi.submission_id,
            'submission_version_id', poi.submission_version_id,
            'amount', poi.amount,
            'version_number', coalesce((poi.item_terms_snapshot->>'version_number')::integer, ov.version_number),
            'sha256', coalesce(poi.item_terms_snapshot->>'sha256', ov.sha256),
            'original_filename', coalesce(poi.item_terms_snapshot->>'original_filename', ov.original_filename),
            'mime_type', coalesce(poi.item_terms_snapshot->>'mime_type', ov.mime_type),
            'item_terms_snapshot', poi.item_terms_snapshot
          ) order by poi.created_at
        ), '[]'::jsonb)
        from pci.purchase_offer_items poi
        join pci.submission_versions ov on ov.submission_version_id = poi.submission_version_id
        where poi.offer_id = po.offer_id
      )
    ) order by po.created_at
  ), '[]'::jsonb)
  into v_offers
  from pci.purchase_offers po
  where po.negotiation_id = v_negotiation.negotiation_id;

  return jsonb_build_object(
    'ok', true,
    'negotiation', jsonb_build_object(
      'negotiation_id', v_negotiation.negotiation_id,
      'workspace_id', v_negotiation.workspace_id,
      'status', v_negotiation.status,
      'opened_at', v_negotiation.opened_at,
      'closed_at', v_negotiation.closed_at,
      'close_reason', v_negotiation.close_reason,
      'updated_at', v_negotiation.updated_at
    ),
    'submission', jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'status', v_submission.status,
      'concept_label', v_submission.concept_label,
      'current_version_id', v_submission.current_version_id,
      'consignment_id', v_submission.consignment_id,
      'consignment_revision_id', v_revision.consignment_revision_id,
      'consignment_revision_number', v_revision.revision_number,
      'consignment_title', v_revision.title
    ),
    'current_version', case when v_current_version.submission_version_id is null then null else jsonb_build_object(
      'submission_version_id', v_current_version.submission_version_id,
      'version_number', v_current_version.version_number,
      'status', v_current_version.status,
      'rights_clearance_status', v_current_version.rights_clearance_status,
      'original_filename', v_current_version.original_filename,
      'mime_type', v_current_version.mime_type,
      'file_size_bytes', v_current_version.file_size_bytes,
      'duration_seconds', v_current_version.duration_seconds,
      'width', v_current_version.width,
      'height', v_current_version.height,
      'sha256', v_current_version.sha256,
      'finalized_at', v_current_version.finalized_at
    ) end,
    'messages', v_messages,
    'offers', v_offers,
    'live_offer_id', v_live_offer.offer_id,
    'creator_action_required', v_live_offer.offer_id is not null
      and v_live_offer.proposed_by_type = 'workspace'
      and (v_live_offer.expires_at is null or v_live_offer.expires_at > now())
      and v_negotiation.status = 'open',
    'acceptance_execution_available', true,
    'acceptance_execution_phase', '1J'
  );
end;
$$;

revoke all on function pci_api.creator_negotiations(uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_negotiation_detail(uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_negotiations(uuid) to service_role;
grant execute on function pci_api.creator_negotiation_detail(uuid,uuid) to service_role;

comment on function pci_api.creator_negotiation_detail(uuid,uuid) is
  'Creator-safe negotiation projection with frozen brief/version context, Creator-visible messages and immutable formal offers. No operator identities or internal notes. Acceptance executes through the atomic 1J command.';
