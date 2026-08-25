-- PCI 2.1S.5 · Creator self-registration verified Auth lookup
-- Runtime-test first. Production must not be touched directly.
--
-- creator_self_register must verify the authenticated user's confirmed email
-- against auth.users. Execution remains restricted to service_role, the function
-- owner is postgres, and the function keeps its hardened empty search_path.

begin;

alter function pci_api.creator_self_register(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
)
security definer;

revoke all
on function pci_api.creator_self_register(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function pci_api.creator_self_register(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
)
to service_role;

comment on function pci_api.creator_self_register(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
) is
  'Authenticated Creator self-registration command. SECURITY DEFINER is limited to the server-side service_role entry point so the command can verify the confirmed auth.users identity; search_path remains empty.';

commit;
