-- Protocol Creative Insights (PCI)
-- Phase 1J: payment account details are immutable after creation.
-- A changed destination is a new account row; the previous row may only be deactivated.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.guard_creator_payment_account_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_account_id is distinct from old.payment_account_id
     or new.creator_id is distinct from old.creator_id
     or new.provider is distinct from old.provider
     or new.account_type is distinct from old.account_type
     or new.holder_name is distinct from old.holder_name
     or new.holder_document_masked is distinct from old.holder_document_masked
     or new.alias is distinct from old.alias
     or new.account_identifier_ciphertext is distinct from old.account_identifier_ciphertext
     or new.account_identifier_last4 is distinct from old.account_identifier_last4
     or new.metadata is distinct from old.metadata
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514', message = 'pci_payment_account_snapshot_immutable';
  end if;

  if old.status = 'inactive' and new.status <> 'inactive' then
    raise exception using errcode = '23514', message = 'pci_payment_account_reactivation_forbidden';
  end if;

  return new;
end;
$$;

create trigger pci_creator_payment_accounts_snapshot_guard
before update on pci.creator_payment_accounts
for each row execute function pci.guard_creator_payment_account_snapshot();

revoke all on function pci.guard_creator_payment_account_snapshot() from public, anon, authenticated;
grant execute on function pci.guard_creator_payment_account_snapshot() to service_role;

comment on function pci.guard_creator_payment_account_snapshot() is
  'Payment destination details never change in place. Create a new account row and deactivate the old one so historical confirmations remain reconstructable.';
