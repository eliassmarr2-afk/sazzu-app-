-- Protocol Creative Insights (PCI)
-- Phase 1I: safe negotiation and formal-offer projections.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.admin_negotiations(
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

  select coalesce(jsonb_agg(item order by (item->>'updated_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'negotiation_id', n.negotiation_id,
      'status', n.status,
      'opened_at', n.opened_at,
      'closed_at', n.closed_at,
      'close_reason', n.close_reason,
      'updated_at', n.updated_at,
      'submission', jsonb_build_object(
        'submission_id', s.submission_id,
        'status', s.status,
        'concept_label', s.concept_label,
        'current_version_id', s.current_version_id
      ),
      'creator', jsonb_build_object(
        'creator_id', c.creator_id,
        'display_name', c.display_name,
        'status', c.status
      ),
      'live_offer', case when po.offer_id is null then null else jsonb_build_object(
        'offer_id', po.offer_id,
        'proposed_by_type', po.proposed_by_type,
        'status', po.status,
        'currency', po.currency,
        'total_amount', po.total_amount,
        'expires_at', po.expires_at,
        'sent_at', po.sent_at
      ) end,
      'message_count', (select count(*) from pci.messages m where m.negotiation_id = n.negotiation_id)
    ) as item
    from pci.negotiations n
    join pci.submissions s on s.submission_id = n.submission_id
    join pci.creators c on c.creator_id = n.creator_id
    left join pci.purchase_offers po
      on po.negotiation_id = n.negotiation_id and po.status = 'sent'
    where n.workspace_id = p_workspace_id
  ) q;

  return jsonb_build_object('ok', true, 'workspace_id', p_workspace_id, 'items', v_items);
end;
$$;

create or replace function pci_api.admin_negotiation_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_negotiation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_negotiation pci.negotiations%rowtype;
  v_submission pci.submissions%rowtype;
  v_creator pci.creators%rowtype;
  v_current_version pci.submission_versions%rowtype;
  v_messages jsonb;
  v_offers jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = p_negotiation_id
    and n.workspace_id = p_workspace_id;

  if v_negotiation.negotiation_id is null then
    raise exception using errcode = 'P0002', message = 'pci_negotiation_not_found';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_negotiation.submission_id;

  select * into v_creator
  from pci.creators c
  where c.creator_id = v_negotiation.creator_id;

  if v_submission.current_version_id is not null then
    select * into v_current_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_submission.current_version_id;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'message_id', m.message_id,
      'sender_type', m.sender_type,
      'sender_user_id', m.sender_user_id,
      'sender_creator_id', m.sender_creator_id,
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
      'created_by_user_id', po.created_by_user_id,
      'created_by_creator_id', po.created_by_creator_id,
      'items', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'offer_item_id', poi.offer_item_id,
            'submission_id', poi.submission_id,
            'submission_version_id', poi.submission_version_id,
            'amount', poi.amount,
            'item_terms_snapshot', poi.item_terms_snapshot
          ) order by poi.created_at
        ), '[]'::jsonb)
        from pci.purchase_offer_items poi
        where poi.offer_id = po.offer_id
      )
    ) order by po.created_at
  ), '[]'::jsonb)
  into v_offers
  from pci.purchase_offers po
  where po.negotiation_id = v_negotiation.negotiation_id;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'negotiation', jsonb_build_object(
      'negotiation_id', v_negotiation.negotiation_id,
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
      'current_version_id', v_submission.current_version_id
    ),
    'creator', jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'display_name', v_creator.display_name,
      'legal_name', v_creator.legal_name,
      'email', v_creator.email,
      'status', v_creator.status
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
      'sha256', v_current_version.sha256
    ) end,
    'messages', v_messages,
    'offers', v_offers
  );
end;
$$;

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
        'concept_label', s.concept_label
      ),
      'live_offer', case when po.offer_id is null then null else jsonb_build_object(
        'offer_id', po.offer_id,
        'proposed_by_type', po.proposed_by_type,
        'status', po.status,
        'currency', po.currency,
        'total_amount', po.total_amount,
        'expires_at', po.expires_at,
        'sent_at', po.sent_at
      ) end,
      'message_count', (select count(*) from pci.messages m where m.negotiation_id = n.negotiation_id)
    ) as item
    from pci.negotiations n
    join pci.submissions s on s.submission_id = n.submission_id
    left join pci.purchase_offers po
      on po.negotiation_id = n.negotiation_id and po.status = 'sent'
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
  v_messages jsonb;
  v_offers jsonb;
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
      'items', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'submission_id', poi.submission_id,
            'submission_version_id', poi.submission_version_id,
            'amount', poi.amount,
            'item_terms_snapshot', poi.item_terms_snapshot
          ) order by poi.created_at
        ), '[]'::jsonb)
        from pci.purchase_offer_items poi
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
      'current_version_id', v_submission.current_version_id
    ),
    'messages', v_messages,
    'offers', v_offers,
    'acceptance_execution_available', false,
    'acceptance_execution_phase', '1J'
  );
end;
$$;

revoke all on function pci_api.admin_negotiations(uuid,text) from public, anon, authenticated;
revoke all on function pci_api.admin_negotiation_detail(uuid,text,uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_negotiations(uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_negotiation_detail(uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.admin_negotiations(uuid,text) to service_role;
grant execute on function pci_api.admin_negotiation_detail(uuid,text,uuid) to service_role;
grant execute on function pci_api.creator_negotiations(uuid) to service_role;
grant execute on function pci_api.creator_negotiation_detail(uuid,uuid) to service_role;

comment on function pci_api.creator_negotiation_detail(uuid,uuid) is
  'Creator-safe negotiation projection: no operator identities or internal notes. Offer acceptance execution is intentionally deferred to atomic purchase Phase 1J.';