-- Protocol Creative Insights (PCI)
-- Phase 1F foundation schema
-- This migration is intentionally NOT applied to production yet.

create schema if not exists pci;
create schema if not exists pci_api;

revoke all on schema pci from public, anon, authenticated;
revoke all on schema pci_api from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Shared helper domains
-- -----------------------------------------------------------------------------

create table pci.creators (
  creator_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid null references auth.users(id) on delete set null,
  display_name text not null,
  legal_name text null,
  email text not null,
  phone text null,
  status text not null default 'pending'
    check (status in ('pending','active','restricted','suspended','closed')),
  profile_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz null,
  unique (auth_user_id)
);

create unique index pci_creators_email_lower_uidx
  on pci.creators (lower(email));

create table pci.workspace_creators (
  workspace_creator_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  status text not null default 'invited'
    check (status in ('invited','active','restricted','suspended','closed')),
  provider_tier text null
    check (provider_tier is null or provider_tier in ('approved','preferred')),
  specialty_tags text[] not null default '{}'::text[],
  max_simultaneous_jobs integer null check (max_simultaneous_jobs is null or max_simultaneous_jobs > 0),
  max_open_obligations integer null check (max_open_obligations is null or max_open_obligations > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz null,
  closed_at timestamptz null,
  unique (workspace_id, creator_id)
);

create table pci.creator_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  email_snapshot text not null,
  token_hash text not null,
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create table pci.creator_legal_acceptances (
  legal_acceptance_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  document_type text not null,
  document_version text not null,
  document_hash text null,
  accepted_from_ip inet null,
  accepted_user_agent text null,
  accepted_at timestamptz not null default now(),
  unique (creator_id, document_type, document_version)
);

create table pci.creator_payment_accounts (
  payment_account_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  provider text not null,
  account_type text not null default 'transfer',
  holder_name text not null,
  holder_document_masked text null,
  alias text null,
  account_identifier_ciphertext text null,
  account_identifier_last4 text null,
  status text not null default 'active'
    check (status in ('active','inactive','verification_required')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz null
);

-- -----------------------------------------------------------------------------
-- Consignments and participation
-- -----------------------------------------------------------------------------

create table pci.consignments (
  consignment_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','open','paused','closed','cancelled','archived')),
  visibility text not null default 'open'
    check (visibility in ('open','invite_only')),
  current_revision_id uuid null,
  max_submissions_per_creator integer null check (max_submissions_per_creator is null or max_submissions_per_creator > 0),
  max_versions_per_submission integer null check (max_versions_per_submission is null or max_versions_per_submission > 0),
  opens_at timestamptz null,
  closes_at timestamptz null,
  cancelled_reason text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  closed_at timestamptz null,
  archived_at timestamptz null
);

create index pci_consignments_workspace_status_idx
  on pci.consignments (workspace_id, status, created_at desc);

create table pci.consignment_revisions (
  consignment_revision_id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references pci.consignments(consignment_id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft'
    check (status in ('draft','published','superseded')),
  title text not null,
  summary text null,
  objective text null,
  creative_angle text null,
  hook_guidance text null,
  format_requirements jsonb not null default '{}'::jsonb,
  acceptance_criteria jsonb not null default '{}'::jsonb,
  subject_type text null,
  subject_ref text null,
  subject_snapshot jsonb not null default '{}'::jsonb,
  base_price_amount numeric(14,2) null check (base_price_amount is null or base_price_amount >= 0),
  currency text not null default 'ARS',
  slots_available integer null check (slots_available is null or slots_available > 0),
  performance_bonus_policy jsonb not null default '{}'::jsonb,
  pre_purchase_revision_limit integer null check (pre_purchase_revision_limit is null or pre_purchase_revision_limit >= 0),
  rights_package_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz null,
  superseded_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (consignment_id, revision_number)
);

alter table pci.consignments
  add constraint pci_consignments_current_revision_fkey
  foreign key (current_revision_id)
  references pci.consignment_revisions(consignment_revision_id)
  on delete restrict;

create table pci.consignment_participations (
  participation_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  consignment_id uuid not null references pci.consignments(consignment_id) on delete restrict,
  consignment_revision_id uuid not null references pci.consignment_revisions(consignment_revision_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  status text not null default 'active'
    check (status in ('invited','active','declined','withdrawn')),
  joined_at timestamptz null,
  declined_at timestamptz null,
  withdrawn_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (consignment_id, creator_id)
);

-- -----------------------------------------------------------------------------
-- Submissions, files, review and negotiation
-- -----------------------------------------------------------------------------

create table pci.submissions (
  submission_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  consignment_id uuid not null references pci.consignments(consignment_id) on delete restrict,
  participation_id uuid not null references pci.consignment_participations(participation_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','submitted','under_review','changes_requested','preselected','rejected','withdrawn','acquired')),
  concept_label text null,
  concept_metadata jsonb not null default '{}'::jsonb,
  current_version_id uuid null,
  submitted_at timestamptz null,
  rejected_at timestamptz null,
  withdrawn_at timestamptz null,
  acquired_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pci_submissions_workspace_status_idx
  on pci.submissions (workspace_id, status, created_at desc);
create index pci_submissions_creator_idx
  on pci.submissions (creator_id, created_at desc);

create table pci.submission_versions (
  submission_version_id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references pci.submissions(submission_id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status text not null default 'uploading'
    check (status in ('uploading','processing','invalid','ready')),
  rights_clearance_status text not null default 'pending'
    check (rights_clearance_status in ('pending','complete','flagged')),
  storage_bucket text null,
  storage_path text null,
  original_filename text null,
  mime_type text null,
  file_size_bytes bigint null check (file_size_bytes is null or file_size_bytes >= 0),
  duration_seconds numeric(10,3) null check (duration_seconds is null or duration_seconds >= 0),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  sha256 text null,
  technical_validation jsonb not null default '{}'::jsonb,
  rights_declaration jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz null,
  finalized_at timestamptz null,
  invalid_reason text null,
  created_at timestamptz not null default now(),
  unique (submission_id, version_number),
  unique (storage_bucket, storage_path)
);

alter table pci.submissions
  add constraint pci_submissions_current_version_fkey
  foreign key (current_version_id)
  references pci.submission_versions(submission_version_id)
  on delete restrict;

create table pci.submission_reviews (
  review_id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references pci.submissions(submission_id) on delete restrict,
  submission_version_id uuid not null references pci.submission_versions(submission_version_id) on delete restrict,
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  decision text not null
    check (decision in ('changes_requested','preselected','rejected','review_note')),
  rejection_reason_code text null,
  internal_summary text null,
  creator_feedback text null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table pci.negotiations (
  negotiation_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  submission_id uuid not null references pci.submissions(submission_id) on delete restrict,
  status text not null default 'open'
    check (status in ('open','closed')),
  opened_by uuid null references auth.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  close_reason text null,
  updated_at timestamptz not null default now()
);

create table pci.messages (
  message_id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references pci.negotiations(negotiation_id) on delete restrict,
  sender_type text not null check (sender_type in ('creator','operator','system')),
  sender_user_id uuid null references auth.users(id) on delete set null,
  sender_creator_id uuid null references pci.creators(creator_id) on delete set null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table pci.internal_notes (
  internal_note_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  submission_id uuid null references pci.submissions(submission_id) on delete restrict,
  negotiation_id uuid null references pci.negotiations(negotiation_id) on delete restrict,
  body text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Commercial offer, purchase and rights
-- -----------------------------------------------------------------------------

create table pci.purchase_offers (
  offer_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  negotiation_id uuid not null references pci.negotiations(negotiation_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  parent_offer_id uuid null references pci.purchase_offers(offer_id) on delete restrict,
  proposed_by_type text not null check (proposed_by_type in ('workspace','creator')),
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','superseded','withdrawn','expired','rejected_by_withdrawal')),
  currency text not null default 'ARS',
  total_amount numeric(14,2) not null check (total_amount >= 0),
  rights_package_snapshot jsonb not null default '{}'::jsonb,
  payment_terms_snapshot jsonb not null default '{}'::jsonb,
  bonus_terms_snapshot jsonb not null default '{}'::jsonb,
  commercial_terms_snapshot jsonb not null default '{}'::jsonb,
  expires_at timestamptz null,
  sent_at timestamptz null,
  accepted_at timestamptz null,
  rejected_at timestamptz null,
  withdrawn_at timestamptz null,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  created_by_creator_id uuid null references pci.creators(creator_id) on delete set null,
  created_at timestamptz not null default now()
);

create table pci.purchase_offer_items (
  offer_item_id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references pci.purchase_offers(offer_id) on delete restrict,
  submission_id uuid not null references pci.submissions(submission_id) on delete restrict,
  submission_version_id uuid not null references pci.submission_versions(submission_version_id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  item_terms_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (offer_id, submission_version_id)
);

create table pci.purchases (
  purchase_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  offer_id uuid not null references pci.purchase_offers(offer_id) on delete restrict,
  status text not null default 'agreed'
    check (status in ('agreed','settled','in_dispute','rescinded')),
  currency text not null,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  agreed_at timestamptz not null default now(),
  settled_at timestamptz null,
  rescinded_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (offer_id)
);

create table pci.rights_grants (
  rights_grant_id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references pci.purchases(purchase_id) on delete restrict,
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  submission_version_id uuid not null references pci.submission_versions(submission_version_id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','active','suspended','expired','revoked')),
  rights_package_snapshot jsonb not null default '{}'::jsonb,
  version_sha256_snapshot text not null,
  active_at timestamptz null,
  suspended_at timestamptz null,
  expired_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (purchase_id, submission_version_id)
);

create table pci.creative_assets (
  creative_asset_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  purchase_id uuid not null references pci.purchases(purchase_id) on delete restrict,
  rights_grant_id uuid not null references pci.rights_grants(rights_grant_id) on delete restrict,
  source_submission_id uuid not null references pci.submissions(submission_id) on delete restrict,
  source_submission_version_id uuid not null references pci.submission_versions(submission_version_id) on delete restrict,
  status text not null default 'provisioning'
    check (status in ('provisioning','available','restricted','retired','failed')),
  storage_bucket text null,
  storage_path text null,
  sha256 text not null,
  metadata jsonb not null default '{}'::jsonb,
  provisioned_at timestamptz null,
  restricted_at timestamptz null,
  retired_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (rights_grant_id),
  unique (workspace_id, source_submission_version_id)
);

-- -----------------------------------------------------------------------------
-- Financial ledger
-- -----------------------------------------------------------------------------

create table pci.payables (
  payable_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  purchase_id uuid null references pci.purchases(purchase_id) on delete restrict,
  concept_type text not null
    check (concept_type in ('base_purchase','paid_revision','performance_bonus','extraordinary_reward','adjustment')),
  concept_ref_id uuid null,
  currency text not null default 'ARS',
  amount_due numeric(14,2) not null check (amount_due >= 0),
  status text not null default 'awaiting_confirmation'
    check (status in ('awaiting_confirmation','ready_to_pay','processing','paid','failed','in_incident','voided')),
  payment_account_id uuid null references pci.creator_payment_accounts(payment_account_id) on delete restrict,
  payment_account_snapshot jsonb not null default '{}'::jsonb,
  payment_account_confirmed_at timestamptz null,
  due_at timestamptz null,
  paid_at timestamptz null,
  void_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pci_payables_workspace_status_idx
  on pci.payables (workspace_id, status, created_at desc);
create index pci_payables_creator_idx
  on pci.payables (creator_id, status, created_at desc);

create table pci.payouts (
  payout_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  status text not null default 'initiated'
    check (status in ('initiated','confirmed','failed','reversed')),
  provider text not null,
  method text not null,
  currency text not null default 'ARS',
  amount numeric(14,2) not null check (amount > 0),
  provider_reference text null,
  payment_destination_snapshot jsonb not null default '{}'::jsonb,
  proof_storage_bucket text null,
  proof_storage_path text null,
  initiated_at timestamptz not null default now(),
  confirmed_at timestamptz null,
  failed_at timestamptz null,
  reversed_at timestamptz null,
  registered_by uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table pci.payout_allocations (
  payout_allocation_id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references pci.payouts(payout_id) on delete restrict,
  payable_id uuid not null references pci.payables(payable_id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payout_id, payable_id)
);

-- -----------------------------------------------------------------------------
-- Disputes and immutable operational history
-- -----------------------------------------------------------------------------

create table pci.disputes (
  dispute_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid null references pci.creators(creator_id) on delete restrict,
  category text not null,
  status text not null default 'open'
    check (status in ('open','under_review','awaiting_information','resolved')),
  subject_type text not null,
  subject_id uuid null,
  reason_code text not null,
  description text null,
  resolution text null,
  opened_by_type text not null check (opened_by_type in ('creator','operator','system')),
  opened_by_user_id uuid null references auth.users(id) on delete set null,
  opened_by_creator_id uuid null references pci.creators(creator_id) on delete set null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table pci.events (
  event_id uuid primary key default gen_random_uuid(),
  workspace_id text null,
  actor_type text not null check (actor_type in ('creator','operator','system','worker')),
  actor_user_id uuid null,
  actor_creator_id uuid null,
  entity_type text not null,
  entity_id uuid null,
  event_type text not null,
  old_state text null,
  new_state text null,
  request_id uuid null,
  command_receipt_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index pci_events_entity_idx
  on pci.events (entity_type, entity_id, created_at);
create index pci_events_workspace_idx
  on pci.events (workspace_id, created_at desc);
create index pci_events_request_idx
  on pci.events (request_id)
  where request_id is not null;

create table pci.command_receipts (
  command_receipt_id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  actor_type text not null check (actor_type in ('creator','operator','system','worker')),
  actor_user_id uuid null,
  actor_creator_id uuid null,
  workspace_id text null,
  command_name text not null,
  request_id uuid not null,
  status text not null default 'processing'
    check (status in ('processing','completed','failed')),
  result_entity_type text null,
  result_entity_id uuid null,
  response_snapshot jsonb not null default '{}'::jsonb,
  error_code text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (actor_type, coalesce(actor_user_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(actor_creator_id, '00000000-0000-0000-0000-000000000000'::uuid), command_name, idempotency_key)
);

create table pci.outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  workspace_id text null,
  job_type text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  entity_type text null,
  entity_id uuid null,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  last_error_code text null,
  last_error_message text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index pci_outbox_ready_idx
  on pci.outbox (status, available_at)
  where status in ('pending','failed');

-- -----------------------------------------------------------------------------
-- Comments: domain intent
-- -----------------------------------------------------------------------------

comment on schema pci is 'Private authoritative domain for Protocol Creative Insights.';
comment on schema pci_api is 'Minimal command/query surface used by authenticated PCI Edge Functions.';
comment on table pci.events is 'Append-only PCI business/audit event log.';
comment on table pci.command_receipts is 'Idempotency and command execution receipts for PCI mutations.';
comment on table pci.outbox is 'Transactional outbox for non-transactional side effects such as Storage promotion and notifications.';
comment on table pci.creative_assets is 'Only rights-active purchased creatives may become Protocol-usable assets.';
