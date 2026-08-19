-- Protocol Creative Insights (PCI)
-- Phase 1O runtime hardening: deferred Payable financial-integrity trigger dispatch.
--
-- Runtime validation discovered that pci.assert_payable_financial_integrity()
-- was attached to pci.payables, pci.payout_allocations and pci.payouts while
-- assuming every trigger row exposed NEW/OLD.payable_id. pci.payouts does not;
-- its affected Payables are reached through pci.payout_allocations.
--
-- Preserve the same financial invariants while resolving every affected
-- Payable according to the table that fired the constraint trigger.

create or replace function pci.assert_payable_financial_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payable_id uuid;
  v_payable pci.payables%rowtype;
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
begin
  for v_payable_id in
    select distinct q.payable_id
    from (
      select
        case
          when tg_table_name = 'payables' and tg_op in ('INSERT','UPDATE') then new.payable_id
          when tg_table_name = 'payables' and tg_op = 'DELETE' then old.payable_id
          when tg_table_name = 'payout_allocations' and tg_op in ('INSERT','UPDATE') then new.payable_id
          when tg_table_name = 'payout_allocations' and tg_op = 'DELETE' then old.payable_id
          else null::uuid
        end as payable_id
      union all
      select pa.payable_id
      from pci.payout_allocations pa
      where tg_table_name = 'payouts'
        and pa.payout_id = case when tg_op = 'DELETE' then old.payout_id else new.payout_id end
    ) q
    where q.payable_id is not null
  loop
    select * into v_payable
    from pci.payables py
    where py.payable_id = v_payable_id;

    if v_payable.payable_id is null then
      continue;
    end if;

    select coalesce(sum(pa.amount),0)
    into v_confirmed
    from pci.payout_allocations pa
    join pci.payouts po on po.payout_id = pa.payout_id
    where pa.payable_id = v_payable.payable_id
      and po.status = 'confirmed';

    select coalesce(sum(pa.amount),0)
    into v_inflight
    from pci.payout_allocations pa
    join pci.payouts po on po.payout_id = pa.payout_id
    where pa.payable_id = v_payable.payable_id
      and po.status = 'initiated';

    if v_confirmed > v_payable.amount_due then
      raise exception using errcode = '23514', message = 'pci_payable_overpaid';
    end if;

    if v_confirmed + v_inflight > v_payable.amount_due then
      raise exception using errcode = '23514', message = 'pci_payable_overallocated';
    end if;

    if v_payable.status = 'paid' then
      if v_confirmed < v_payable.amount_due then
        raise exception using errcode = '23514', message = 'pci_paid_payable_underfunded';
      end if;
      if v_payable.paid_at is null then
        raise exception using errcode = '23514', message = 'pci_paid_payable_timestamp_required';
      end if;
    end if;

    if v_payable.status = 'processing' and v_inflight <= 0 then
      raise exception using errcode = '23514', message = 'pci_processing_payable_without_inflight_payout';
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function pci.assert_payable_financial_integrity()
  from public, anon, authenticated;
grant execute on function pci.assert_payable_financial_integrity()
  to service_role;

comment on function pci.assert_payable_financial_integrity() is
  'Deferred Payable financial integrity. Resolves affected Payables from payables, payout_allocations or payouts before checking confirmed/inflight balances and paid/processing state invariants.';
