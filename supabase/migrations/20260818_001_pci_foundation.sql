-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Backend foundation
--
-- IMPORTANT:
--   This migration is intentionally committed to a Git feature branch first.
--   Do not apply directly to production before validating it in an isolated
--   Supabase environment.
--
-- Design principles implemented here:
--   * Workspace-first ownership.
--   * Creator identity is separate from Protocol workspace membership.
--   * Private authoritative schema (`pci`).
--   * No direct anon/authenticated access to PCI tables.
--   * Published briefs and finalized media identities are immutable.
--   * Commercial history is append-only.
--   * Idempotent commands and transactional outbox are first-class objects.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

create schema if not exists pci;
create schema if not exists pci_api;

comment on schema pci is
  'Protocol Creative Insights authoritative private domain. Not intended for direct browser access.';
comment on schema pci_api is
  'Narrow command/query surface used by trusted PCI backend services.';

-- --------------------------------------------------------------------------
-- Security baseline: schemas are closed by default.
-- --------------------------------------------------------------------------

revoke all on schema pci from public;
revoke all on schema pci from anon, authenticated;
revoke all on schema pci_api from public;
revoke all on schema pci_api from anon, authenticated;

grant usage on schema pci to service_role;
grant usage on schema pci_api to service_role;

alter default privileges for role postgres in schema pci
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema pci
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema pci
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema pci_api
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema pci_api
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema pci_api
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema pci
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema pci
  grant usage, select on sequences to service_role;
alter default privileges for role postgres in schema pci
  grant execute on functions to service_role;

alter default privileges for role postgres in schema pci_api
  grant execute on functions to service_role;

-- --------------------------------------------------------------------------
-- Shared helpers.
-- --------------------------------------------------------------------------

create or replace function pci.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function pci.reject_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'pci_events_are_append_only';
end;
$$;

-- --------------------------------------------------------------------------
-- 1. Creator identity and workspace relationship.
-- --------------------------------------------------------------------------

create table pci.creators (
  creator_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,

  email text not null,
  display_name text not null,
  legal_name text,
  phone text,
  country_code text not null default 'AR',

  status text not null default 'pending'
    check (status in ('pending', 'active', 'restricted', 'suspended', 'closed')),

  profile_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index pci_creators_email_uq
  on pci.creators (lower(email));
create index pci_creators_auth_user_idx
  on pci.creators (auth_user_id)
  where auth_user_id is not null;
create index pci_creators_status_idx
  on pci.creators (status);

create trigger trg_pci_creators_touch
before update on pci.creators
for each row execute function pci.touch_updated_at();

create table pci.workspace_creators (
  workspace_creator_id uuid primary key default gen_random_uuid(),
  workspace_id text not null
    references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null
    references pci.creators(creator_id) on delete restrict,

  status text not null default 'invited'
    check (status in ('invited', 'active', 'restricted', 'suspended', 'closed')),

  approved_provider boolean not null default false,
  preferred_provider boolean not null default false,
  specialties text[] not null default '{}'::text[],

  max_simultaneous_jobs integer
    check (max_simultaneous_jobs is null or max_simultaneous_jobs >= 0),
  max_open_obligations integer
    check (max_open_obligations is null or max_open_obligations >= 0),

  restriction_reason text,
  relationship_metadata jsonb not null default '{}'::jsonb,

  invited_at timestamptz,
  activated_at timestamptz,
  restricted_at timestamptz,
  suspended_at timestamptz,
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pci_workspace_creators_workspace_creator_uq
    unique (workspace_id, creator_id),
  constraint pci_workspace_creators_identity_uq
    unique (workspace_creator_id, workspace_id, creator_id)
);

create index pci_workspace_creators_workspace_status_idx
  on pci.workspace_creators (workspace_id, status);
create index pci_workspace_creators_creator_status_idx
  on pci.workspace_creators (creator_id, status);

create trigger trg_pci_workspace_creators_touch
before update on pci.workspace_creators
for each row execute function pci.touch_updated_at();

create table pci.creator_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  workspace_id text not null
    references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null
    references pci.creators(creator_id) on delete restrict,

  invited_email text not null,
  token_hash text unique,
  token_last4 text,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),

  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  accepted_by_auth_user_id uuid references auth.users(id) on delete set null,

  invited_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pci_creator_invitations_lookup_idx
  on pci.creator_invitations (workspace_id, creator_id, status);
