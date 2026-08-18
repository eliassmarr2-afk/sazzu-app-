-- Protocol Creative Insights (PCI)
-- Phase 1M: delivery idempotency and explicit operator revocation for onboarding invitations.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.admin_creator_invitation_delivery_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_invitation pci.creator_invitations%rowtype;
  v_creator pci.creators%rowtype;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_invitation from pci.creator_invitations i
  where i.invitation_id=p_invitation_id and i.workspace_id=p_workspace_id;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;
  select * into v_creator from pci.creators c where c.creator_id=v_invitation.creator_id;

  return jsonb_build_object(
    'ok',true,'invitation_id',v_invitation.invitation_id,'creator_id',v_invitation.creator_id,
    'email',v_invitation.email_snapshot,'status',v_invitation.status,'delivery_status',v_invitation.delivery_status,
    'delivery_method',v_invitation.delivery_method,'expires_at',v_invitation.expires_at,
    'auth_user_id',coalesce(v_invitation.auth_user_id_snapshot,v_creator.auth_user_id)
  );
end;
$$;

create or replace function pci_api.admin_revoke_creator_invitation(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_invitation_id uuid,
  p_reason text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_reason text:=left(btrim(coalesce(p_reason,'')),500);
  v_invitation pci.creator_invitations%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_invitation_id is null or p_idempotency_key is null or p_request_id is null or v_reason='' then
    raise exception using errcode='22023',message='pci_creator_invitation_revocation_context_invalid';
  end if;
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_invitation from pci.creator_invitations i
  where i.invitation_id=p_invitation_id and i.workspace_id=p_workspace_id for update;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;
  if v_invitation.status='revoked' then return jsonb_build_object('ok',true,'invitation_id',v_invitation.invitation_id,'status','revoked','idempotent_replay',true); end if;
  if v_invitation.status <> 'pending' then raise exception using errcode='23514',message='pci_creator_invitation_not_revocable'; end if;

  insert into pci.command_receipts(idempotency_key,actor_type,actor_user_id,workspace_id,command_name,request_id,status)
  values(p_idempotency_key,'operator',p_actor_user_id,p_workspace_id,'admin_revoke_creator_invitation',p_request_id,'processing')
  on conflict do nothing returning command_receipt_id into v_receipt_id;
  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='operator' and cr.actor_user_id=p_actor_user_id
      and cr.command_name='admin_revoke_creator_invitation' and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  update pci.creator_invitations set status='revoked',revoked_at=now(),revoked_reason=v_reason
  where invitation_id=v_invitation.invitation_id;

  perform pci.append_event(
    p_workspace_id,'operator',p_actor_user_id,v_invitation.creator_id,'creator_invitation',v_invitation.invitation_id,
    'creator_invitation.revoked','pending','revoked',p_request_id,v_receipt_id,jsonb_build_object('reason',v_reason)
  );

  v_result:=jsonb_build_object('ok',true,'invitation_id',v_invitation.invitation_id,'status','revoked');
  update pci.command_receipts set status='completed',result_entity_type='creator_invitation',result_entity_id=v_invitation.invitation_id,
    response_snapshot=v_result,completed_at=now() where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

create or replace function pci_api.worker_expire_creator_invitations(
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_count integer;
begin
  if p_request_id is null then raise exception using errcode='22023',message='pci_worker_context_invalid'; end if;

  with expired as (
    update pci.creator_invitations i
    set status='expired'
    where i.status='pending' and i.expires_at<=now()
    returning i.invitation_id,i.workspace_id,i.creator_id
  )
  select count(*) into v_count from expired;

  return jsonb_build_object('ok',true,'expired_count',v_count);
end;
$$;

revoke all on function pci_api.admin_creator_invitation_delivery_context(uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_revoke_creator_invitation(uuid,text,uuid,text,uuid,uuid) from public,anon,authenticated;
revoke all on function pci_api.worker_expire_creator_invitations(uuid) from public,anon,authenticated;

grant execute on function pci_api.admin_creator_invitation_delivery_context(uuid,text,uuid) to service_role;
grant execute on function pci_api.admin_revoke_creator_invitation(uuid,text,uuid,text,uuid,uuid) to service_role;
grant execute on function pci_api.worker_expire_creator_invitations(uuid) to service_role;
