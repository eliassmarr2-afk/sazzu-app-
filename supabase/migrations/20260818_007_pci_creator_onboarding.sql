-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Creator onboarding by verified email invitation
--
-- A Creator is not a Protocol workspace member. Protocol prepares a commercial
-- invitation; Supabase Auth verifies the person's email; PCI then links the
-- authenticated user to the pre-existing creator record when the invitation is
-- explicitly claimed.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- ADMIN COMMAND: prepare creator + workspace invitation.
-- Email delivery is queued in outbox and remains a separate side effect.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_prepare_creator_invitation(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt pci.command_receipts%rowtype;
  v_creator pci.creators%rowtype;
  v_workspace_creator pci.workspace_creators%rowtype;
  v_invitation pci.creator_invitations%rowtype;
  v_email text;
  v_display_name text;
  v_expires_hours integer;
  v_created_creator boolean := false;
  v_created_invitation boolean := false;
  v_result jsonb;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);
  perform pci.lock_command_key(
    'operator:' || p_actor_user_id::text || ':admin_prepare_creator_invitation',
    p_idempotency_key
  );

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'operator'
    and r.actor_user_id = p_actor_user_id
    and r.command_name = 'admin_prepare_creator_invitation'
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

  v_email := lower(nullif(btrim(p_payload->>'email'), ''));
  v_display_name := nullif(btrim(p_payload->>'display_name'), '');
  v_expires_hours := coalesce((p_payload->>'expires_hours')::integer, 168);

  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = 'P0001', message = 'invalid_creator_email';
  end if;
  if v_display_name is null then
    raise exception using errcode = 'P0001', message = 'creator_display_name_required';
  end if;
  if v_expires_hours < 1 or v_expires_hours > 720 then
    raise exception using errcode = 'P0001', message = 'invalid_invitation_expiry';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_prepare_creator_invitation',
    p_request_hash,
    'processing'
  );

  select c.* into v_creator
  from pci.creators c
  where lower(c.email) = v_email
  for update;

  if v_creator.creator_id is null then
    insert into pci.creators (
      email,
      display_name,
      legal_name,
      phone,
      status,
      profile_metadata
    ) values (
      v_email,
      v_display_name,
      nullif(btrim(p_payload->>'legal_name'), ''),
      nullif(btrim(p_payload->>'phone'), ''),
      'pending',
      '{}'::jsonb
    )
    returning * into v_creator;
    v_created_creator := true;
  elsif v_creator.status = 'closed' then
    raise exception using errcode = 'P0001', message = 'creator_account_closed';
  end if;

  select wc.* into v_workspace_creator
  from pci.workspace_creators wc
  where wc.workspace_id = p_workspace_id
    and wc.creator_id = v_creator.creator_id
  for update;

  if v_workspace_creator.workspace_creator_id is null then
    insert into pci.workspace_creators (
      workspace_id,
      creator_id,
      status,
      specialties,
      invited_at
    ) values (
      p_workspace_id,
      v_creator.creator_id,
      'invited',
      coalesce(
        array(select jsonb_array_elements_text(coalesce(p_payload->'specialties', '[]'::jsonb))),
        '{}'::text[]
      ),
      now()
    )
    returning * into v_workspace_creator;
  elsif v_workspace_creator.status = 'active' then
    raise exception using errcode = 'P0001', message = 'creator_already_active_in_workspace';
  elsif v_workspace_creator.status in ('suspended', 'closed') then
    raise exception using errcode = 'P0001', message = 'creator_workspace_invitation_forbidden';
  else
    update pci.workspace_creators
    set status = 'invited',
        invited_at = coalesce(invited_at, now()),
        specialties = case
          when jsonb_typeof(coalesce(p_payload->'specialties', 'null'::jsonb)) = 'array'
          then array(select jsonb_array_elements_text(p_payload->'specialties'))
          else specialties
        end
    where workspace_creator_id = v_workspace_creator.workspace_creator_id
    returning * into v_workspace_creator;
  end if;

  -- Expire old pending records first. History remains preserved.
  update pci.creator_invitations
  set status = 'expired'
  where workspace_id = p_workspace_id
    and creator_id = v_creator.creator_id
    and status = 'pending'
    and expires_at <= now();

  select i.* into v_invitation
  from pci.creator_invitations i
  where i.workspace_id = p_workspace_id
    and i.creator_id = v_creator.creator_id
    and i.status = 'pending'
    and i.expires_at > now()
  order by i.created_at desc
  limit 1
  for update;

  if v_invitation.invitation_id is null then
    insert into pci.creator_invitations (
      workspace_id,
      creator_id,
      invited_email,
      status,
      expires_at,
      invited_by_user_id
    ) values (
      p_workspace_id,
      v_creator.creator_id,
      v_email,
      'pending',
      now() + make_interval(hours => v_expires_hours),
      p_actor_user_id
    )
    returning * into v_invitation;
    v_created_invitation := true;

    insert into pci.outbox (
      workspace_id,
      job_type,
      aggregate_type,
      aggregate_id,
      payload
    ) values (
      p_workspace_id,
      'notify_creator_invitation',
      'creator_invitation',
      v_invitation.invitation_id,
      jsonb_build_object(
        'invitation_id', v_invitation.invitation_id,
        'creator_id', v_creator.creator_id,
        'invited_email', v_email
      )
    );
  end if;

  perform pci.append_event(
    p_request_id,
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'creator_invitation',
    v_invitation.invitation_id,
    case when v_created_invitation then 'creator.invitation_created' else 'creator.invitation_reused' end,
    null,
    'pending',
    null,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'created_creator', v_created_creator,
      'expires_at', v_invitation.expires_at
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'creator_id', v_creator.creator_id,
    'invitation_id', v_invitation.invitation_id,
    'workspace_creator_id', v_workspace_creator.workspace_creator_id,
    'workspace_creator_status', v_workspace_creator.status,
    'email', v_email,
    'expires_at', v_invitation.expires_at,
    'auth_user_linked', v_creator.auth_user_id is not null,
    'notification_queued', v_created_invitation
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'creator_invitation',
      result_entity_id = v_invitation.invitation_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'operator'
    and actor_user_id = p_actor_user_id
    and command_name = 'admin_prepare_creator_invitation'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR QUERY: list pending invitations matching the email verified by Auth.
-- No creator identity link is required yet.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_list_pending_invitations(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_confirmed_at timestamptz;
begin
  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed_at
  from auth.users u
  where u.id = p_actor_user_id
  limit 1;

  if v_email is null then
    raise exception using errcode = 'P0001', message = 'authenticated_email_not_found';
  end if;
  if v_confirmed_at is null then
    raise exception using errcode = 'P0001', message = 'authenticated_email_not_verified';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'invitation_id', i.invitation_id,
      'workspace_id', i.workspace_id,
      'workspace_name', w.name,
      'creator_id', i.creator_id,
      'expires_at', i.expires_at,
      'created_at', i.created_at
    ) order by i.created_at desc)
    from pci.creator_invitations i
    join public.protocol_workspaces w
      on w.workspace_id = i.workspace_id
    where lower(i.invited_email) = v_email
      and i.status = 'pending'
      and i.expires_at > now()
  ), '[]'::jsonb);
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: claim one invitation using the verified Auth email.
-- This is the only normal path that links auth.users -> pci.creators.
-- --------------------------------------------------------------------------

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
  if v_invitation.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'creator_invitation_not_pending';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'creator_invitation_expired';
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

revoke execute on all functions in schema pci_api from public, anon, authenticated;
grant execute on all functions in schema pci_api to service_role;

commit;
