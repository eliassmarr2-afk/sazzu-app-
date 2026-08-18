-- Protocol Creative Insights (PCI)
-- Phase 1K hardening: payout lifecycle and COMMIT-time financial invariants.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.guard_payout_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if old.status='initiated' and new.status in ('confirmed','failed') then return new; end if;
  if old.status='confirmed' and new.status='reversed' then return new; end if;
  raise exception using errcode='23514',message='pci_payout_status_transition_invalid';
end;
$$;

revoke all on function pci.guard_payout_status_transition() from public,anon,authenticated;
grant execute on function pci.guard_payout_status_transition() to service_role;

drop trigger if exists pci_payouts_status_transition_guard on pci.payouts;
create trigger pci_payouts_status_transition_guard
before update of status on pci.payouts
for each row execute function pci.guard_payout_status_transition();

create or replace function pci.assert_payout_commit_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
  v_allocated numeric(14,2);
  v_bad_snapshot boolean;
begin
  select * into v_payout from pci.payouts po where po.payout_id=coalesce(new.payout_id,old.payout_id);
  if v_payout.payout_id is null then return null; end if;

  select coalesce(sum(pa.amount),0),coalesce(bool_or(pa.payment_destination_snapshot is distinct from v_payout.payment_destination_snapshot),false)
  into v_allocated,v_bad_snapshot
  from pci.payout_allocations pa
  where pa.payout_id=v_payout.payout_id;

  if v_allocated is distinct from v_payout.amount then
    raise exception using errcode='23514',message='pci_payout_allocation_total_mismatch';
  end if;
  if v_bad_snapshot then
    raise exception using errcode='23514',message='pci_payout_allocation_destination_mismatch';
  end if;
  if v_payout.provider_reference is null or btrim(v_payout.provider_reference)='' then
    raise exception using errcode='23514',message='pci_payout_reference_required';
  end if;
  if v_payout.transferred_at is null then
    raise exception using errcode='23514',message='pci_payout_transferred_at_required';
  end if;
  if v_payout.status='confirmed' and v_payout.confirmed_at is null then
    raise exception using errcode='23514',message='pci_confirmed_payout_timestamp_required';
  end if;
  if v_payout.status='failed' and v_payout.failed_at is null then
    raise exception using errcode='23514',message='pci_failed_payout_timestamp_required';
  end if;
  if v_payout.status='reversed' and v_payout.reversed_at is null then
    raise exception using errcode='23514',message='pci_reversed_payout_timestamp_required';
  end if;
  return null;
end;
$$;

revoke all on function pci.assert_payout_commit_integrity() from public,anon,authenticated;
grant execute on function pci.assert_payout_commit_integrity() to service_role;

drop trigger if exists pci_payout_commit_integrity_from_payout on pci.payouts;
create constraint trigger pci_payout_commit_integrity_from_payout
after insert or update on pci.payouts
deferrable initially deferred
for each row execute function pci.assert_payout_commit_integrity();

drop trigger if exists pci_payout_commit_integrity_from_allocation on pci.payout_allocations;
create constraint trigger pci_payout_commit_integrity_from_allocation
after insert on pci.payout_allocations
deferrable initially deferred
for each row execute function pci.assert_payout_commit_integrity();

create or replace function pci.assert_payable_financial_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payable pci.payables%rowtype;
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
begin
  select * into v_payable from pci.payables py where py.payable_id=coalesce(new.payable_id,old.payable_id);
  if v_payable.payable_id is null then return null; end if;

  select coalesce(sum(pa.amount),0) into v_confirmed
  from pci.payout_allocations pa join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='confirmed';

  select coalesce(sum(pa.amount),0) into v_inflight
  from pci.payout_allocations pa join pci.payouts po on po.payout_id=pa.payout_id
  where pa.payable_id=v_payable.payable_id and po.status='initiated';

  if v_confirmed > v_payable.amount_due then
    raise exception using errcode='23514',message='pci_payable_overpaid';
  end if;
  if v_confirmed+v_inflight > v_payable.amount_due then
    raise exception using errcode='23514',message='pci_payable_overallocated';
  end if;
  if v_payable.status='paid' then
    if v_confirmed < v_payable.amount_due then
      raise exception using errcode='23514',message='pci_paid_payable_underfunded';
    end if;
    if v_payable.paid_at is null then
      raise exception using errcode='23514',message='pci_paid_payable_timestamp_required';
    end if;
  end if;
  if v_payable.status='processing' and v_inflight <= 0 then
    raise exception using errcode='23514',message='pci_processing_payable_without_inflight_payout';
  end if;
  return null;
end;
$$;

revoke all on function pci.assert_payable_financial_integrity() from public,anon,authenticated;
grant execute on function pci.assert_payable_financial_integrity() to service_role;

drop trigger if exists pci_payable_financial_integrity_from_payable on pci.payables;
create constraint trigger pci_payable_financial_integrity_from_payable
after insert or update on pci.payables
deferrable initially deferred
for each row execute function pci.assert_payable_financial_integrity();

drop trigger if exists pci_payable_financial_integrity_from_allocation on pci.payout_allocations;
create constraint trigger pci_payable_financial_integrity_from_allocation
after insert on pci.payout_allocations
deferrable initially deferred
for each row execute function pci.assert_payable_financial_integrity();

drop trigger if exists pci_payable_financial_integrity_from_payout on pci.payouts;
create constraint trigger pci_payable_financial_integrity_from_payout
after insert or update on pci.payouts
deferrable initially deferred
for each row execute function pci.assert_payable_financial_integrity();