create index pci_creator_invitations_email_idx
  on pci.creator_invitations (lower(invited_email), status);

create trigger trg_pci_creator_invitations_touch
before update on pci.creator_invitations
for each row execute function pci.touch_updated_at();

create table pci.creator_legal_acceptances (
  acceptance_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null
    references pci.creators(creator_id) on delete restrict,

  document_type text not null,
  document_version text not null,
  document_hash text,
  acceptance_context jsonb not null default '{}'::jsonb,

  accepted_by_auth_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz not null default now(),

  constraint pci_creator_legal_acceptance_uq
    unique (creator_id, document_type, document_version)
);

-- --------------------------------------------------------------------------
-- 2. Consignments and immutable brief revisions.
-- --------------------------------------------------------------------------

create table pci.consignments (
  consignment_id uuid primary key default gen_random_uuid(),
  workspace_id text not null
    references public.protocol_workspaces(workspace_id) on delete restrict,

  status text not null default 'draft'
    check (status in ('draft', 'open', 'paused', 'closed', 'cancelled', 'archived')),
  visibility text not null default 'open'
    check (visibility in ('open', 'invite_only')),

  current_revision_id uuid,

  max_submissions_per_creator integer not null default 2
    check (max_submissions_per_creator > 0),
  max_versions_per_submission integer
    check (max_versions_per_submission is null or max_versions_per_submission > 0),

  opens_at timestamptz,
  deadline_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  cancellation_reason text,

  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint pci_consignments_workspace_identity_uq
    unique (workspace_id, consignment_id)
);

create index pci_consignments_workspace_status_idx
  on pci.consignments (workspace_id, status, created_at desc);
create index pci_consignments_deadline_idx
  on pci.consignments (deadline_at)
  where deadline_at is not null;

create trigger trg_pci_consignments_touch
before update on pci.consignments
for each row execute function pci.touch_updated_at();

create table pci.consignment_revisions (
  consignment_revision_id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null,
  workspace_id text not null,
  revision_number integer not null check (revision_number > 0),

  status text not null default 'draft'
    check (status in ('draft', 'published', 'superseded')),

  title text not null,
  summary text,
  objective text,
  angle text,
  hook_guidance text,
  deliverable_type text not null default 'video'
    check (deliverable_type in ('video', 'image')),
  aspect_ratio text,
  duration_min_seconds numeric,
  duration_max_seconds numeric,

  subject_type text,
  subject_ref text,
  subject_snapshot jsonb not null default '{}'::jsonb,

  compensation_mode text not null default 'per_asset'
    check (compensation_mode in ('per_asset', 'package', 'negotiated')),
  base_amount numeric(14,2)
    check (base_amount is null or base_amount >= 0),
  currency text not null default 'ARS'
    check (char_length(currency) = 3),
  max_purchasable_assets integer
    check (max_purchasable_assets is null or max_purchasable_assets > 0),

  technical_requirements jsonb not null default '{}'::jsonb,
  acceptance_criteria jsonb not null default '{}'::jsonb,
  rights_package jsonb not null default '{}'::jsonb,
  performance_bonus_terms jsonb not null default '{}'::jsonb,
  commercial_terms jsonb not null default '{}'::jsonb,

  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  superseded_at timestamptz,

  constraint pci_consignment_revisions_consignment_fk
    foreign key (workspace_id, consignment_id)
    references pci.consignments(workspace_id, consignment_id)
    on delete restrict,
  constraint pci_consignment_revisions_number_uq
    unique (consignment_id, revision_number),
  constraint pci_consignment_revisions_identity_uq
    unique (consignment_id, consignment_revision_id),
  constraint pci_consignment_revision_duration_check
    check (
      duration_min_seconds is null
      or duration_max_seconds is null
      or duration_max_seconds >= duration_min_seconds
    )
);

create index pci_consignment_revisions_consignment_idx
  on pci.consignment_revisions (consignment_id, revision_number desc);
create index pci_consignment_revisions_status_idx
  on pci.consignment_revisions (workspace_id, status);

