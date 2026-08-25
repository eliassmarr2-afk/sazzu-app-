-- PCI 2.1T.1 · Lightweight Creator application review
-- Runtime-test first. Production must not be touched directly.
--
-- Goal:
--   pending self-registration -> Protocol review -> approved/rejected
-- Approval DOES NOT activate the Creator. It only snapshots the exact
-- legal documents that must be accepted before activation.

begin;

alter table pci.workspace_creators
  add column if not exists application_review_decision text,
  add column if not exists application_reviewed_at timestamptz,
  add column if not exists application_reviewed_by_user_id uuid,
  add column if not exists application_legal_requirements_snapshot jsonb
    not null
    default '[]'::jsonb;

alter table pci.workspace_creators
  drop constraint if exists workspace_creators_application_review_decision_check;

alter table pci.workspace_creators
  add constraint workspace_creators_application_review_decision_check
  check (
    application_review_decision is null
    or application_review_decision in (
      'approved',
      'rejected'
    )
  );

alter table pci.workspace_creators
  drop constraint if exists workspace_creators_application_review_state_check;

alter table pci.workspace_creators
  add constraint workspace_creators_application_review_state_check
  check (
    (
      application_review_decision is null
      and application_reviewed_at is null
      and application_legal_requirements_snapshot = '[]'::jsonb
    )
    or
    (
      application_review_decision = 'approved'
      and application_reviewed_at is not null
      and jsonb_typeof(
        application_legal_requirements_snapshot
      ) = 'array'
      and jsonb_array_length(
        application_legal_requirements_snapshot
      ) > 0
    )
    or
    (
      application_review_decision = 'rejected'
      and application_reviewed_at is not null
      and application_legal_requirements_snapshot = '[]'::jsonb
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'workspace_creators_application_reviewed_by_user_id_fkey'
      and conrelid =
        'pci.workspace_creators'::regclass
  ) then
    alter table pci.workspace_creators
      add constraint workspace_creators_application_reviewed_by_user_id_fkey
      foreign key (
        application_reviewed_by_user_id
      )
      references auth.users(id)
      on delete set null;
  end if;
end;
$$;

create or replace function pci_api.admin_review_creator_application(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_creator_id uuid,
  p_decision text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_decision text :=
    lower(
      btrim(
        coalesce(
          p_decision,
          ''
        )
      )
    );

  v_creator pci.creators%rowtype;
  v_relationship pci.workspace_creators%rowtype;

  v_legal_snapshot jsonb :=
    '[]'::jsonb;

  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;

  v_result jsonb;
begin
  if
    p_actor_user_id is null
    or nullif(
      btrim(
        coalesce(
          p_workspace_id,
          ''
        )
      ),
      ''
    ) is null
    or p_creator_id is null
    or p_idempotency_key is null
    or p_request_id is null
  then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_application_review_context_required';
  end if;

  if v_decision not in (
    'approved',
    'rejected'
  ) then
    raise exception
      using errcode = '22023',
      message = 'pci_creator_application_review_decision_invalid';
  end if;

  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select c.*
  into v_creator
  from pci.creators c
  where c.creator_id = p_creator_id
  for update;

  if v_creator.creator_id is null then
    raise exception
      using errcode = 'P0002',
      message = 'pci_creator_not_found';
  end if;

  select wc.*
  into v_relationship
  from pci.workspace_creators wc
  where
    wc.workspace_id = p_workspace_id
    and wc.creator_id = p_creator_id
  for update;

  if v_relationship.workspace_creator_id is null then
    raise exception
      using errcode = 'P0002',
      message = 'pci_workspace_creator_not_found';
  end if;

  if
    v_relationship.status <> 'pending'
  then
    raise exception
      using errcode = '23514',
      message = 'pci_creator_application_not_pending';
  end if;

  if
    v_relationship.application_review_decision
      is not null
  then
    raise exception
      using errcode = '23514',
      message = 'pci_creator_application_already_reviewed';
  end if;

  if v_decision = 'approved' then
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'legal_document_id',
            d.legal_document_id,
            'document_type',
            d.document_type,
            'document_version',
            d.document_version,
            'title',
            d.title,
            'document_hash',
            d.document_hash,
            'content_ref',
            d.content_ref
          )
          order by
            d.document_type,
            d.document_version
        ),
        '[]'::jsonb
      )
    into v_legal_snapshot
    from pci.creator_legal_documents d
    where
      d.workspace_id = p_workspace_id
      and d.status = 'published'
      and d.required_for_activation = true;

    if
      jsonb_array_length(
        v_legal_snapshot
      ) = 0
    then
      raise exception
        using errcode = '23514',
        message =
          'pci_creator_application_required_legal_documents_missing';
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
    'operator',
    p_actor_user_id,
    p_creator_id,
    p_workspace_id,
    'admin_review_creator_application',
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
      cr.actor_type = 'operator'
      and cr.actor_user_id =
        p_actor_user_id
      and cr.actor_creator_id =
        p_creator_id
      and cr.command_name =
        'admin_review_creator_application'
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
        message =
          'pci_idempotency_conflict';
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
      message =
        'pci_command_already_processing';
  end if;

  if v_decision = 'approved' then
    update pci.workspace_creators
    set
      application_review_decision =
        'approved',
      application_reviewed_at =
        now(),
      application_reviewed_by_user_id =
        p_actor_user_id,
      application_legal_requirements_snapshot =
        v_legal_snapshot
    where
      workspace_creator_id =
        v_relationship.workspace_creator_id
    returning *
    into v_relationship;

    perform pci.append_event(
      p_workspace_id,
      'operator',
      p_actor_user_id,
      p_creator_id,
      'workspace_creator',
      v_relationship.workspace_creator_id,
      'creator.application_approved',
      'pending',
      'pending',
      p_request_id,
      v_receipt_id,
      jsonb_build_object(
        'legal_requirements_snapshot',
        v_legal_snapshot,
        'required_legal_document_count',
        jsonb_array_length(
          v_legal_snapshot
        )
      )
    );
  else
    update pci.workspace_creators
    set
      application_review_decision =
        'rejected',
      application_reviewed_at =
        now(),
      application_reviewed_by_user_id =
        p_actor_user_id,
      application_legal_requirements_snapshot =
        '[]'::jsonb,
      status =
        'closed',
      closed_at =
        coalesce(
          closed_at,
          now()
        )
    where
      workspace_creator_id =
        v_relationship.workspace_creator_id
    returning *
    into v_relationship;

    if not exists (
      select 1
      from pci.workspace_creators wc
      where
        wc.creator_id =
          p_creator_id
        and wc.workspace_creator_id
          is distinct from
            v_relationship.workspace_creator_id
        and wc.status in (
          'pending',
          'invited',
          'active',
          'restricted',
          'suspended'
        )
    ) then
      update pci.creators
      set status = 'closed'
      where
        creator_id = p_creator_id
        and status = 'pending';

      select *
      into v_creator
      from pci.creators c
      where
        c.creator_id =
          p_creator_id;
    end if;

    perform pci.append_event(
      p_workspace_id,
      'operator',
      p_actor_user_id,
      p_creator_id,
      'workspace_creator',
      v_relationship.workspace_creator_id,
      'creator.application_rejected',
      'pending',
      'closed',
      p_request_id,
      v_receipt_id,
      '{}'::jsonb
    );
  end if;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'creator_id',
      p_creator_id,
      'creator_status',
      v_creator.status,
      'workspace_id',
      p_workspace_id,
      'workspace_creator_id',
      v_relationship.workspace_creator_id,
      'relationship_status',
      v_relationship.status,
      'application_review_decision',
      v_relationship.application_review_decision,
      'application_reviewed_at',
      v_relationship.application_reviewed_at,
      'required_legal_documents',
      v_relationship.application_legal_requirements_snapshot,
      'next_action',
      case
        when v_decision = 'approved'
          then 'creator_accept_legal_documents'
        else null
      end
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
    completed_at =
      now()
  where
    command_receipt_id =
      v_receipt_id;

  return v_result;
