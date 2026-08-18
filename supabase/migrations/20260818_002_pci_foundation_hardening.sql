-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Foundation hardening
--
-- Tightens idempotency semantics and actor identity invariants discovered
-- during review of the initial foundation migration.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1. Idempotency must remain unique even when one actor identity column is
--    NULL. PostgreSQL UNIQUE treats NULL values as distinct, so actor-specific
--    partial indexes are used instead of one nullable composite constraint.
-- --------------------------------------------------------------------------

alter table pci.command_receipts
  drop constraint if exists pci_command_receipts_actor_idempotency_uq;

create unique index if not exists pci_command_receipts_operator_idem_uq
  on pci.command_receipts (actor_user_id, command_name, idempotency_key)
  where actor_type = 'operator'
    and actor_user_id is not null;

create unique index if not exists pci_command_receipts_creator_idem_uq
  on pci.command_receipts (
    actor_user_id,
    actor_creator_id,
    command_name,
    idempotency_key
  )
  where actor_type = 'creator'
    and actor_user_id is not null
    and actor_creator_id is not null;

create unique index if not exists pci_command_receipts_system_idem_uq
  on pci.command_receipts (actor_type, command_name, idempotency_key)
  where actor_type in ('worker', 'system');

alter table pci.command_receipts
  add constraint pci_command_receipts_actor_identity_check
  check (
    (actor_type = 'operator' and actor_user_id is not null and actor_creator_id is null)
    or
    (actor_type = 'creator' and actor_user_id is not null and actor_creator_id is not null)
    or
    (actor_type in ('worker', 'system') and actor_creator_id is null)
  );

-- --------------------------------------------------------------------------
-- 2. Event actor semantics follow the same identity rules.
-- --------------------------------------------------------------------------

alter table pci.events
  add constraint pci_events_actor_identity_check
  check (
    (actor_type = 'operator' and actor_user_id is not null and actor_creator_id is null)
    or
    (actor_type = 'creator' and actor_user_id is not null and actor_creator_id is not null)
    or
    (actor_type in ('worker', 'system') and actor_creator_id is null)
  );

-- --------------------------------------------------------------------------
-- 3. A version-id + hash UNIQUE index cannot detect duplicate content because
--    version-id is already unique. Keep a normal hash index for diagnostics
--    without preventing legitimate reuse of the same bytes.
-- --------------------------------------------------------------------------

drop index if exists pci.pci_submission_versions_sha_path_uq;

create index if not exists pci_submission_versions_sha_idx
  on pci.submission_versions (sha256)
  where sha256 is not null;

commit;
