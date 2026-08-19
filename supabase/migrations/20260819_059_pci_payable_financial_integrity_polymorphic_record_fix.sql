-- Protocol Creative Insights (PCI)
-- Phase 1O runtime hardening: polymorphic-safe deferred financial trigger.
--
-- Migration 058 introduced source-table dispatch, but PostgreSQL still resolves
-- static NEW/OLD field references against the trigger row type. A shared trigger
-- therefore cannot mention OLD.payout_id while executing for pci.payables, even
-- inside a CASE branch that would be false.
--
-- Convert NEW/OLD records to JSONB first and extract identifiers by key. This
-- keeps one shared invariant function without assuming identical row shapes.

create or replace function pci.assert_payable_financial_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  v_direct_payable_id uuid;
  v_payout_id uuid;
  v_payable_id uuid;
  v_payable_ids uuid[] := '{}'::uuid[];
  v_payable pci.payables%rowtype;
  v_confirmed numeric(14,2);
  v_inflight numeric(14,2);
begin
  if tg_table_name in ('payables','payout_allocations') then
    v_direct_payable_id := nullif(coalesce(v_new->>'payable_id', v_old->>'payable_id'), '')::uuid;
    if v_direct_payable_id is not null then
      v_payable_ids := array[v_direct_payable_id];
    end if;
  elsif tg_table_name = 'payouts' then
    v_payout_id := nullif(coalesce(v_new->>'payout_id', v_old->>'payout_id'), '')::uuid;
    if v_payout_id is not null then
      select coalesce(array_agg(distinct pa.payable_id), '{}'::uuid[])
      into v_payable_ids
      from pci.payout_allocations pa
      where pa.payout_id = v_payout_id;
    end if;
  else
    raise exception using errcode = '23514', message = 'pci_payable_financial_integrity_trigger_source_invalid';
  end if;

  foreach v_payable_id in array v_payable_ids
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
  'Deferred Payable financial integrity using JSONB NEW/OLD extraction so the shared constraint trigger is safe across payables, payout_allocations and payouts.';