end;
$function$;

revoke all
on function pci_api.admin_review_creator_application(
  uuid,
  text,
  uuid,
  text,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function pci_api.admin_review_creator_application(
  uuid,
  text,
  uuid,
  text,
  uuid,
  uuid
)
to service_role;


create or replace function pci_api.admin_creator_application_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_creator_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select
    jsonb_build_object(
      'ok',
      true,
      'workspace_id',
      wc.workspace_id,
      'creator_id',
      c.creator_id,
      'display_name',
      c.display_name,
      'email',
      c.email,
      'creator_status',
      c.status,
      'profile_metadata',
      c.profile_metadata,
      'relationship',
      jsonb_build_object(
        'workspace_creator_id',
        wc.workspace_creator_id,
        'status',
        wc.status,
        'specialty_tags',
        wc.specialty_tags,
        'created_at',
        wc.created_at,
        'application_review_decision',
        wc.application_review_decision,
        'application_reviewed_at',
        wc.application_reviewed_at,
        'application_reviewed_by_user_id',
        wc.application_reviewed_by_user_id,
        'required_legal_documents',
        wc.application_legal_requirements_snapshot
      )
    )
  into v_result
  from pci.workspace_creators wc
  join pci.creators c
    on c.creator_id =
      wc.creator_id
  where
    wc.workspace_id =
      p_workspace_id
    and wc.creator_id =
      p_creator_id;

  if v_result is null then
    raise exception
      using errcode = 'P0002',
      message =
        'pci_creator_application_not_found';
  end if;

  return v_result;
end;
$function$;

revoke all
on function pci_api.admin_creator_application_context(
  uuid,
  text,
  uuid
)
from public, anon, authenticated;

grant execute
on function pci_api.admin_creator_application_context(
  uuid,
  text,
  uuid
)
to service_role;


create or replace function pci_api.creator_onboarding_state(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_creator pci.creators%rowtype;
begin
  select *
  into v_creator
  from pci.creators c
  where
    c.auth_user_id =
      p_actor_user_id;

  if v_creator.creator_id is null then
    return jsonb_build_object(
      'ok',
      true,
      'linked',
      false,
      'creator_status',
      null,
      'relationships',
      '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'ok',
    true,
    'linked',
    true,
    'creator_id',
    v_creator.creator_id,
    'display_name',
    v_creator.display_name,
    'creator_status',
    v_creator.status,
    'relationships',
    coalesce(
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'workspace_id',
              wc.workspace_id,
              'workspace_creator_id',
              wc.workspace_creator_id,
              'status',
              wc.status,
              'activated_at',
              wc.activated_at,

              'registration_application',
              case
                when
                  wc.status = 'pending'
                  or
                  wc.application_review_decision
                    is not null
                then
                  jsonb_build_object(
                    'decision',
                    wc.application_review_decision,
                    'reviewed_at',
                    wc.application_reviewed_at,
                    'required_legal_documents',
                    wc.application_legal_requirements_snapshot,
                    'accepted_legal_document_ids',
                    coalesce(
                      (
                        select
                          jsonb_agg(
                            ca.legal_document_id
                            order by
                              ca.accepted_at
                          )
                        from
                          pci.creator_legal_acceptances ca
                        where
                          ca.creator_id =
                            v_creator.creator_id
                          and ca.workspace_id =
                            wc.workspace_id
                          and ca.invitation_id
                            is null
                      ),
                      '[]'::jsonb
                    )
                  )
                else null
              end,

              'latest_invitation',
              (
                select
                  jsonb_build_object(
                    'invitation_id',
                    i.invitation_id,
                    'status',
                    i.status,
                    'expires_at',
                    i.expires_at,
                    'required_legal_documents',
                    i.legal_requirements_snapshot,
                    'accepted_legal_document_ids',
                    coalesce(
                      (
                        select
                          jsonb_agg(
                            ca.legal_document_id
                          )
                        from
                          pci.creator_legal_acceptances ca
                        where
                          ca.creator_id =
                            v_creator.creator_id
                          and ca.invitation_id =
                            i.invitation_id
                      ),
                      '[]'::jsonb
                    )
                  )
                from
                  pci.creator_invitations i
                where
                  i.workspace_creator_id =
                    wc.workspace_creator_id
                order by
                  i.created_at desc
                limit 1
              )
            )
            order by
              wc.created_at
          )
        from
          pci.workspace_creators wc
        where
          wc.creator_id =
            v_creator.creator_id
      ),
      '[]'::jsonb
    )
  );
end;
$function$;

revoke all
on function pci_api.creator_onboarding_state(
  uuid
)
from public, anon, authenticated;

grant execute
on function pci_api.creator_onboarding_state(
  uuid
)
to service_role;

commit;
