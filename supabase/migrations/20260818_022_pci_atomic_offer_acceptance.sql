-- Protocol Creative Insights (PCI)
-- Phase 1J: atomic offer acceptance -> Purchase + base Payable + Rights Grant(s).
-- Intentionally stored in Git only; not applied to production yet.

-- An exact immutable creative version may only be commercially acquired once.
create unique index if not exists pci_rights_grants_version_uidx
  on pci.rights_grants (submission_version_id);

create or replace function pci_api.creator_accept_offer(
  p_actor_user_id uuid,
  p_offer_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_offer pci.purchase_offers%rowtype;
  v_negotiation pci.negotiations%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_receipt_id uuid;
  v_existing_receipt pci.command_receipts%rowtype;
  v_purchase_id uuid;
  v_payable_id uuid;
  v_rights_grant_ids jsonb := '[]'::jsonb;
  v_item_count integer;
  v_item_amount_total numeric(14,2);
  v_item record;
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_last_preselected_version_id uuid;
  v_rights_grant_id uuid;
  v_result jsonb;
begin
  if p_offer_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_offer_acceptance_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_offer
  from pci.purchase_offers po
  where po.offer_id = p_offer_id
    and po.creator_id = v_creator.creator_id
  for update;

  if v_offer.offer_id is null then
    raise exception using errcode = 'P0002', message = 'pci_offer_not_found';
  end if;

  if v_offer.proposed_by_type <> 'workspace' then
    raise exception using errcode = '23514', message = 'pci_creator_can_only_accept_workspace_offer';
  end if;

  if v_offer.status <> 'sent' then
    raise exception using errcode = '23514', message = 'pci_offer_not_live';
  end if;

  if v_offer.expires_at is not null and v_offer.expires_at <= now() then
    raise exception using errcode = '23514', message = 'pci_offer_expired';
  end if;

  select * into v_negotiation
  from pci.negotiations n
  where n.negotiation_id = v_offer.negotiation_id
    and n.creator_id = v_creator.creator_id
    and n.workspace_id = v_offer.workspace_id
  for update;

  if v_negotiation.negotiation_id is null then
    raise exception using errcode = 'P0002', message = 'pci_negotiation_not_found';
  end if;

  if v_negotiation.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_negotiation_not_open';
  end if;

  select * into v_relationship
  from pci.workspace_creators wc
  where wc.workspace_id = v_offer.workspace_id
    and wc.creator_id = v_creator.creator_id
  for update;

  if v_relationship.workspace_creator_id is null or v_relationship.status <> 'active' then
    raise exception using errcode = '42501', message = 'pci_creator_workspace_access_denied';
  end if;

  if exists (
    select 1 from pci.purchases p where p.offer_id = v_offer.offer_id
  ) then
    raise exception using errcode = '23505', message = 'pci_offer_purchase_already_exists';
  end if;

  select count(*), coalesce(sum(poi.amount), 0)
  into v_item_count, v_item_amount_total
  from pci.purchase_offer_items poi
  where poi.offer_id = v_offer.offer_id;

  if v_item_count < 1 then
    raise exception using errcode = '23514', message = 'pci_offer_item_required';
  end if;

  if v_item_amount_total is distinct from v_offer.total_amount then
    raise exception using errcode = '23514', message = 'pci_offer_total_mismatch';
  end if;

  -- Validate every exact version before changing any commercial state.
  for v_item in
    select poi.*
    from pci.purchase_offer_items poi
    where poi.offer_id = v_offer.offer_id
    order by poi.created_at, poi.offer_item_id
    for update
  loop
    select * into v_submission
    from pci.submissions s
    where s.submission_id = v_item.submission_id
      and s.workspace_id = v_offer.workspace_id
      and s.creator_id = v_creator.creator_id
    for update;

    if v_submission.submission_id is null then
      raise exception using errcode = '23514', message = 'pci_offer_submission_invalid';
    end if;

    if v_submission.status <> 'preselected' then
      raise exception using errcode = '23514', message = 'pci_offer_submission_not_preselected';
    end if;

    if v_submission.current_version_id is distinct from v_item.submission_version_id then
      raise exception using errcode = '23514', message = 'pci_offer_version_not_current';
    end if;

    select sr.submission_version_id into v_last_preselected_version_id
    from pci.submission_reviews sr
    where sr.submission_id = v_submission.submission_id
      and sr.decision = 'preselected'
    order by sr.created_at desc, sr.review_id desc
    limit 1;

    if v_last_preselected_version_id is distinct from v_item.submission_version_id then
      raise exception using errcode = '23514', message = 'pci_offer_version_not_preselected';
    end if;

    select * into v_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_item.submission_version_id
      and sv.submission_id = v_submission.submission_id
    for update;

    if v_version.submission_version_id is null or v_version.status <> 'ready' then
      raise exception using errcode = '23514', message = 'pci_offer_version_not_ready';
    end if;

    if v_version.rights_clearance_status <> 'complete' then
      raise exception using errcode = '23514', message = 'pci_offer_rights_clearance_incomplete';
    end if;

    if v_version.sha256 is null or v_version.sha256 !~ '^[0-9a-f]{64}$' then
      raise exception using errcode = '23514', message = 'pci_offer_version_hash_invalid';
    end if;

    if exists (
      select 1 from pci.rights_grants rg
      where rg.submission_version_id = v_version.submission_version_id
    ) then
      raise exception using errcode = '23505', message = 'pci_submission_version_already_acquired';
    end if;
  end loop;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_offer.workspace_id,
    'creator_accept_offer', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_accept_offer'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing_receipt.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing_receipt.status = 'completed' then
      return v_existing_receipt.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  update pci.purchase_offers
  set status = 'accepted', accepted_at = now()
  where offer_id = v_offer.offer_id;

  insert into pci.purchases (
    workspace_id, creator_id, offer_id, status, currency, total_amount, agreed_at
  ) values (
    v_offer.workspace_id, v_creator.creator_id, v_offer.offer_id,
    'agreed', v_offer.currency, v_offer.total_amount, now()
  ) returning purchase_id into v_purchase_id;

  insert into pci.payables (
    workspace_id, creator_id, purchase_id, concept_type,
    concept_ref_id, currency, amount_due, status
  ) values (
    v_offer.workspace_id, v_creator.creator_id, v_purchase_id,
    'base_purchase', v_offer.offer_id, v_offer.currency, v_offer.total_amount,
    'awaiting_confirmation'
  ) returning payable_id into v_payable_id;

  -- A Rights Grant is created for each exact purchased version, but remains inactive.
  for v_item in
    select poi.*
    from pci.purchase_offer_items poi
    where poi.offer_id = v_offer.offer_id
    order by poi.created_at, poi.offer_item_id
  loop
    select * into v_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_item.submission_version_id;

    insert into pci.rights_grants (
      purchase_id, workspace_id, creator_id, submission_version_id,
      status, rights_package_snapshot, version_sha256_snapshot
    ) values (
      v_purchase_id, v_offer.workspace_id, v_creator.creator_id,
      v_item.submission_version_id, 'pending_payment',
      v_offer.rights_package_snapshot, v_version.sha256
    ) returning rights_grant_id into v_rights_grant_id;

    v_rights_grant_ids := v_rights_grant_ids || jsonb_build_array(v_rights_grant_id);

    perform pci.append_event(
      v_offer.workspace_id,
      'creator', p_actor_user_id, v_creator.creator_id,
      'rights_grant', v_rights_grant_id,
      'rights.pending_payment_created', null, 'pending_payment',
      p_request_id, v_receipt_id,
      jsonb_build_object(
        'purchase_id', v_purchase_id,
        'submission_version_id', v_item.submission_version_id,
        'version_sha256', v_version.sha256
      )
    );
  end loop;

  update pci.negotiations
  set status = 'closed', closed_at = now(), close_reason = 'purchase_agreed'
  where negotiation_id = v_negotiation.negotiation_id;

  perform pci.append_event(
    v_offer.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'purchase_offer', v_offer.offer_id,
    'offer.accepted', 'sent', 'accepted',
    p_request_id, v_receipt_id,
    jsonb_build_object('purchase_id', v_purchase_id)
  );

  perform pci.append_event(
    v_offer.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'purchase', v_purchase_id,
    'purchase.agreed', null, 'agreed',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'offer_id', v_offer.offer_id,
      'amount', v_offer.total_amount,
      'currency', v_offer.currency
    )
  );

  perform pci.append_event(
    v_offer.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'payable', v_payable_id,
    'payable.created', null, 'awaiting_confirmation',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'purchase_id', v_purchase_id,
      'concept_type', 'base_purchase',
      'amount_due', v_offer.total_amount,
      'currency', v_offer.currency
    )
  );

  perform pci.append_event(
    v_offer.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'negotiation', v_negotiation.negotiation_id,
    'negotiation.closed', 'open', 'closed',
    p_request_id, v_receipt_id,
    jsonb_build_object('reason', 'purchase_agreed', 'purchase_id', v_purchase_id)
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_offer.workspace_id,
    'notify_protocol_offer_accepted',
    'purchase', v_purchase_id,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'offer_id', v_offer.offer_id,
      'payable_id', v_payable_id,
      'amount', v_offer.total_amount,
      'currency', v_offer.currency
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'offer_id', v_offer.offer_id,
    'offer_status', 'accepted',
    'purchase_id', v_purchase_id,
    'purchase_status', 'agreed',
    'payable_id', v_payable_id,
    'payable_status', 'awaiting_confirmation',
    'rights_grant_ids', v_rights_grant_ids,
    'rights_status', 'pending_payment',
    'negotiation_id', v_negotiation.negotiation_id,
    'negotiation_status', 'closed',
    'amount', v_offer.total_amount,
    'currency', v_offer.currency
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'purchase',
      result_entity_id = v_purchase_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.creator_accept_offer(uuid,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_accept_offer(uuid,uuid,uuid,uuid) to service_role;

comment on function pci_api.creator_accept_offer(uuid,uuid,uuid,uuid) is
  'Atomically accepts one live Protocol offer and creates Purchase + base Payable + pending Rights Grant(s). No accepted offer can exist without its purchase commitment and debt.';
