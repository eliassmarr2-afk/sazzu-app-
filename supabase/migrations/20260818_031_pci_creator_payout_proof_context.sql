-- Protocol Creative Insights (PCI)
-- Phase 1K: Creator may access only the proof of their own payout through a signed URL issued by pci-creator-api.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_payout_proof_context(
  p_actor_user_id uuid,
  p_payout_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_payout pci.payouts%rowtype;
begin
  v_creator:=pci.require_active_creator(p_actor_user_id);
  select * into v_payout
  from pci.payouts po
  where po.payout_id=p_payout_id and po.creator_id=v_creator.creator_id;

  if v_payout.payout_id is null then
    raise exception using errcode='P0002',message='pci_payout_not_found';
  end if;
  if v_payout.proof_storage_bucket <> 'pci-payout-proofs' or v_payout.proof_storage_path is null then
    raise exception using errcode='23514',message='pci_payout_proof_not_available';
  end if;

  return jsonb_build_object(
    'ok',true,
    'payout_id',v_payout.payout_id,
    'status',v_payout.status,
    'storage_bucket',v_payout.proof_storage_bucket,
    'storage_path',v_payout.proof_storage_path
  );
end;
$$;

revoke all on function pci_api.creator_payout_proof_context(uuid,uuid) from public,anon,authenticated;
grant execute on function pci_api.creator_payout_proof_context(uuid,uuid) to service_role;