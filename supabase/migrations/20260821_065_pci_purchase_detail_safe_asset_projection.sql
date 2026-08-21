-- Protocol Creative Insights (PCI)
-- Phase 2.0F.4C follow-up: do not expose raw creative_assets.metadata in normal
-- operator Purchase reads. Runtime metadata contains internal Storage paths/object IDs.
-- The panel receives only the verification facts it actually needs.

create or replace function pci_api.admin_purchase_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_purchase_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_purchase pci.purchases%rowtype;
  v_creator pci.creators%rowtype;
  v_offer pci.purchase_offers%rowtype;
  v_offer_items jsonb;
  v_payables jsonb;
  v_payouts jsonb;
  v_rights jsonb;
  v_assets jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_purchase
  from pci.purchases p
  where p.purchase_id=p_purchase_id and p.workspace_id=p_workspace_id;

  if v_purchase.purchase_id is null then
    raise exception using errcode='P0002',message='pci_purchase_not_found';
  end if;

  select * into v_creator from pci.creators c where c.creator_id=v_purchase.creator_id;
  select * into v_offer from pci.purchase_offers po where po.offer_id=v_purchase.offer_id;

  select coalesce(jsonb_agg(item order by sort_at),'[]'::jsonb)
  into v_offer_items
  from (
    select poi.created_at as sort_at,
      jsonb_build_object(
        'offer_item_id',poi.offer_item_id,
        'submission_id',poi.submission_id,
        'submission_version_id',poi.submission_version_id,
        'amount',poi.amount,
        'item_terms_snapshot',poi.item_terms_snapshot,
        'submission',jsonb_build_object(
          'status',s.status,
          'concept_label',s.concept_label,
          'current_version_id',s.current_version_id
        ),
        'version',jsonb_build_object(
          'version_number',sv.version_number,
          'status',sv.status,
          'rights_clearance_status',sv.rights_clearance_status,
          'original_filename',sv.original_filename,
          'mime_type',sv.mime_type,
          'file_size_bytes',sv.file_size_bytes,
          'duration_seconds',sv.duration_seconds,
          'width',sv.width,
          'height',sv.height,
          'sha256',sv.sha256
        )
      ) as item
    from pci.purchase_offer_items poi
    join pci.submissions s on s.submission_id=poi.submission_id
    join pci.submission_versions sv on sv.submission_version_id=poi.submission_version_id
    where poi.offer_id=v_purchase.offer_id
  ) q;

  select coalesce(jsonb_agg(item order by sort_at),'[]'::jsonb)
  into v_payables
  from (
    select py.created_at as sort_at,
      jsonb_build_object(
        'payable_id',py.payable_id,
        'concept_type',py.concept_type,
        'concept_ref_id',py.concept_ref_id,
        'currency',py.currency,
        'amount_due',py.amount_due,
        'status',py.status,
        'due_at',py.due_at,
        'payment_account_confirmed_at',py.payment_account_confirmed_at,
        'paid_at',py.paid_at,
        'created_at',py.created_at,
        'updated_at',py.updated_at,
        'payment_destination',case when py.payment_account_id is null then null else jsonb_build_object(
          'payment_account_id',py.payment_account_id,
          'provider',py.payment_account_snapshot->>'provider',
          'account_type',py.payment_account_snapshot->>'account_type',
          'holder_name',py.payment_account_snapshot->>'holder_name',
          'holder_document_masked',py.payment_account_snapshot->>'holder_document_masked',
          'alias',py.payment_account_snapshot->>'alias',
          'account_identifier_last4',py.payment_account_snapshot->>'account_identifier_last4'
        ) end
      ) as item
    from pci.payables py
    where py.purchase_id=v_purchase.purchase_id
  ) q;

  select coalesce(jsonb_agg(item order by sort_at),'[]'::jsonb)
  into v_payouts
  from (
    select po.created_at as sort_at,
      jsonb_build_object(
        'payout_id',po.payout_id,
        'status',po.status,
        'provider',po.provider,
        'method',po.method,
        'currency',po.currency,
        'amount',po.amount,
        'provider_reference',po.provider_reference,
        'initiated_at',po.initiated_at,
        'confirmed_at',po.confirmed_at,
        'failed_at',po.failed_at,
        'reversed_at',po.reversed_at,
        'proof_available',po.proof_storage_path is not null,
        'created_at',po.created_at,
        'allocation',jsonb_build_object(
          'payout_allocation_id',pa.payout_allocation_id,
          'payable_id',pa.payable_id,
          'amount',pa.amount,
          'payment_confirmation_id',pa.payment_confirmation_id
        ),
        'payment_destination',jsonb_build_object(
          'provider',po.payment_destination_snapshot->>'provider',
          'account_type',po.payment_destination_snapshot->>'account_type',
          'holder_name',po.payment_destination_snapshot->>'holder_name',
          'holder_document_masked',po.payment_destination_snapshot->>'holder_document_masked',
          'alias',po.payment_destination_snapshot->>'alias',
          'account_identifier_last4',po.payment_destination_snapshot->>'account_identifier_last4'
        )
      ) as item
    from pci.payout_allocations pa
    join pci.payouts po on po.payout_id=pa.payout_id
    join pci.payables py on py.payable_id=pa.payable_id
    where py.purchase_id=v_purchase.purchase_id
  ) q;

  select coalesce(jsonb_agg(item order by sort_at),'[]'::jsonb)
  into v_rights
  from (
    select rg.created_at as sort_at,
      jsonb_build_object(
        'rights_grant_id',rg.rights_grant_id,
        'submission_version_id',rg.submission_version_id,
        'status',rg.status,
        'rights_package_snapshot',rg.rights_package_snapshot,
        'version_sha256_snapshot',rg.version_sha256_snapshot,
        'active_at',rg.active_at,
        'suspended_at',rg.suspended_at,
        'expired_at',rg.expired_at,
        'revoked_at',rg.revoked_at,
        'created_at',rg.created_at
      ) as item
    from pci.rights_grants rg
    where rg.purchase_id=v_purchase.purchase_id
  ) q;

  select coalesce(jsonb_agg(item order by sort_at),'[]'::jsonb)
  into v_assets
  from (
    select ca.created_at as sort_at,
      jsonb_build_object(
        'creative_asset_id',ca.creative_asset_id,
        'rights_grant_id',ca.rights_grant_id,
        'source_submission_id',ca.source_submission_id,
        'source_submission_version_id',ca.source_submission_version_id,
        'status',ca.status,
        'sha256',ca.sha256,
        'provisioned_at',ca.provisioned_at,
        'restricted_at',ca.restricted_at,
        'retired_at',ca.retired_at,
        'created_at',ca.created_at,
        'verification',jsonb_build_object(
          'verification_mode',ca.metadata->>'verification_mode',
          'storage_copy_mode',ca.metadata->>'storage_copy_mode',
          'promotion_verified_at',ca.metadata->>'promotion_verified_at',
          'source_version_number',ca.metadata->>'source_version_number',
          'source_original_filename',ca.metadata->>'source_original_filename',
          'source_file_size_bytes',ca.metadata->>'source_file_size_bytes',
          'destination_size_bytes',ca.metadata->>'destination_size_bytes',
          'destination_mime_type',ca.metadata->>'destination_mime_type',
          'reused_existing_destination',ca.metadata->>'reused_existing_destination'
        )
      ) as item
    from pci.creative_assets ca
    where ca.purchase_id=v_purchase.purchase_id
  ) q;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'purchase',jsonb_build_object(
      'purchase_id',v_purchase.purchase_id,
      'offer_id',v_purchase.offer_id,
      'status',v_purchase.status,
      'currency',v_purchase.currency,
      'total_amount',v_purchase.total_amount,
      'agreed_at',v_purchase.agreed_at,
      'settled_at',v_purchase.settled_at,
      'rescinded_at',v_purchase.rescinded_at,
      'created_at',v_purchase.created_at
    ),
    'creator',jsonb_build_object(
      'creator_id',v_creator.creator_id,
      'display_name',v_creator.display_name,
      'legal_name',v_creator.legal_name,
      'email',v_creator.email,
      'status',v_creator.status
    ),
    'offer',jsonb_build_object(
      'offer_id',v_offer.offer_id,
      'negotiation_id',v_offer.negotiation_id,
      'parent_offer_id',v_offer.parent_offer_id,
      'proposed_by_type',v_offer.proposed_by_type,
      'status',v_offer.status,
      'currency',v_offer.currency,
      'total_amount',v_offer.total_amount,
      'rights_package_snapshot',v_offer.rights_package_snapshot,
      'payment_terms_snapshot',v_offer.payment_terms_snapshot,
      'bonus_terms_snapshot',v_offer.bonus_terms_snapshot,
      'commercial_terms_snapshot',v_offer.commercial_terms_snapshot,
      'expires_at',v_offer.expires_at,
      'sent_at',v_offer.sent_at,
      'accepted_at',v_offer.accepted_at,
      'rejected_at',v_offer.rejected_at,
      'withdrawn_at',v_offer.withdrawn_at,
      'created_at',v_offer.created_at,
      'items',v_offer_items
    ),
    'payables',v_payables,
    'payouts',v_payouts,
    'rights',v_rights,
    'assets',v_assets
  );
end;
$$;

comment on function pci_api.admin_purchase_detail(uuid,text,uuid) is
  'Aggregated Purchase lifecycle projection. Asset metadata is allowlisted; internal Storage paths/object IDs and exact payment identifiers/ciphertext are excluded.';
