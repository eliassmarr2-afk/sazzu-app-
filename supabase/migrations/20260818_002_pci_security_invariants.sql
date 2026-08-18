-- Protocol Creative Insights (PCI)
-- Phase 1F security boundary and foundational invariants.
-- Intentionally stored in Git only; not applied to production yet.

-- No direct client access. Edge Functions/backend use service_role.
revoke all on schema pci from public, anon, authenticated;
revoke all on schema pci_api from public, anon, authenticated;

grant usage on schema pci to service_role;
grant usage on schema pci_api to service_role;
grant all privileges on all tables in schema pci to service_role;
grant all privileges on all sequences in schema pci to service_role;
grant execute on all functions in schema pci to service_role;
grant execute on all functions in schema pci_api to service_role;

alter default privileges in schema pci revoke all on tables from public, anon, authenticated;
alter default privileges in schema pci revoke all on sequences from public, anon, authenticated;
alter default privileges in schema pci revoke execute on functions from public, anon, authenticated;
alter default privileges in schema pci grant all privileges on tables to service_role;
alter default privileges in schema pci grant all privileges on sequences to service_role;
alter default privileges in schema pci grant execute on functions to service_role;

alter default privileges in schema pci_api revoke all on tables from public, anon, authenticated;
alter default privileges in schema pci_api revoke all on sequences from public, anon, authenticated;
alter default privileges in schema pci_api revoke execute on functions from public, anon, authenticated;
alter default privileges in schema pci_api grant execute on functions to service_role;

-- Defense in depth: all PCI tables have RLS enabled from birth.
alter table pci.creators enable row level security;
alter table pci.workspace_creators enable row level security;
alter table pci.creator_invitations enable row level security;
alter table pci.creator_legal_acceptances enable row level security;
alter table pci.creator_payment_accounts enable row level security;
alter table pci.consignments enable row level security;
alter table pci.consignment_revisions enable row level security;
alter table pci.consignment_participations enable row level security;
alter table pci.submissions enable row level security;
alter table pci.submission_versions enable row level security;
alter table pci.events enable row level security;
alter table pci.command_receipts enable row level security;
alter table pci.outbox enable row level security;

-- No policies are intentionally created for anon/authenticated.
-- Creator and operator clients must go through authenticated PCI Edge Functions.

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

revoke all on function pci.touch_updated_at() from public, anon, authenticated;
grant execute on function pci.touch_updated_at() to service_role;

create trigger pci_creators_touch_updated_at
before update on pci.creators
for each row execute function pci.touch_updated_at();

create trigger pci_workspace_creators_touch_updated_at
before update on pci.workspace_creators
for each row execute function pci.touch_updated_at();

create trigger pci_creator_payment_accounts_touch_updated_at
before update on pci.creator_payment_accounts
for each row execute function pci.touch_updated_at();

create trigger pci_consignments_touch_updated_at
before update on pci.consignments
for each row execute function pci.touch_updated_at();

create trigger pci_submissions_touch_updated_at
before update on pci.submissions
for each row execute function pci.touch_updated_at();

-- Published brief revisions are contractual snapshots. They cannot be edited.
-- The only permitted update is published -> superseded, setting superseded_at.
create or replace function pci.guard_consignment_revision_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'superseded' then
    raise exception using errcode = '23514', message = 'pci_consignment_revision_immutable';
  end if;

  if old.status = 'published' then
    if new.status <> 'superseded'
       or new.consignment_revision_id is distinct from old.consignment_revision_id
       or new.consignment_id is distinct from old.consignment_id
       or new.revision_number is distinct from old.revision_number
       or new.title is distinct from old.title
       or new.summary is distinct from old.summary
       or new.objective is distinct from old.objective
       or new.creative_angle is distinct from old.creative_angle
       or new.hook_guidance is distinct from old.hook_guidance
       or new.format_requirements is distinct from old.format_requirements
       or new.acceptance_criteria is distinct from old.acceptance_criteria
       or new.subject_type is distinct from old.subject_type
       or new.subject_ref is distinct from old.subject_ref
       or new.subject_snapshot is distinct from old.subject_snapshot
       or new.base_price_amount is distinct from old.base_price_amount
       or new.currency is distinct from old.currency
       or new.slots_available is distinct from old.slots_available
       or new.performance_bonus_policy is distinct from old.performance_bonus_policy
       or new.pre_purchase_revision_limit is distinct from old.pre_purchase_revision_limit
       or new.rights_package_snapshot is distinct from old.rights_package_snapshot
       or new.published_at is distinct from old.published_at
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
       or new.superseded_at is null
    then
      raise exception using errcode = '23514', message = 'pci_published_consignment_revision_immutable';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function pci.guard_consignment_revision_immutability() from public, anon, authenticated;
grant execute on function pci.guard_consignment_revision_immutability() to service_role;

create trigger pci_consignment_revisions_immutable
before update on pci.consignment_revisions
for each row execute function pci.guard_consignment_revision_immutability();

-- Finalized creative versions are byte-identifiable records and cannot be rewritten.
create or replace function pci.guard_submission_version_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'ready' then
    raise exception using errcode = '23514', message = 'pci_ready_submission_version_immutable';
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_submission_version_immutability() from public, anon, authenticated;
grant execute on function pci.guard_submission_version_immutability() to service_role;

create trigger pci_submission_versions_immutable
before update on pci.submission_versions
for each row execute function pci.guard_submission_version_immutability();

-- Audit history is append-only. No UPDATE/DELETE path exists, including backend mistakes.
create or replace function pci.guard_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = 'pci_append_only_record';
end;
$$;

revoke all on function pci.guard_append_only() from public, anon, authenticated;
grant execute on function pci.guard_append_only() to service_role;

create trigger pci_events_append_only
before update or delete on pci.events
for each row execute function pci.guard_append_only();

create trigger pci_legal_acceptances_append_only
before update or delete on pci.creator_legal_acceptances
for each row execute function pci.guard_append_only();

-- Token hashes and accepted invitation history should never cascade away.
create index pci_creator_invitations_creator_status_idx
  on pci.creator_invitations (creator_id, status, created_at desc);

create index pci_workspace_creators_workspace_status_idx
  on pci.workspace_creators (workspace_id, status, created_at desc);

comment on function pci.guard_consignment_revision_immutability() is
  'Prevents published PCI brief snapshots from being rewritten; only published->superseded is allowed.';
comment on function pci.guard_submission_version_immutability() is
  'Prevents a ready creative version from being modified or replaced in place.';
comment on function pci.guard_append_only() is
  'Hard guard for PCI records whose history must never be rewritten.';
