-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Onboarding idempotency correction
--
-- A replay of a successful claim must return its stored result even though the
-- invitation has already transitioned from pending -> accepted.
-- ============================================================================

begin;

create or replace function pci_api.creator_claim_invitation(
  p_actor_user_id uuid,
  p_invitation_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_email text;
  v_confirmed_at timestamptz;
  v_invitation pci.creator_invitations%rowtype;
  v_creator pci.creators%rowtype;
  v_workspace_creator pci.workspace_creators%rowtype;
  v_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  select lower(u.email), u.email_confirmed_at
    into v_auth_email, v_confirmed_at
  from auth.users u
  where u.id = p_actor_user_id
  limit 1;

  if v_auth_email is null then
    raise exception using errcode = 'P0001', message = 'authenticated_email_not_found';
  end if;
  if v_confirmed_at is null then
    raise exception using errcode = 'P0001', message = 'authenticated_email_not_verified';
  end if;

  select i.* into v_invitation
  from pci.creator_invitations i
  where i.invitation_id = p_invitation_id
  for update;

  if v_invitation.invitation_id is null then
    raise exception using errcode = 'P0001', message = 'creator_invitation_not_found';
  end if;
  if lower(v_invitation.invited_email) <> v_auth_email then
    raise exception using errcode = 'P0001', message = 'creator_invitation_email_mismatch';
  end if;

  perform pci.lock_command_key(
    'creator-onboarding:' || p_actor_user_id::text || ':creator_claim_invitation',
    p_idempotency_key
  );

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_invitation.creator_id
    and r.command_name = 'creator_claim_invitation'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'creator_invitation_not_pending';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'creator_invitation_expired';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_invitation.creator_id,
    v_invitation.workspace_id,
    'creator_claim_invitation',
    p_request_hash,
    'processing'
  );

  select c.* into v_creator
  from pci.creators c
  where c.creator_id = v_invitation.creator_id
  for update;

  if v_creator.status = 'closed' then
    raise exception using errcode = 'P0001', message = 'creator_account_closed';
  end if;
  if v_creator.auth_user_id is not null and v_creator.auth_user_id <> p_actor_user_id then
    raise exception using errcode = 'P0001', message = 'creator_identity_already_linked';
  end if;

  update pci.creators
  set auth_user_id = p_actor_user_id,
      status = case when status = 'pending' then 'active' else status end
  where creator_id = v_creator.creator_id
  returning * into v_creator;

  select wc.* into v_workspace_creator
  from pci.workspace_creators wc
  where wc.workspace_id = v_invitation.workspace_id
    and wc.creator_id = v_invitation.creator_id
  for update;

  if v_workspace_creator.workspace_creator_id is null then
    raise exception using errcode = 'P0001', message = 'creator_workspace_relationship_not_found';
  end if;
  if v_workspace_creator.status in ('suspended', 'closed') then
    raise exception using errcode = 'P0001', message = 'creator_workspace_invitation_forbidden';
  end if;

  update pci.workspace_creators
  set status = 'active',
      activated_at = coalesce(activated_at, now())
  where workspace_creator_id = v_workspace_creator.workspace_creator_id
  returning * into v_workspace_creator;

  update pci.creator_invitations
  set status = 'accepted',
      accepted_at = now(),
      accepted_by_auth_user_id = p_actor_user_id
  where invitation_id = p_invitation_id;

  perform pci.append_event(
    p_request_id,
    v_invitation.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator.creator_id,
    'creator_invitation',
    p_invitation_id,
    'creator.invitation_accepted',
    'pending',
    'accepted',
    null,
    jsonb_build_object('workspace_creator_id', v_workspace_creator.workspace_creator_id)
  );

  perform pci.append_event(
    p_request_id,
    v_invitation.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator.creator_id,
    'workspace_creator',
    v_workspace_creator.workspace_creator_id,
    'creator.workspace_relationship_activated',
    'invited',
    'active',
    null,
    '{}'::jsonb
  );

  v_result := jsonb_build_object(
    'ok', true,
    'creator_id', v_creator.creator_id,
    'workspace_id', v_invitation.workspace_id,
    'workspace_creator_id', v_workspace_creator.workspace_creator_id,
    'invitation_id', p_invitation_id,
    'status', 'active'
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'creator_invitation',
      result_entity_id = p_invitation_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator.creator_id
    and command_name = 'creator_claim_invitation'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

revoke execute on function pci_api.creator_claim_invitation(uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function pci_api.creator_claim_invitation(uuid, uuid, uuid, uuid, text)
  to service_role;

commit;
