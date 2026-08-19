-- Protocol Creative Insights (PCI)
-- Phase 1N.7 frontend support: Creator-safe payment ledger projections.
-- PostgreSQL remains authoritative for confirmed / inflight / remaining amounts.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_payables(
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
      'payable_id', py.payable_id,
      'purchase_id', py.purchase_id,
      'concept_type', py.concept_type,
      'currency', py.currency,
      'amount_due', py.amount_due,
      'status', py.status,
      'confirmed_amount', coalesce(amounts.confirmed_amount, 0),
      'inflight_amount', coalesce(amounts.inflight_amount, 0),
      'unpaid_amount', greatest(py.amount_due - coalesce(amounts.confirmed_amount, 0), 0),
      'remaining_to_schedule', greatest(py.amount_due - coalesce(amounts.confirmed_amount, 0) - coalesce(amounts.inflight_amount, 0), 0),
      'payment_account_confirmed_at', py.payment_account_confirmed_at,
      'payment_account', case when py.payment_account_id is null then null else jsonb_build_object(
        'payment_account_id', py.payment_account_id,
        'provider', py.payment_account_snapshot->>'provider',
        'account_type', py.payment_account_snapshot->>'account_type',
        'holder_name', py.payment_account_snapshot->>'holder_name',
        'holder_document_masked', py.payment_account_snapshot->>'holder_document_masked',
        'alias', py.payment_account_snapshot->>'alias',
        'account_identifier_last4', py.payment_account_snapshot->>'account_identifier_last4'
      ) end,
      'latest_confirmation', (
        select jsonb_build_object(
          'confirmation_id', pc.confirmation_id,
          'payment_account_id', pc.payment_account_id,
          'confirmed_at', pc.confirmed_at
        )
        from pci.payable_payment_confirmations pc
        where pc.payable_id = py.payable_id
        order by pc.confirmed_at desc, pc.confirmation_id desc
        limit 1
      ),
      'can_confirm_payment_account',
        py.concept_type = 'base_purchase'
        and py.status in ('awaiting_confirmation','ready_to_pay')
        and p.status = 'agreed',
      'due_at', py.due_at,
      'paid_at', py.paid_at,
      'created_at', py.created_at,
      'purchase', jsonb_build_object(
        'purchase_id', p.purchase_id,
        'status', p.status,
        'agreed_at', p.agreed_at,
        'settled_at', p.settled_at
      ),
      'creative', case when oi.submission_id is null then null else jsonb_build_object(
        'submission_id', oi.submission_id,
        'submission_version_id', oi.submission_version_id,
        'version_number', sv.version_number,
        'concept_label', s.concept_label,
        'consignment_title', r.title,
        'consignment_revision_number', r.revision_number,
        'original_filename', coalesce(sv.original_filename, oi.item_terms_snapshot->>'original_filename')
      ) end
    ) as item
    from pci.payables py
    join pci.purchases p
      on p.purchase_id = py.purchase_id
     and p.creator_id = v_creator.creator_id
    left join lateral (
      select
        poi.submission_id,
        poi.submission_version_id,
        poi.item_terms_snapshot
      from pci.purchase_offer_items poi
      where poi.offer_id = p.offer_id
      order by poi.created_at, poi.offer_item_id
      limit 1
    ) oi on true
    left join pci.submissions s on s.submission_id = oi.submission_id
    left join pci.submission_versions sv on sv.submission_version_id = oi.submission_version_id
    left join pci.consignment_participations cp on cp.participation_id = s.participation_id
    left join pci.consignment_revisions r on r.consignment_revision_id = cp.consignment_revision_id
    left join lateral (
      select
        coalesce(sum(pa.amount) filter (where po.status = 'confirmed'), 0)::numeric(14,2) as confirmed_amount,
        coalesce(sum(pa.amount) filter (where po.status = 'initiated'), 0)::numeric(14,2) as inflight_amount
      from pci.payout_allocations pa
      join pci.payouts po on po.payout_id = pa.payout_id
      where pa.payable_id = py.payable_id
    ) amounts on true
    where py.creator_id = v_creator.creator_id
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

create or replace function pci_api.creator_payouts(
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
      'payout_id', po.payout_id,
      'status', po.status,
      'provider', po.provider,
      'method', po.method,
      'currency', po.currency,
      'amount', po.amount,
      'provider_reference', po.provider_reference,
      'transferred_at', po.transferred_at,
      'initiated_at', po.initiated_at,
      'confirmed_at', po.confirmed_at,
      'failed_at', po.failed_at,
      'reversed_at', po.reversed_at,
      'proof_available', po.proof_storage_path is not null,
      'created_at', po.created_at,
      'allocation', case when pa.payout_allocation_id is null then null else jsonb_build_object(
        'payout_allocation_id', pa.payout_allocation_id,
        'payable_id', pa.payable_id,
        'amount', pa.amount,
        'payment_confirmation_id', pa.payment_confirmation_id
      ) end,
      'payable_id', pa.payable_id,
      'purchase_id', py.purchase_id,
      'payment_destination', jsonb_build_object(
        'provider', po.payment_destination_snapshot->>'provider',
        'account_type', po.payment_destination_snapshot->>'account_type',
        'holder_name', po.payment_destination_snapshot->>'holder_name',
        'holder_document_masked', po.payment_destination_snapshot->>'holder_document_masked',
        'alias', po.payment_destination_snapshot->>'alias',
        'account_identifier_last4', po.payment_destination_snapshot->>'account_identifier_last4'
      ),
      'creative', case when oi.submission_id is null then null else jsonb_build_object(
        'submission_id', oi.submission_id,
        'submission_version_id', oi.submission_version_id,
        'version_number', sv.version_number,
        'concept_label', s.concept_label,
        'consignment_title', r.title,
        'original_filename', coalesce(sv.original_filename, oi.item_terms_snapshot->>'original_filename')
      ) end
    ) as item
    from pci.payouts po
    left join lateral (
      select pa.*
      from pci.payout_allocations pa
      where pa.payout_id = po.payout_id
      order by pa.created_at, pa.payout_allocation_id
      limit 1
    ) pa on true
    left join pci.payables py on py.payable_id = pa.payable_id
    left join pci.purchases p on p.purchase_id = py.purchase_id
    left join lateral (
      select
        poi.submission_id,
        poi.submission_version_id,
        poi.item_terms_snapshot
      from pci.purchase_offer_items poi
      where poi.offer_id = p.offer_id
      order by poi.created_at, poi.offer_item_id
      limit 1
    ) oi on true
    left join pci.submissions s on s.submission_id = oi.submission_id
    left join pci.submission_versions sv on sv.submission_version_id = oi.submission_version_id
    left join pci.consignment_participations cp on cp.participation_id = s.participation_id
    left join pci.consignment_revisions r on r.consignment_revision_id = cp.consignment_revision_id
    where po.creator_id = v_creator.creator_id
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

revoke all on function pci_api.creator_payables(uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_payouts(uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_payables(uuid) to service_role;
grant execute on function pci_api.creator_payouts(uuid) to service_role;

comment on function pci_api.creator_payables(uuid) is
  'Creator-safe obligation ledger. Amount breakdown is calculated authoritatively from confirmed/initiated payout allocations; exact payment identifiers remain excluded.';

comment on function pci_api.creator_payouts(uuid) is
  'Creator-safe payout history with masked destination, exact purchased creative context and proof availability. No ciphertext/storage paths are exposed.';
