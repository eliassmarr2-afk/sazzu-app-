-- Protocol Creative Insights (PCI)
-- Phase 1K: authorize a narrowly scoped proof upload before payout registration.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.admin_payout_proof_upload_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_payable_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payable pci.payables%rowtype;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_payable
  from pci.payables py
  where py.payable_id=p_payable_id and py.workspace_id=p_workspace_id;

  if v_payable.payable_id is null then
    raise exception using errcode='P0002',message='pci_payable_not_found';
  end if;
  if v_payable.status <> 'ready_to_pay' then
    raise exception using errcode='23514',message='pci_payable_not_ready_to_pay';
  end if;
  if v_payable.payment_account_confirmed_at is null or v_payable.payment_account_snapshot='{}'::jsonb then
    raise exception using errcode='23514',message='pci_payable_destination_not_confirmed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'payable_id',v_payable.payable_id,
    'creator_id',v_payable.creator_id,
    'currency',v_payable.currency,
    'amount_due',v_payable.amount_due
  );
end;
$$;

revoke all on function pci_api.admin_payout_proof_upload_context(uuid,text,uuid) from public,anon,authenticated;
grant execute on function pci_api.admin_payout_proof_upload_context(uuid,text,uuid) to service_role;