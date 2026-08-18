-- Protocol Creative Insights (PCI)
-- Phase 1K hardening: proof path must belong to the exact payable allocated to the payout.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.assert_payout_proof_path_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payout pci.payouts%rowtype;
  v_allocation pci.payout_allocations%rowtype;
  v_expected_prefix text;
begin
  select * into v_payout
  from pci.payouts po
  where po.payout_id=coalesce(new.payout_id,old.payout_id);

  if v_payout.payout_id is null or v_payout.proof_storage_path is null then return null; end if;
  if v_payout.proof_storage_bucket <> 'pci-payout-proofs' then
    raise exception using errcode='23514',message='pci_payout_proof_bucket_invalid';
  end if;

  select * into v_allocation
  from pci.payout_allocations pa
  where pa.payout_id=v_payout.payout_id
  order by pa.created_at
  limit 1;

  if v_allocation.payout_allocation_id is null then
    raise exception using errcode='23514',message='pci_payout_allocation_required';
  end if;

  v_expected_prefix := 'workspace/' || v_payout.workspace_id || '/payable/' || v_allocation.payable_id::text || '/proof/';
  if left(v_payout.proof_storage_path,length(v_expected_prefix)) <> v_expected_prefix then
    raise exception using errcode='23514',message='pci_payout_proof_path_invalid';
  end if;
  return null;
end;
$$;

revoke all on function pci.assert_payout_proof_path_integrity() from public,anon,authenticated;
grant execute on function pci.assert_payout_proof_path_integrity() to service_role;

drop trigger if exists pci_payout_proof_path_from_payout on pci.payouts;
create constraint trigger pci_payout_proof_path_from_payout
after insert or update on pci.payouts
deferrable initially deferred
for each row execute function pci.assert_payout_proof_path_integrity();

drop trigger if exists pci_payout_proof_path_from_allocation on pci.payout_allocations;
create constraint trigger pci_payout_proof_path_from_allocation
after insert on pci.payout_allocations
deferrable initially deferred
for each row execute function pci.assert_payout_proof_path_integrity();