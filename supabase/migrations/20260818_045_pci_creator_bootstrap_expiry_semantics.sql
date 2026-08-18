-- Protocol Creative Insights (PCI)
-- Phase 1M correction: bootstrap must not pretend to persist expiration in a transaction it aborts.
-- Formal pending -> expired materialization belongs to worker_expire_creator_invitations().
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_bootstrap_invitation(
  p_actor_user_id uuid,
  p_actor_email text,
  p_token_hash text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text:=lower(btrim(coalesce(p_actor_email,'')));
  v_hash text:=lower(btrim(coalesce(p_token_hash,'')));
  v_invitation pci.creator_invitations%rowtype;
  v_creator pci.creators%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_actor_user_id is null or p_idempotency_key is null or p_request_id is null or v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='pci_creator_bootstrap_context_invalid';
  end if;

  select * into v_invitation from pci.creator_invitations i
  where i.token_hash=v_hash for update;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;

  if v_invitation.status='accepted' then
    select * into v_creator from pci.creators c where c.creator_id=v_invitation.creator_id;
    if v_creator.auth_user_id is distinct from p_actor_user_id then
      raise exception using errcode='42501',message='pci_creator_invitation_user_mismatch';
    end if;
    return jsonb_build_object(
      'ok',true,'invitation_id',v_invitation.invitation_id,'creator_id',v_creator.creator_id,
      'workspace_id',v_invitation.workspace_id,'status','accepted',
      'required_legal_documents',v_invitation.legal_requirements_snapshot,'idempotent_replay',true
    );
  end if;

  if v_invitation.status <> 'pending' then
    raise exception using errcode='23514',message='pci_creator_invitation_not_pending';
  end if;

  -- Do not UPDATE then RAISE: the exception would roll the UPDATE back. The expiry worker
  -- materializes pending -> expired; this timestamp check is the authoritative use gate.
  if v_invitation.expires_at <= now() then
    raise exception using errcode='23514',message='pci_creator_invitation_expired';
  end if;

  if lower(v_invitation.email_snapshot) is distinct from v_email then
    raise exception using errcode='42501',message='pci_creator_invitation_email_mismatch';
  end if;
  if v_invitation.auth_user_id_snapshot is not null and v_invitation.auth_user_id_snapshot is distinct from p_actor_user_id then
    raise exception using errcode='42501',message='pci_creator_invitation_user_mismatch';
  end if;

  select * into v_creator from pci.creators c where c.creator_id=v_invitation.creator_id for update;
  if v_creator.creator_id is null then raise exception using errcode='P0002',message='pci_creator_not_found'; end if;
  if lower(v_creator.email) is distinct from v_email then raise exception using errcode='42501',message='pci_creator_invitation_email_mismatch'; end if;
  if v_creator.auth_user_id is not null and v_creator.auth_user_id is distinct from p_actor_user_id then
    raise exception using errcode='42501',message='pci_creator_auth_already_linked_elsewhere';
  end if;

  select * into v_relationship from pci.workspace_creators wc
  where wc.workspace_creator_id=v_invitation.workspace_creator_id for update;
  if v_relationship.workspace_creator_id is null
     or v_relationship.creator_id is distinct from v_creator.creator_id
     or v_relationship.workspace_id is distinct from v_invitation.workspace_id then
    raise exception using errcode='23514',message='pci_creator_invitation_relationship_invalid';
  end if;
  if v_relationship.status <> 'invited' then
    raise exception using errcode='23514',message='pci_creator_invitation_relationship_not_invited';
  end if;

  insert into pci.command_receipts(
    idempotency_key,actor_type,actor_user_id,actor_creator_id,workspace_id,command_name,request_id,status
  ) values(
    p_idempotency_key,'creator',p_actor_user_id,v_creator.creator_id,v_invitation.workspace_id,
    'creator_bootstrap_invitation',p_request_id,'processing'
  ) on conflict do nothing returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='creator' and cr.actor_user_id=p_actor_user_id
      and cr.actor_creator_id=v_creator.creator_id
      and cr.command_name='creator_bootstrap_invitation'
      and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  update pci.creators
  set auth_user_id=p_actor_user_id
  where creator_id=v_creator.creator_id and auth_user_id is null;

  update pci.creator_invitations
  set status='accepted',accepted_at=now(),auth_user_id_snapshot=p_actor_user_id,
      delivery_status=case when delivery_status='pending' then 'sent' else delivery_status end,
      delivered_at=coalesce(delivered_at,now())
  where invitation_id=v_invitation.invitation_id;

  perform pci.append_event(
    v_invitation.workspace_id,'creator',p_actor_user_id,v_creator.creator_id,
    'creator_invitation',v_invitation.invitation_id,
    'creator_invitation.auth_bootstrapped','pending','accepted',
    p_request_id,v_receipt_id,
    jsonb_build_object('workspace_creator_id',v_relationship.workspace_creator_id,'legal_acceptance_required',true)
  );

  v_result:=jsonb_build_object(
    'ok',true,'invitation_id',v_invitation.invitation_id,'creator_id',v_creator.creator_id,
    'workspace_id',v_invitation.workspace_id,'workspace_creator_id',v_relationship.workspace_creator_id,
    'invitation_status','accepted','workspace_creator_status','invited','creator_status',v_creator.status,
    'required_legal_documents',v_invitation.legal_requirements_snapshot,
    'next_action','accept_required_legal_documents'
  );

  update pci.command_receipts
  set status='completed',result_entity_type='creator_invitation',result_entity_id=v_invitation.invitation_id,
      response_snapshot=v_result,completed_at=now()
  where command_receipt_id=v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.creator_bootstrap_invitation(uuid,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function pci_api.creator_bootstrap_invitation(uuid,text,text,uuid,uuid) to service_role;