create trigger trg_pci_consignment_revisions_touch
before update on pci.consignment_revisions
for each row execute function pci.touch_updated_at();

alter table pci.consignments
  add constraint pci_consignments_current_revision_fk
  foreign key (consignment_id, current_revision_id)
  references pci.consignment_revisions(consignment_id, consignment_revision_id)
  on delete restrict;

alter table pci.consignments
  add constraint pci_consignments_published_revision_required_check
  check (status in ('draft', 'cancelled') or current_revision_id is not null);

create or replace function pci.guard_published_consignment_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('published', 'superseded') then
    if (to_jsonb(new) - array['status', 'updated_at', 'superseded_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'updated_at', 'superseded_at']) then
      raise exception using
        errcode = 'P0001',
        message = 'published_consignment_revision_is_immutable';
    end if;

    if old.status = 'superseded' and new.status <> 'superseded' then
      raise exception using
        errcode = 'P0001',
        message = 'superseded_consignment_revision_cannot_be_reactivated';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_pci_consignment_revision_immutable
before update on pci.consignment_revisions
for each row execute function pci.guard_published_consignment_revision();

-- --------------------------------------------------------------------------
-- 3. Creator participation bound to a concrete published brief revision.
-- --------------------------------------------------------------------------

create table pci.consignment_participations (
  participation_id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  consignment_id uuid not null,
  consignment_revision_id uuid not null,
  creator_id uuid not null,

  status text not null
    check (status in ('invited', 'active', 'declined', 'withdrawn')),

  joined_at timestamptz,
  invited_at timestamptz,
  declined_at timestamptz,
  withdrawn_at timestamptz,
  withdrawal_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pci_participation_workspace_creator_fk
    foreign key (workspace_id, creator_id)
    references pci.workspace_creators(workspace_id, creator_id)
    on delete restrict,
  constraint pci_participation_consignment_revision_fk
    foreign key (consignment_id, consignment_revision_id)
    references pci.consignment_revisions(consignment_id, consignment_revision_id)
    on delete restrict,
  constraint pci_participation_consignment_workspace_fk
    foreign key (workspace_id, consignment_id)
    references pci.consignments(workspace_id, consignment_id)
    on delete restrict,
  constraint pci_participation_creator_uq
    unique (consignment_id, creator_id),
  constraint pci_participation_identity_uq
    unique (participation_id, workspace_id, consignment_id, creator_id)
);

create index pci_participations_creator_status_idx
  on pci.consignment_participations (creator_id, status, created_at desc);
create index pci_participations_workspace_consignment_idx
  on pci.consignment_participations (workspace_id, consignment_id, status);

create trigger trg_pci_consignment_participations_touch
before update on pci.consignment_participations
for each row execute function pci.touch_updated_at();

-- --------------------------------------------------------------------------
-- 4. Creative submissions and immutable versions.
-- --------------------------------------------------------------------------

create table pci.submissions (
  submission_id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  consignment_id uuid not null,
  participation_id uuid not null,
  creator_id uuid not null,

  status text not null default 'draft'
    check (status in (
      'draft',
      'submitted',
      'under_review',
      'changes_requested',
      'preselected',
      'rejected',
      'withdrawn',
      'acquired'
    )),

  title text,
  concept_label text,
  hook_label text,
  angle_label text,
  creator_note text,
  metadata jsonb not null default '{}'::jsonb,

  submitted_at timestamptz,
  withdrawn_at timestamptz,
  rejected_at timestamptz,
  acquired_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pci_submissions_participation_fk
    foreign key (participation_id, workspace_id, consignment_id, creator_id)
    references pci.consignment_participations(
      participation_id,
      workspace_id,
      consignment_id,
      creator_id
    )
    on delete restrict,
  constraint pci_submissions_workspace_identity_uq
    unique (workspace_id, submission_id),
  constraint pci_submissions_creator_identity_uq
    unique (submission_id, creator_id)
);

create index pci_submissions_review_queue_idx
  on pci.submissions (workspace_id, status, submitted_at desc);
create index pci_submissions_creator_idx
  on pci.submissions (creator_id, status, created_at desc);
create index pci_submissions_consignment_idx
  on pci.submissions (consignment_id, creator_id, created_at desc);

create trigger trg_pci_submissions_touch
before update on pci.submissions
for each row execute function pci.touch_updated_at();

create table pci.submission_versions (
  submission_version_id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  workspace_id text not null,
  creator_id uuid not null,
  version_number integer not null check (version_number > 0),

  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'invalid', 'ready')),
  rights_clearance_status text not null default 'pending'
    check (rights_clearance_status in ('pending', 'complete', 'flagged')),

  storage_bucket text,
  storage_path text,
  original_file_name text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sha256 text,

  duration_seconds numeric,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),

  upload_authorized_at timestamptz,
  upload_token_expires_at timestamptz,
  uploaded_at timestamptz,
  finalized_at timestamptz,
  invalid_reason text,

  rights_declaration_snapshot jsonb not null default '{}'::jsonb,
  technical_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pci_submission_versions_submission_fk
    foreign key (workspace_id, submission_id)
    references pci.submissions(workspace_id, submission_id)
    on delete restrict,
  constraint pci_submission_versions_creator_fk
    foreign key (submission_id, creator_id)
    references pci.submissions(submission_id, creator_id)
    on delete restrict,
  constraint pci_submission_versions_number_uq
    unique (submission_id, version_number),
  constraint pci_submission_versions_identity_uq
    unique (submission_id, submission_version_id)
);

