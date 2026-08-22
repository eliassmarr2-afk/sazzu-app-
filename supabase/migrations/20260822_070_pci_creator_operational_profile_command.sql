-- Protocol Creative Insights (PCI)
-- 2.1H.1B.1A
-- Operator command: update Creator operational profile.
--
-- Scope is deliberately narrow:
--   - provider_tier
--   - specialty_tags
--   - max_simultaneous_jobs
--   - max_open_obligations
--
-- This command MUST NOT modify relationship status,
-- global Creator status, payments, Rights, purchases,
-- invitations, submissions or assets.

create or replace function pci_api.admin_update_creator_operational_profile(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_creator_id uuid,
  p_provider_tier text,
  p_specialty_tags text[],
  p_max_simultaneous_jobs integer,
  p_max_open_obligations integer,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_relationship pci.workspace_creators%rowtype;

  v_provider_tier text;
  v_specialty_tags text[];

  v_old_profile jsonb;
  v_new_profile jsonb;
  v_changed boolean;

  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if
    p_creator_id is null or
    p_idempotency_key is null or
    p_request_id is null
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_operational_profile_context_required';
  end if;

  v_provider_tier :=
    nullif(
      lower(
        btrim(
          coalesce(
            p_provider_tier,
            ''
          )
        )
      ),
      ''
    );

  if
    v_provider_tier is not null
    and v_provider_tier not in (
      'approved',
      'preferred'
    )
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_provider_tier_invalid';
  end if;

  if
    p_max_simultaneous_jobs is not null
    and p_max_simultaneous_jobs <= 0
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_limit_invalid';
  end if;

  if
    p_max_open_obligations is not null
    and p_max_open_obligations <= 0
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_limit_invalid';
  end if;

  if
    coalesce(
      cardinality(p_specialty_tags),
      0
    ) > 20
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_specialty_tags_invalid';
  end if;

  if exists (
    select 1
    from unnest(
      coalesce(
        p_specialty_tags,
        '{}'::text[]
      )
    ) as tag(value)
    where
      nullif(
        btrim(tag.value),
        ''
      ) is null
      or char_length(
        btrim(tag.value)
      ) > 60
  )
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_specialty_tags_invalid';
  end if;

  select
    coalesce(
      array_agg(cleaned.value order by cleaned.ordinality),
      '{}'::text[]
    )
  into v_specialty_tags
  from (
    select distinct on (
      lower(
        btrim(tag.value)
      )
    )
      btrim(tag.value) as value,
      tag.ordinality
    from unnest(
      coalesce(
        p_specialty_tags,
        '{}'::text[]
      )
    ) with ordinality as tag(value, ordinality)
    order by
      lower(
        btrim(tag.value)
      ),
      tag.ordinality
  ) as cleaned;

  select *
  into v_relationship
  from pci.workspace_creators wc
  where
    wc.workspace_id = p_workspace_id
    and wc.creator_id = p_creator_id
  for update;

  if
    v_relationship.workspace_creator_id
    is null
  then
    raise exception
      using errcode = 'P0002',
      message = 'pci_workspace_creator_not_found';
  end if;

  v_old_profile :=
    jsonb_build_object(
      'provider_tier',
      v_relationship.provider_tier,
      'specialty_tags',
      to_jsonb(
        v_relationship.specialty_tags
      ),
      'max_simultaneous_jobs',
      v_relationship.max_simultaneous_jobs,
      'max_open_obligations',
      v_relationship.max_open_obligations
    );

  v_new_profile :=
    jsonb_build_object(
      'provider_tier',
      v_provider_tier,
      'specialty_tags',
      to_jsonb(
        v_specialty_tags
      ),
      'max_simultaneous_jobs',
      p_max_simultaneous_jobs,
      'max_open_obligations',
      p_max_open_obligations
    );

  v_changed :=
    v_old_profile is distinct from
    v_new_profile;

  insert into pci.command_receipts (
    idempotency_key,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_id,
    status
  )
  values (
    p_idempotency_key,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_update_creator_operational_profile',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning
    command_receipt_id
  into v_receipt_id;

  if v_receipt_id is null then
    select *
    into v_existing
    from pci.command_receipts cr
    where
      cr.actor_type = 'operator'
      and cr.actor_user_id =
        p_actor_user_id
      and cr.actor_creator_id is null
      and cr.command_name =
        'admin_update_creator_operational_profile'
      and cr.idempotency_key =
        p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if
      v_existing.command_receipt_id
      is null
    then
      raise exception
        using errcode = '23505',
        message = 'pci_idempotency_conflict';
    end if;

    if
      v_existing.status =
      'completed'
    then
      return
        v_existing.response_snapshot;
    end if;

    raise exception
      using errcode = '40001',
      message = 'pci_command_already_processing';
  end if;

  if v_changed then
    update pci.workspace_creators
    set
      provider_tier =
        v_provider_tier,
      specialty_tags =
        v_specialty_tags,
      max_simultaneous_jobs =
        p_max_simultaneous_jobs,
      max_open_obligations =
        p_max_open_obligations
    where
      workspace_creator_id =
        v_relationship.workspace_creator_id;

    perform pci.append_event(
      p_workspace_id,
      'operator',
      p_actor_user_id,
      null,
      'workspace_creator',
      v_relationship.workspace_creator_id,
      'workspace_creator.operational_profile_updated',
      v_relationship.status,
      v_relationship.status,
      p_request_id,
      v_receipt_id,
      jsonb_build_object(
        'creator_id',
        p_creator_id,
        'old_profile',
        v_old_profile,
        'new_profile',
        v_new_profile
      )
    );
  end if;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'creator_id',
      p_creator_id,
      'workspace_creator_id',
      v_relationship.workspace_creator_id,
      'relationship_status',
      v_relationship.status,
      'changed',
      v_changed,
      'operational_profile',
      v_new_profile
    );

  update pci.command_receipts
  set
    status = 'completed',
    result_entity_type =
      'workspace_creator',
    result_entity_id =
      v_relationship.workspace_creator_id,
    response_snapshot =
      v_result,
    completed_at = now()
  where
    command_receipt_id =
      v_receipt_id;

  return v_result;
end;
$$;

revoke all on function
  pci_api.admin_update_creator_operational_profile(
    uuid,
    text,
    uuid,
    text,
    text[],
    integer,
    integer,
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  pci_api.admin_update_creator_operational_profile(
    uuid,
    text,
    uuid,
    text,
    text[],
    integer,
    integer,
    uuid,
    uuid
  )
to service_role;

comment on function
  pci_api.admin_update_creator_operational_profile(
    uuid,
    text,
    uuid,
    text,
    text[],
    integer,
    integer,
    uuid,
    uuid
  )
is
  'Updates only the workspace-scoped operational profile of a Creator. Does not modify relationship status, global Creator state, payments, Rights, purchases or assets.';
