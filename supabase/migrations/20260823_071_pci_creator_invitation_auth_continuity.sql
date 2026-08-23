-- Protocol Creative Insights
-- 2.1H.1B.2C.1a
-- Preserve Auth identity continuity when an invitation is superseded.
--
-- A previous Supabase Invite may already have created auth.users while
-- pci.creators.auth_user_id remains null until Creator bootstrap.
-- Re-invitations must reuse the prior auth_user_id_snapshot so delivery
-- switches to Magic Link instead of attempting another Supabase Invite.

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
  v_historical_auth_user_id uuid;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select *
  into v_invitation
  from pci.creator_invitations i
  where i.invitation_id = p_invitation_id
    and i.workspace_id = p_workspace_id;

  if v_invitation.invitation_id is null then
    raise exception
      using errcode='P0002',
      message='pci_creator_invitation_not_found';
  end if;

  select *
  into v_creator
  from pci.creators c
  where c.creator_id = v_invitation.creator_id;

  select i.auth_user_id_snapshot
  into v_historical_auth_user_id
  from pci.creator_invitations i
  where i.workspace_id = p_workspace_id
    and i.creator_id = v_invitation.creator_id
    and lower(i.email_snapshot) =
        lower(v_invitation.email_snapshot)
    and i.auth_user_id_snapshot is not null
  order by
    i.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok',
    true,
    'invitation_id',
    v_invitation.invitation_id,
    'creator_id',
    v_invitation.creator_id,
    'email',
    v_invitation.email_snapshot,
    'status',
    v_invitation.status,
    'delivery_status',
    v_invitation.delivery_status,
    'delivery_method',
    v_invitation.delivery_method,
    'expires_at',
    v_invitation.expires_at,
    'auth_user_id',
    coalesce(
      v_invitation.auth_user_id_snapshot,
      v_creator.auth_user_id,
      v_historical_auth_user_id
    )
  );
end;
$$;

revoke all
on function pci_api.admin_creator_invitation_delivery_context(
  uuid,
  text,
  uuid
)
from public, anon, authenticated;

grant execute
on function pci_api.admin_creator_invitation_delivery_context(
  uuid,
  text,
  uuid
)
to service_role;
