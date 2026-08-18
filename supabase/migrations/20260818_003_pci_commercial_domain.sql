-- Protocol Creative Insights (PCI)
-- Phase 1F commercial domain: review, negotiation, offers, purchases, rights and payouts.
-- Intentionally stored in Git only; not applied to production yet.

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

create index pci_submission_reviews_submission_idx
  on pci.submission_reviews (submission_id, created_at desc);

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

create index pci_negotiations_workspace_status_idx
  on pci.negotiations (workspace_id, status, opened_at desc);
create index pci_negotiations_creator_idx
  on pci.negotiations (creator_id, opened_at desc);

create table pci.messages (
  message_id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references pci.negotiations(negotiation_id) on delete restrict,
  sender_type text not null check (sender_type in ('creator','operator','system')),
  sender_user_id uuid null references auth.users(id) on delete set null,
  sender_creator_id uuid null references pci.creators(creator_id) on delete set null,
  body text not null check (length(btrim(body)) > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index pci_messages_negotiation_idx
  on pci.messages (negotiation_id, created_at);

create table pci.internal_notes (
  internal_note_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  submission_id uuid null references pci.submissions(submission_id) on delete restrict,
  negotiation_id uuid null references pci.negotiations(negotiation_id) on delete restrict,
  body text not null check (length(btrim(body)) > 0),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (submission_id is not null or negotiation_id is not null)
);

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

create index pci_purchase_offers_negotiation_idx
  on pci.purchase_offers (negotiation_id, created_at desc);
create index pci_purchase_offers_creator_status_idx
  on pci.purchase_offers (creator_id, status, created_at desc);

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

create index pci_purchases_workspace_idx
  on pci.purchases (workspace_id, agreed_at desc);
create index pci_purchases_creator_idx
  on pci.purchases (creator_id, agreed_at desc);

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

create index pci_creative_assets_workspace_status_idx
  on pci.creative_assets (workspace_id, status, created_at desc);

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

create unique index pci_payables_base_purchase_uidx
  on pci.payables (purchase_id)
  where concept_type = 'base_purchase';
create index pci_payables_workspace_status_idx
  on pci.payables (workspace_id, status, created_at desc);
create index pci_payables_creator_status_idx
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

-- RLS on every commercial-domain table; no anon/authenticated policies.
alter table pci.submission_reviews enable row level security;
alter table pci.negotiations enable row level security;
alter table pci.messages enable row level security;
alter table pci.internal_notes enable row level security;
alter table pci.purchase_offers enable row level security;
alter table pci.purchase_offer_items enable row level security;
alter table pci.purchases enable row level security;
alter table pci.rights_grants enable row level security;
alter table pci.creative_assets enable row level security;
alter table pci.payables enable row level security;
alter table pci.payouts enable row level security;
alter table pci.payout_allocations enable row level security;
alter table pci.disputes enable row level security;

grant all privileges on all tables in schema pci to service_role;
grant all privileges on all sequences in schema pci to service_role;

create trigger pci_negotiations_touch_updated_at
before update on pci.negotiations
for each row execute function pci.touch_updated_at();

create trigger pci_payables_touch_updated_at
before update on pci.payables
for each row execute function pci.touch_updated_at();

-- Sent/terminal offers are commercial snapshots. Draft is editable; sent onward is immutable.
create or replace function pci.guard_purchase_offer_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    if new.offer_id is distinct from old.offer_id
       or new.workspace_id is distinct from old.workspace_id
       or new.negotiation_id is distinct from old.negotiation_id
       or new.creator_id is distinct from old.creator_id
       or new.parent_offer_id is distinct from old.parent_offer_id
       or new.proposed_by_type is distinct from old.proposed_by_type
       or new.currency is distinct from old.currency
       or new.total_amount is distinct from old.total_amount
       or new.rights_package_snapshot is distinct from old.rights_package_snapshot
       or new.payment_terms_snapshot is distinct from old.payment_terms_snapshot
       or new.bonus_terms_snapshot is distinct from old.bonus_terms_snapshot
       or new.commercial_terms_snapshot is distinct from old.commercial_terms_snapshot
       or new.expires_at is distinct from old.expires_at
       or new.sent_at is distinct from old.sent_at
       or new.created_by_user_id is distinct from old.created_by_user_id
       or new.created_by_creator_id is distinct from old.created_by_creator_id
       or new.created_at is distinct from old.created_at
    then
      raise exception using errcode = '23514', message = 'pci_sent_offer_snapshot_immutable';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_purchase_offer_snapshot() from public, anon, authenticated;
grant execute on function pci.guard_purchase_offer_snapshot() to service_role;

create trigger pci_purchase_offers_snapshot_guard
before update on pci.purchase_offers
for each row execute function pci.guard_purchase_offer_snapshot();

-- Reviews and offer items are historical records: append only.
create trigger pci_submission_reviews_append_only
before update or delete on pci.submission_reviews
for each row execute function pci.guard_append_only();

create trigger pci_purchase_offer_items_append_only
before update or delete on pci.purchase_offer_items
for each row execute function pci.guard_append_only();

comment on table pci.internal_notes is 'Protocol-only notes. Never returned by creator-facing read models.';
comment on table pci.payables is 'Independent financial obligations; bonuses never mutate base purchase amount.';
comment on table pci.rights_grants is 'Rights attach to an exact immutable submission version and activate after required payment.';
comment on table pci.creative_assets is 'Protocol-usable asset projection; never sourced directly from an unacquired submission.';
