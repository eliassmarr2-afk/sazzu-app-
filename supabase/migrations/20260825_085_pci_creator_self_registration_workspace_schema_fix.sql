-- PCI 2.1S.4 · Fix Creator self-registration workspace schema qualification
-- Runtime-test first. Production must not be touched directly.

begin;

create or replace function pci_api.creator_self_register(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_display_name text,
  p_country text,
  p_primary_specialty text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_auth_email text;
  v_display_name text;
  v_country text;
  v_primary_specialty text;

  v_creator pci.creators%rowtype;
  v_relationship pci.workspace_creators%rowtype;

  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;

  v_result jsonb;
begin
  if
    p_actor_user_id is null
    or nullif(btrim(coalesce(p_workspace_id, '')), '') is null
    or p_idempotency_key is null
    or p_request_id is null
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_registration_context_required';
  end if;

  v_display_name :=
    nullif(
      btrim(
        coalesce(
          p_display_name,
          ''
        )
      ),
      ''
    );

  v_country :=
    nullif(
      btrim(
        coalesce(
          p_country,
          ''
        )
      ),
      ''
    );

  v_primary_specialty :=
    nullif(
      btrim(
        coalesce(
          p_primary_specialty,
          ''
        )
      ),
      ''
    );

  if
    v_display_name is null
    or char_length(v_display_name) < 2
    or char_length(v_display_name) > 120
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_registration_name_invalid';
  end if;

  if
    v_country is null
    or char_length(v_country) < 2
    or char_length(v_country) > 80
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_registration_country_invalid';
  end if;

  if
    v_primary_specialty is null
    or char_length(v_primary_specialty) < 2
    or char_length(v_primary_specialty) > 60
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_registration_specialty_invalid';
  end if;

  if not exists (
    select 1
    from public.protocol_workspaces w
    where w.workspace_id = p_workspace_id
  )
  then
    raise exception
      using errcode = 'P0002',
      message = 'pci_workspace_not_found';
  end if;

  select lower(btrim(u.email))
  into v_auth_email
  from auth.users u
  where
    u.id = p_actor_user_id
    and u.email_confirmed_at is not null;

  if v_auth_email is null then
    raise exception
      using errcode = '42501',
      message = 'pci_creator_registration_verified_email_required';
  end if;

  select *
  into v_creator
  from pci.creators c
  where
    c.auth_user_id = p_actor_user_id
    or lower(c.email) = v_auth_email
  order by
    case
      when c.auth_user_id = p_actor_user_id then 0
      else 1
    end
  limit 1
  for update;

  if v_creator.creator_id is null then
    insert into pci.creators (
      auth_user_id,
      display_name,
      email,
      status,
      profile_metadata
    )
    values (
      p_actor_user_id,
      v_display_name,
      v_auth_email,
      'pending',
      jsonb_build_object(
        'country',
        v_country,
        'primary_specialty',
        v_primary_specialty,
        'registration_source',
        'self_service'
      )
    )
    returning *
    into v_creator;
  else
    if
      v_creator.auth_user_id is not null
      and v_creator.auth_user_id is distinct from p_actor_user_id
    then
      raise exception
        using errcode = '23505',
        message = 'pci_creator_registration_email_already_linked';
    end if;

    if v_creator.status in ('closed', 'suspended') then
      raise exception
        using errcode = '23514',
        message = 'pci_creator_registration_existing_account_blocked';
    end if;

  end if;

  insert into pci.command_receipts (
    idempotency_key,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_id,
    status
  )
  values (
    p_idempotency_key,
    'creator',
    p_actor_user_id,
    v_creator.creator_id,
    p_workspace_id,
    'creator_self_register',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning command_receipt_id
  into v_receipt_id;

  if v_receipt_id is null then
    select *
    into v_existing
    from pci.command_receipts cr
    where
      cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_self_register'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing.command_receipt_id is null then
      raise exception
        using errcode = '23505',
        message = 'pci_idempotency_conflict';
    end if;

    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;

    raise exception
      using errcode = '40001',
      message = 'pci_command_already_processing';
  end if;

  update pci.creators
  set
    auth_user_id = coalesce(
      auth_user_id,
      p_actor_user_id
    ),
    display_name = v_display_name,
    profile_metadata =
      coalesce(
        profile_metadata,
        '{}'::jsonb
      )
      || jsonb_build_object(
        'country',
        v_country,
        'primary_specialty',
        v_primary_specialty,
        'registration_source',
        'self_service'
      )
  where creator_id = v_creator.creator_id
  returning *
  into v_creator;

  select *
  into v_relationship
  from pci.workspace_creators wc
  where
    wc.workspace_id = p_workspace_id
    and wc.creator_id = v_creator.creator_id
  for update;

  if v_relationship.workspace_creator_id is null then
    insert into pci.workspace_creators (
      workspace_id,
      creator_id,
      status,
      provider_tier,
      specialty_tags
    )
    values (
      p_workspace_id,
      v_creator.creator_id,
      'pending',
      null,
      array[v_primary_specialty]::text[]
    )
    returning *
    into v_relationship;

    perform pci.append_event(
      p_workspace_id,
      'creator',
      p_actor_user_id,
      v_creator.creator_id,
      'workspace_creator',
      v_relationship.workspace_creator_id,
      'creator.registration_submitted',
      null,
      'pending',
      p_request_id,
      v_receipt_id,
      jsonb_build_object(
        'creator_id',
        v_creator.creator_id,
        'email',
        v_auth_email,
        'country',
        v_country,
        'primary_specialty',
        v_primary_specialty,
        'source',
        'self_service'
      )
    );
  elsif v_relationship.status = 'invited' then
    -- An explicit Protocol invitation retains precedence.
    -- Do not convert it into a spontaneous application.
    null;
  elsif v_relationship.status in (
    'restricted',
    'suspended',
    'closed'
  ) then
    raise exception
      using errcode = '23514',
      message = 'pci_creator_registration_relationship_blocked';
  end if;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'creator_id',
      v_creator.creator_id,
      'creator_status',
      v_creator.status,
      'workspace_id',
      p_workspace_id,
      'workspace_creator_id',
      v_relationship.workspace_creator_id,
      'relationship_status',
      v_relationship.status,
      'display_name',
      v_creator.display_name,
      'email',
      v_creator.email,
      'profile_metadata',
      v_creator.profile_metadata
    );

  update pci.command_receipts
  set
    status = 'completed',
    result_entity_type = 'workspace_creator',
    result_entity_id = v_relationship.workspace_creator_id,
    response_snapshot = v_result,
    completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$function$;

revoke all
on function pci_api.creator_self_register(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function pci_api.creator_self_register(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
)
to service_role;

commit;
