-- Protocol Creative Insights (PCI)
-- Phase 2.0F.4C: aggregated Purchase and Creator operator projections.
--
-- These are read-only service-role RPCs for pci-admin-api.
-- Exact payment identifiers and ciphertext are intentionally excluded.

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
        'metadata',ca.metadata,
        'provisioned_at',ca.provisioned_at,
        'restricted_at',ca.restricted_at,
        'retired_at',ca.retired_at,
        'created_at',ca.created_at
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

create or replace function pci_api.admin_creators(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_relationship_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text:=nullif(lower(btrim(coalesce(p_relationship_status,''))),'');
  v_items jsonb;
  v_total bigint;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  if v_status is not null and v_status not in ('invited','active','restricted','suspended','closed') then
    raise exception using errcode='22023',message='pci_workspace_creator_status_invalid';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 then
    raise exception using errcode='22023',message='pci_pagination_invalid';
  end if;

  select count(*) into v_total
  from pci.workspace_creators wc
  where wc.workspace_id=p_workspace_id
    and (v_status is null or wc.status=v_status);

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_items
  from (
    select wc.updated_at as sort_at,
      jsonb_build_object(
        'creator_id',cr.creator_id,
        'display_name',cr.display_name,
        'legal_name',cr.legal_name,
        'email',cr.email,
        'phone',cr.phone,
        'creator_status',cr.status,
        'profile_metadata',cr.profile_metadata,
        'relationship',jsonb_build_object(
          'workspace_creator_id',wc.workspace_creator_id,
          'status',wc.status,
          'provider_tier',wc.provider_tier,
          'specialty_tags',wc.specialty_tags,
          'max_simultaneous_jobs',wc.max_simultaneous_jobs,
          'max_open_obligations',wc.max_open_obligations,
          'activated_at',wc.activated_at,
          'created_at',wc.created_at,
          'updated_at',wc.updated_at
        ),
        'counts',jsonb_build_object(
          'submissions',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.creator_id=cr.creator_id),
          'preselected',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.creator_id=cr.creator_id and s.status='preselected'),
          'acquired',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.creator_id=cr.creator_id and s.status='acquired'),
          'negotiations_open',(select count(*) from pci.negotiations n where n.workspace_id=p_workspace_id and n.creator_id=cr.creator_id and n.status='open'),
          'purchases',(select count(*) from pci.purchases p where p.workspace_id=p_workspace_id and p.creator_id=cr.creator_id)
        ),
        'financial',jsonb_build_object(
          'pending_amount',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.creator_id=cr.creator_id and py.status in ('awaiting_confirmation','ready_to_pay','processing')),0),
          'paid_amount',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.creator_id=cr.creator_id and py.status='paid'),0)
        )
      ) as item
    from pci.workspace_creators wc
    join pci.creators cr on cr.creator_id=wc.creator_id
    where wc.workspace_id=p_workspace_id
      and (v_status is null or wc.status=v_status)
    order by wc.updated_at desc
    limit p_limit offset p_offset
  ) q;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'relationship_status_filter',v_status,
    'total',v_total,
    'limit',p_limit,
    'offset',p_offset,
    'items',v_items
  );
end;
$$;

