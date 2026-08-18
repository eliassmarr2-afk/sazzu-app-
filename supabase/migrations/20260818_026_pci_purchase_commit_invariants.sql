-- Protocol Creative Insights (PCI)
-- Phase 1J: commit-time commercial integrity and immutable purchase snapshots.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.guard_purchase_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.purchase_id is distinct from old.purchase_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.offer_id is distinct from old.offer_id
     or new.currency is distinct from old.currency
     or new.total_amount is distinct from old.total_amount
     or new.agreed_at is distinct from old.agreed_at
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514', message = 'pci_purchase_snapshot_immutable';
  end if;
  return new;
end;
$$;

create trigger pci_purchases_snapshot_guard
before update on pci.purchases
for each row execute function pci.guard_purchase_snapshot();

create or replace function pci.guard_rights_grant_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rights_grant_id is distinct from old.rights_grant_id
     or new.purchase_id is distinct from old.purchase_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.submission_version_id is distinct from old.submission_version_id
     or new.rights_package_snapshot is distinct from old.rights_package_snapshot
     or new.version_sha256_snapshot is distinct from old.version_sha256_snapshot
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514', message = 'pci_rights_grant_snapshot_immutable';
  end if;
  return new;
end;
$$;

create trigger pci_rights_grants_snapshot_guard
before update on pci.rights_grants
for each row execute function pci.guard_rights_grant_snapshot();

create or replace function pci.guard_payable_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payable_id is distinct from old.payable_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.purchase_id is distinct from old.purchase_id
     or new.concept_type is distinct from old.concept_type
     or new.concept_ref_id is distinct from old.concept_ref_id
     or new.currency is distinct from old.currency
     or new.amount_due is distinct from old.amount_due
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514', message = 'pci_payable_commercial_snapshot_immutable';
  end if;
  return new;
end;
$$;

create trigger pci_payables_snapshot_guard
before update on pci.payables
for each row execute function pci.guard_payable_snapshot();

-- Deferred checks run at COMMIT, allowing the atomic command to create its
-- related rows in any internal order while forbidding an incomplete final state.
create or replace function pci.check_accepted_offer_has_purchase()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'accepted' and not exists (
    select 1 from pci.purchases p where p.offer_id = new.offer_id
  ) then
    raise exception using errcode = '23514', message = 'pci_accepted_offer_missing_purchase';
  end if;
  return null;
end;
$$;

create constraint trigger pci_accepted_offer_purchase_integrity
  after insert or update on pci.purchase_offers
  deferrable initially deferred
  for each row execute function pci.check_accepted_offer_has_purchase();

create or replace function pci.check_purchase_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_offer pci.purchase_offers%rowtype;
  v_payable pci.payables%rowtype;
  v_missing_rights integer;
begin
  select * into v_offer
  from pci.purchase_offers po
  where po.offer_id = new.offer_id;

  if v_offer.offer_id is null or v_offer.status <> 'accepted' then
    raise exception using errcode = '23514', message = 'pci_purchase_requires_accepted_offer';
  end if;

  if v_offer.workspace_id is distinct from new.workspace_id
     or v_offer.creator_id is distinct from new.creator_id
     or v_offer.currency is distinct from new.currency
     or v_offer.total_amount is distinct from new.total_amount
  then
    raise exception using errcode = '23514', message = 'pci_purchase_offer_snapshot_mismatch';
  end if;

  select * into v_payable
  from pci.payables py
  where py.purchase_id = new.purchase_id
    and py.concept_type = 'base_purchase';

  if v_payable.payable_id is null then
    raise exception using errcode = '23514', message = 'pci_purchase_missing_base_payable';
  end if;

  if v_payable.workspace_id is distinct from new.workspace_id
     or v_payable.creator_id is distinct from new.creator_id
     or v_payable.currency is distinct from new.currency
     or v_payable.amount_due is distinct from new.total_amount
  then
    raise exception using errcode = '23514', message = 'pci_purchase_payable_snapshot_mismatch';
  end if;

  select count(*) into v_missing_rights
  from pci.purchase_offer_items poi
  where poi.offer_id = new.offer_id
    and not exists (
      select 1
      from pci.rights_grants rg
      where rg.purchase_id = new.purchase_id
        and rg.submission_version_id = poi.submission_version_id
        and rg.status in ('pending_payment','active','suspended','expired','revoked')
    );

  if v_missing_rights > 0 then
    raise exception using errcode = '23514', message = 'pci_purchase_missing_rights_grant';
  end if;

  return null;
end;
$$;

create constraint trigger pci_purchase_integrity
  after insert or update on pci.purchases
  deferrable initially deferred
  for each row execute function pci.check_purchase_integrity();

create or replace function pci.check_payable_confirmation_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('ready_to_pay','processing','paid') then
    if new.payment_account_id is null
       or new.payment_account_confirmed_at is null
       or new.payment_account_snapshot = '{}'::jsonb
       or not exists (
         select 1
         from pci.payable_payment_confirmations pc
         where pc.payable_id = new.payable_id
       )
    then
      raise exception using errcode = '23514', message = 'pci_payable_missing_payment_confirmation';
    end if;
  end if;
  return null;
end;
$$;

create constraint trigger pci_payable_confirmation_integrity
  after insert or update on pci.payables
  deferrable initially deferred
  for each row execute function pci.check_payable_confirmation_integrity();

revoke all on function pci.guard_purchase_snapshot() from public, anon, authenticated;
revoke all on function pci.guard_rights_grant_snapshot() from public, anon, authenticated;
revoke all on function pci.guard_payable_snapshot() from public, anon, authenticated;
revoke all on function pci.check_accepted_offer_has_purchase() from public, anon, authenticated;
revoke all on function pci.check_purchase_integrity() from public, anon, authenticated;
revoke all on function pci.check_payable_confirmation_integrity() from public, anon, authenticated;

grant execute on function pci.guard_purchase_snapshot() to service_role;
grant execute on function pci.guard_rights_grant_snapshot() to service_role;
grant execute on function pci.guard_payable_snapshot() to service_role;
grant execute on function pci.check_accepted_offer_has_purchase() to service_role;
grant execute on function pci.check_purchase_integrity() to service_role;
grant execute on function pci.check_payable_confirmation_integrity() to service_role;