create unique index pci_submission_versions_storage_object_uq
  on pci.submission_versions (storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;
create unique index pci_submission_versions_sha_path_uq
  on pci.submission_versions (submission_version_id, sha256)
  where sha256 is not null;
create index pci_submission_versions_status_idx
  on pci.submission_versions (workspace_id, status, created_at desc);
create index pci_submission_versions_submission_idx
  on pci.submission_versions (submission_id, version_number desc);

create trigger trg_pci_submission_versions_touch
before update on pci.submission_versions
for each row execute function pci.touch_updated_at();

create or replace function pci.guard_finalized_submission_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'ready' then
    if new.status <> 'ready' then
      raise exception using
        errcode = 'P0001',
        message = 'ready_submission_version_status_is_immutable';
    end if;

    if new.submission_id is distinct from old.submission_id
      or new.workspace_id is distinct from old.workspace_id
      or new.creator_id is distinct from old.creator_id
      or new.version_number is distinct from old.version_number
      or new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path
      or new.original_file_name is distinct from old.original_file_name
      or new.mime_type is distinct from old.mime_type
      or new.file_size_bytes is distinct from old.file_size_bytes
      or new.sha256 is distinct from old.sha256
      or new.duration_seconds is distinct from old.duration_seconds
      or new.width is distinct from old.width
      or new.height is distinct from old.height
      or new.uploaded_at is distinct from old.uploaded_at
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using
        errcode = 'P0001',
        message = 'ready_submission_version_file_identity_is_immutable';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_pci_submission_version_immutable
before update on pci.submission_versions
for each row execute function pci.guard_finalized_submission_version();

-- --------------------------------------------------------------------------
-- 5. Negotiation shell. Detailed offer/purchase ledger comes in later slices.
-- --------------------------------------------------------------------------

create table pci.negotiations (
  negotiation_id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  creator_id uuid not null,
  submission_id uuid not null,

  status text not null default 'open'
    check (status in ('open', 'closed')),
  close_reason text,

  opened_by_user_id uuid references auth.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  reopened_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pci_negotiations_submission_fk
    foreign key (workspace_id, submission_id)
    references pci.submissions(workspace_id, submission_id)
    on delete restrict,
  constraint pci_negotiations_creator_fk
    foreign key (submission_id, creator_id)
    references pci.submissions(submission_id, creator_id)
    on delete restrict
);

create index pci_negotiations_workspace_status_idx
  on pci.negotiations (workspace_id, status, opened_at desc);
create index pci_negotiations_creator_status_idx
  on pci.negotiations (creator_id, status, opened_at desc);

create trigger trg_pci_negotiations_touch
before update on pci.negotiations
for each row execute function pci.touch_updated_at();

-- --------------------------------------------------------------------------
-- 6. Idempotent command receipts.
-- --------------------------------------------------------------------------

create table pci.command_receipts (
  command_receipt_id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  request_id uuid not null,

  actor_type text not null
    check (actor_type in ('operator', 'creator', 'worker', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_creator_id uuid references pci.creators(creator_id) on delete set null,
  workspace_id text references public.protocol_workspaces(workspace_id) on delete restrict,

  command_name text not null,
  request_hash text,
  status text not null default 'processing'
    check (status in ('processing', 'succeeded', 'failed')),

  result_entity_type text,
  result_entity_id uuid,
  result_payload jsonb not null default '{}'::jsonb,
  error_code text,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint pci_command_receipts_actor_idempotency_uq
    unique (
      actor_type,
      actor_user_id,
      actor_creator_id,
      command_name,
      idempotency_key
    )
);

create index pci_command_receipts_request_idx
  on pci.command_receipts (request_id);
create index pci_command_receipts_workspace_created_idx
  on pci.command_receipts (workspace_id, created_at desc);

-- --------------------------------------------------------------------------
-- 7. Transactional outbox for non-transactional side effects.
-- --------------------------------------------------------------------------

create table pci.outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  workspace_id text references public.protocol_workspaces(workspace_id) on delete restrict,

  job_type text not null,
  aggregate_type text,
  aggregate_id uuid,
  payload jsonb not null default '{}'::jsonb,

  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 8 check (max_attempts > 0),

  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  last_error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index pci_outbox_worker_idx
  on pci.outbox (status, available_at, created_at)
  where status in ('pending', 'failed');
create index pci_outbox_aggregate_idx
  on pci.outbox (aggregate_type, aggregate_id, created_at desc);

create trigger trg_pci_outbox_touch
before update on pci.outbox
for each row execute function pci.touch_updated_at();

-- --------------------------------------------------------------------------
-- 8. Immutable event history.
-- --------------------------------------------------------------------------

create table pci.events (
  event_id uuid primary key default gen_random_uuid(),
  request_id uuid,
  workspace_id text references public.protocol_workspaces(workspace_id) on delete restrict,

  actor_type text not null
    check (actor_type in ('operator', 'creator', 'worker', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_creator_id uuid references pci.creators(creator_id) on delete set null,

  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,

  previous_state text,
  new_state text,
  reason_code text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index pci_events_entity_history_idx
  on pci.events (entity_type, entity_id, created_at, event_id);
create index pci_events_workspace_history_idx
  on pci.events (workspace_id, created_at desc);
create index pci_events_request_idx
  on pci.events (request_id)
  where request_id is not null;
create index pci_events_creator_idx
  on pci.events (actor_creator_id, created_at desc)
  where actor_creator_id is not null;

create trigger trg_pci_events_append_only
before update or delete on pci.events
for each row execute function pci.reject_event_mutation();

-- --------------------------------------------------------------------------
-- 9. RLS as defense-in-depth. No policies are intentionally created here:
--    browsers do not receive table grants and must use trusted backend APIs.
-- --------------------------------------------------------------------------

alter table pci.creators enable row level security;
alter table pci.workspace_creators enable row level security;
alter table pci.creator_invitations enable row level security;
alter table pci.creator_legal_acceptances enable row level security;
alter table pci.consignments enable row level security;
alter table pci.consignment_revisions enable row level security;
alter table pci.consignment_participations enable row level security;
alter table pci.submissions enable row level security;
alter table pci.submission_versions enable row level security;
alter table pci.negotiations enable row level security;
alter table pci.command_receipts enable row level security;
alter table pci.outbox enable row level security;
alter table pci.events enable row level security;

-- --------------------------------------------------------------------------
-- 10. Explicit current-object permissions.
-- --------------------------------------------------------------------------

revoke all on all tables in schema pci from public, anon, authenticated;
revoke all on all sequences in schema pci from public, anon, authenticated;
revoke execute on all functions in schema pci from public, anon, authenticated;

revoke all on all tables in schema pci_api from public, anon, authenticated;
revoke all on all sequences in schema pci_api from public, anon, authenticated;
revoke execute on all functions in schema pci_api from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema pci to service_role;
grant usage, select on all sequences in schema pci to service_role;
grant execute on all functions in schema pci to service_role;
grant execute on all functions in schema pci_api to service_role;

commit;