create or replace function pci_api.admin_creator_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_creator_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_submissions jsonb;
  v_negotiations jsonb;
  v_purchases jsonb;
  v_payables jsonb;
  v_payouts jsonb;
  v_invitations jsonb;
  v_legal_acceptance_count bigint;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_relationship
  from pci.workspace_creators wc
  where wc.workspace_id=p_workspace_id and wc.creator_id=p_creator_id;

  if v_relationship.workspace_creator_id is null then
    raise exception using errcode='P0002',message='pci_workspace_creator_not_found';
  end if;

  select * into v_creator from pci.creators cr where cr.creator_id=p_creator_id;

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_submissions
  from (
    select coalesce(s.submitted_at,s.created_at) as sort_at,
      jsonb_build_object(
        'submission_id',s.submission_id,
        'status',s.status,
        'concept_label',s.concept_label,
        'current_version_id',s.current_version_id,
        'submitted_at',s.submitted_at,
        'acquired_at',s.acquired_at,
        'created_at',s.created_at,
        'consignment',jsonb_build_object(
          'consignment_id',s.consignment_id,
          'consignment_revision_id',r.consignment_revision_id,
          'revision_number',r.revision_number,
          'title',r.title
        )
      ) as item
    from pci.submissions s
    join pci.consignment_participations cp on cp.participation_id=s.participation_id
    join pci.consignment_revisions r on r.consignment_revision_id=cp.consignment_revision_id
    where s.workspace_id=p_workspace_id and s.creator_id=p_creator_id
    order by coalesce(s.submitted_at,s.created_at) desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_negotiations
  from (
    select n.updated_at as sort_at,
      jsonb_build_object(
        'negotiation_id',n.negotiation_id,
        'submission_id',n.submission_id,
        'status',n.status,
        'opened_at',n.opened_at,
        'closed_at',n.closed_at,
        'close_reason',n.close_reason,
        'updated_at',n.updated_at,
        'live_offer',(
          select jsonb_build_object(
            'offer_id',po.offer_id,
            'proposed_by_type',po.proposed_by_type,
            'currency',po.currency,
            'total_amount',po.total_amount,
            'expires_at',po.expires_at,
            'sent_at',po.sent_at
          )
          from pci.purchase_offers po
          where po.negotiation_id=n.negotiation_id and po.status='sent'
          limit 1
        )
      ) as item
    from pci.negotiations n
    where n.workspace_id=p_workspace_id and n.creator_id=p_creator_id
    order by n.updated_at desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_purchases
  from (
    select p.agreed_at as sort_at,
      jsonb_build_object(
        'purchase_id',p.purchase_id,
        'offer_id',p.offer_id,
        'status',p.status,
        'currency',p.currency,
        'total_amount',p.total_amount,
        'agreed_at',p.agreed_at,
        'settled_at',p.settled_at,
        'created_at',p.created_at
      ) as item
    from pci.purchases p
    where p.workspace_id=p_workspace_id and p.creator_id=p_creator_id
    order by p.agreed_at desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_payables
  from (
    select py.created_at as sort_at,
      jsonb_build_object(
        'payable_id',py.payable_id,
        'purchase_id',py.purchase_id,
        'concept_type',py.concept_type,
        'currency',py.currency,
        'amount_due',py.amount_due,
        'status',py.status,
        'due_at',py.due_at,
        'payment_account_confirmed_at',py.payment_account_confirmed_at,
        'paid_at',py.paid_at,
        'created_at',py.created_at,
        'payment_destination',case when py.payment_account_id is null then null else jsonb_build_object(
          'provider',py.payment_account_snapshot->>'provider',
          'account_type',py.payment_account_snapshot->>'account_type',
          'holder_name',py.payment_account_snapshot->>'holder_name',
          'holder_document_masked',py.payment_account_snapshot->>'holder_document_masked',
          'alias',py.payment_account_snapshot->>'alias',
          'account_identifier_last4',py.payment_account_snapshot->>'account_identifier_last4'
        ) end
      ) as item
    from pci.payables py
    where py.workspace_id=p_workspace_id and py.creator_id=p_creator_id
    order by py.created_at desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
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
        'confirmed_at',po.confirmed_at,
        'failed_at',po.failed_at,
        'reversed_at',po.reversed_at,
        'proof_available',po.proof_storage_path is not null,
        'created_at',po.created_at
      ) as item
    from pci.payouts po
    where po.workspace_id=p_workspace_id and po.creator_id=p_creator_id
    order by po.created_at desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)
  into v_invitations
  from (
    select ci.created_at as sort_at,
      jsonb_build_object(
        'invitation_id',ci.invitation_id,
        'status',ci.status,
        'email_snapshot',ci.email_snapshot,
        'delivery_status',ci.delivery_status,
        'delivery_method',ci.delivery_method,
        'expires_at',ci.expires_at,
        'accepted_at',ci.accepted_at,
        'revoked_at',ci.revoked_at,
        'delivered_at',ci.delivered_at,
        'delivery_failed_at',ci.delivery_failed_at,
        'delivery_error_code',ci.delivery_error_code,
        'revoked_reason',ci.revoked_reason,
        'created_at',ci.created_at
      ) as item
    from pci.creator_invitations ci
    where ci.workspace_id=p_workspace_id and ci.creator_id=p_creator_id
    order by ci.created_at desc
    limit 50
  ) q;

  select count(*) into v_legal_acceptance_count
  from pci.creator_legal_acceptances cla
  where cla.creator_id=p_creator_id and cla.workspace_id=p_workspace_id;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'creator',jsonb_build_object(
      'creator_id',v_creator.creator_id,
      'display_name',v_creator.display_name,
      'legal_name',v_creator.legal_name,
      'email',v_creator.email,
      'phone',v_creator.phone,
      'status',v_creator.status,
      'profile_metadata',v_creator.profile_metadata,
      'created_at',v_creator.created_at,
      'updated_at',v_creator.updated_at,
      'closed_at',v_creator.closed_at
    ),
    'relationship',jsonb_build_object(
      'workspace_creator_id',v_relationship.workspace_creator_id,
      'status',v_relationship.status,
      'provider_tier',v_relationship.provider_tier,
      'specialty_tags',v_relationship.specialty_tags,
      'max_simultaneous_jobs',v_relationship.max_simultaneous_jobs,
      'max_open_obligations',v_relationship.max_open_obligations,
      'activated_at',v_relationship.activated_at,
      'closed_at',v_relationship.closed_at,
      'created_at',v_relationship.created_at,
      'updated_at',v_relationship.updated_at
    ),
    'counts',jsonb_build_object(
      'submissions',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.creator_id=p_creator_id),
      'preselected',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.creator_id=p_creator_id and s.status='preselected'),
      'acquired',(select count(*) from pci.submissions s where s.workspace_id=p_workspace_id and s.creator_id=p_creator_id and s.status='acquired'),
      'negotiations_open',(select count(*) from pci.negotiations n where n.workspace_id=p_workspace_id and n.creator_id=p_creator_id and n.status='open'),
      'purchases',(select count(*) from pci.purchases p where p.workspace_id=p_workspace_id and p.creator_id=p_creator_id),
      'legal_acceptances',v_legal_acceptance_count
    ),
    'financial',jsonb_build_object(
      'pending_amount',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.creator_id=p_creator_id and py.status in ('awaiting_confirmation','ready_to_pay','processing')),0),
      'paid_amount',coalesce((select sum(py.amount_due) from pci.payables py where py.workspace_id=p_workspace_id and py.creator_id=p_creator_id and py.status='paid'),0)
    ),
    'submissions',v_submissions,
    'negotiations',v_negotiations,
    'purchases',v_purchases,
    'payables',v_payables,
    'payouts',v_payouts,
    'invitations',v_invitations
  );
end;
$$;

revoke all on function pci_api.admin_purchase_detail(uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_creators(uuid,text,text,integer,integer) from public,anon,authenticated;
revoke all on function pci_api.admin_creator_detail(uuid,text,uuid) from public,anon,authenticated;

grant execute on function pci_api.admin_purchase_detail(uuid,text,uuid) to service_role;
grant execute on function pci_api.admin_creators(uuid,text,text,integer,integer) to service_role;
grant execute on function pci_api.admin_creator_detail(uuid,text,uuid) to service_role;

comment on function pci_api.admin_purchase_detail(uuid,text,uuid) is
  'Aggregated Purchase lifecycle projection: offer/items, payables, payouts, Rights and Assets. Exact payment identifiers/ciphertext are excluded.';
comment on function pci_api.admin_creators(uuid,text,text,integer,integer) is
  'Paginated Protocol operator Creator roster scoped to the workspace relationship, with operational and financial aggregates only.';
comment on function pci_api.admin_creator_detail(uuid,text,uuid) is
  'Protocol operator Creator dossier scoped to one workspace. Includes lifecycle history but excludes exact payment identifiers and ciphertext.';
