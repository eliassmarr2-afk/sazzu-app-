-- PCI 2.1T.4 · Self-registration legal acceptance + activation
-- Runtime-test first. Production must not be touched directly.
--
-- Goal:
--   approved self-registration
--   -> accept exact legal snapshot
--   -> activate only when every required document is accepted
--
-- Invitation onboarding remains intact and keeps its own command.

begin;


create or replace function
  pci.assert_workspace_creator_activation_has_legal_acceptance()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_invitation
    pci.creator_invitations%rowtype;

  v_snapshot jsonb;
  v_onboarding_basis text;
  v_missing integer;
begin
  if
    new.status <> 'active'
    or old.status is not distinct from 'active'
  then
    return null;
  end if;

  select *
  into v_invitation
  from pci.creator_invitations i
  where
    i.workspace_creator_id =
      new.workspace_creator_id
    and i.status = 'accepted'
  order by
    i.accepted_at desc
  limit 1;

  if
    v_invitation.invitation_id
      is not null
  then
    v_snapshot :=
      v_invitation
        .legal_requirements_snapshot;

    v_onboarding_basis :=
      'accepted_invitation';

  elsif
    new.application_review_decision =
      'approved'
    and jsonb_typeof(
      new.application_legal_requirements_snapshot
    ) = 'array'
    and jsonb_array_length(
      new.application_legal_requirements_snapshot
    ) > 0
  then
    v_snapshot :=
      new.application_legal_requirements_snapshot;

    v_onboarding_basis :=
      'approved_registration_application';

  else
    raise exception
      using
        errcode = '23514',
        message =
          'pci_workspace_creator_activation_requires_onboarding_basis';
  end if;

  select count(*)
  into v_missing
  from jsonb_array_elements(
    v_snapshot
  ) req
  where not exists (
    select 1
    from pci.creator_legal_acceptances ca
    where
      ca.creator_id =
        new.creator_id
      and ca.workspace_id =
        new.workspace_id
      and ca.legal_document_id =
        (req->>'legal_document_id')::uuid
      and lower(
        ca.document_hash
      ) = lower(
        req->>'document_hash'
      )
  );

  if v_missing > 0 then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_workspace_creator_activation_requires_legal_acceptance';
  end if;

  return null;
end;
$function$;


create or replace function
  pci_api.creator_accept_registration_legal_document(
    p_actor_user_id uuid,
    p_workspace_id text,
    p_legal_document_id uuid,
    p_document_hash text,
    p_accepted_from_ip inet,
    p_accepted_user_agent text,
    p_idempotency_key uuid,
    p_request_id uuid
  )
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_hash text :=
    lower(
      btrim(
        coalesce(
          p_document_hash,
          ''
        )
      )
    );

  v_creator
    pci.creators%rowtype;

  v_relationship
    pci.workspace_creators%rowtype;

  v_document
    pci.creator_legal_documents%rowtype;

  v_requirement jsonb;
  v_receipt_id uuid;
  v_existing
    pci.command_receipts%rowtype;
  v_acceptance_id uuid;
  v_missing integer;
  v_activated boolean :=
    false;
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
    or p_legal_document_id is null
    or p_idempotency_key is null
    or p_request_id is null
    or v_hash !~
      '^[0-9a-f]{64}$'
  then
    raise exception
      using
        errcode = '22023',
        message =
          'pci_registration_legal_acceptance_context_invalid';
  end if;

  select *
  into v_creator
  from pci.creators c
  where
    c.auth_user_id =
      p_actor_user_id
  for update;

  if
    v_creator.creator_id
      is null
  then
    raise exception
      using
        errcode = '42501',
        message =
          'pci_creator_not_linked';
  end if;

  if
    v_creator.status in (
      'restricted',
      'suspended',
      'closed'
    )
  then
    raise exception
      using
        errcode = '42501',
        message =
          'pci_creator_not_activatable';
  end if;

  select *
  into v_relationship
  from pci.workspace_creators wc
  where
    wc.workspace_id =
      p_workspace_id
    and wc.creator_id =
      v_creator.creator_id
  for update;

  if
    v_relationship
      .workspace_creator_id
      is null
  then
    raise exception
      using
        errcode = 'P0002',
        message =
          'pci_workspace_creator_not_found';
  end if;

  if
    v_relationship.status =
      'active'
  then
    return jsonb_build_object(
      'ok',
      true,
      'creator_id',
      v_creator.creator_id,
      'workspace_id',
      p_workspace_id,
      'workspace_creator_status',
      'active',
      'workspace_activated',
      true,
      'idempotent_replay',
      true
    );
  end if;

  if
    v_relationship.status <>
      'pending'
  then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_registration_relationship_not_pending';
  end if;

  if
    v_relationship
      .application_review_decision
      is distinct from
        'approved'
  then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_registration_application_not_approved';
  end if;

  if
    jsonb_typeof(
      v_relationship
        .application_legal_requirements_snapshot
    ) <> 'array'
    or jsonb_array_length(
      v_relationship
        .application_legal_requirements_snapshot
    ) = 0
  then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_registration_legal_snapshot_missing';
  end if;

  select value
  into v_requirement
  from jsonb_array_elements(
    v_relationship
      .application_legal_requirements_snapshot
  ) value
  where
    value->>'legal_document_id' =
      p_legal_document_id::text
  limit 1;

  if v_requirement is null then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_legal_document_not_required_by_registration';
  end if;

  if
    lower(
      coalesce(
        v_requirement
          ->>'document_hash',
        ''
      )
    ) is distinct from
      v_hash
  then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_legal_document_hash_mismatch';
  end if;

  select *
  into v_document
  from pci.creator_legal_documents d
  where
    d.legal_document_id =
      p_legal_document_id;

  if
    v_document
      .legal_document_id
      is null
  then
    raise exception
      using
        errcode = 'P0002',
        message =
          'pci_legal_document_not_found';
  end if;

  if
    v_document.workspace_id
      is distinct from
        p_workspace_id
    or v_document.document_type
      is distinct from
        v_requirement
          ->>'document_type'
    or v_document.document_version
      is distinct from
        v_requirement
          ->>'document_version'
    or lower(
      v_document.document_hash
    ) is distinct from
      v_hash
  then
    raise exception
      using
        errcode = '23514',
        message =
          'pci_legal_document_snapshot_mismatch';
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
    'creator_accept_registration_legal_document',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning
    command_receipt_id
  into v_receipt_id;

  if
    v_receipt_id
      is null
  then
    select *
    into v_existing
    from pci.command_receipts cr
    where
      cr.actor_type =
        'creator'
      and cr.actor_user_id =
        p_actor_user_id
      and cr.actor_creator_id =
        v_creator.creator_id
      and cr.command_name =
        'creator_accept_registration_legal_document'
      and cr.idempotency_key =
        p_idempotency_key
    order by
      cr.created_at desc
    limit 1;

    if
      v_existing
        .command_receipt_id
        is null
    then
      raise exception
        using
          errcode = '23505',
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
      using
        errcode = '40001',
        message =
          'pci_command_already_processing';
  end if;

  insert into
    pci.creator_legal_acceptances (
      creator_id,
      workspace_id,
      legal_document_id,
      invitation_id,
      document_type,
      document_version,
      document_hash,
      accepted_from_ip,
      accepted_user_agent,
      accepted_at
    )
  values (
    v_creator.creator_id,
    p_workspace_id,
    v_document.legal_document_id,
    null,
    v_document.document_type,
    v_document.document_version,
    v_document.document_hash,
    p_accepted_from_ip,
    left(
      nullif(
        btrim(
          coalesce(
            p_accepted_user_agent,
            ''
          )
        ),
        ''
      ),
      1000
    ),
    now()
  )
  on conflict do nothing
  returning
    legal_acceptance_id
  into v_acceptance_id;

  if
    v_acceptance_id
      is null
  then
    select
      ca.legal_acceptance_id
    into v_acceptance_id
    from
      pci.creator_legal_acceptances ca
    where
      ca.creator_id =
        v_creator.creator_id
      and ca.workspace_id =
        p_workspace_id
      and ca.legal_document_id =
        v_document.legal_document_id
      and ca.document_type =
        v_document.document_type
      and ca.document_version =
        v_document.document_version
      and lower(
        ca.document_hash
      ) = lower(
        v_document.document_hash
      )
    order by
      ca.accepted_at desc
    limit 1;

    if
      v_acceptance_id
        is null
    then
      raise exception
        using
          errcode = '23505',
          message =
            'pci_registration_legal_acceptance_conflict';
    end if;
  end if;

  select count(*)
  into v_missing
  from jsonb_array_elements(
    v_relationship
      .application_legal_requirements_snapshot
  ) req
  where not exists (
    select 1
    from
      pci.creator_legal_acceptances ca
    where
      ca.creator_id =
        v_creator.creator_id
      and ca.workspace_id =
        p_workspace_id
      and ca.legal_document_id =
        (req->>'legal_document_id')::uuid
      and lower(
        ca.document_hash
      ) = lower(
        req->>'document_hash'
      )
  );

  if
    v_missing = 0
  then
    update pci.creators
    set
      status =
        'active'
    where
      creator_id =
        v_creator.creator_id
      and status =
        'pending';

    update pci.workspace_creators
    set
      status =
        'active',
      activated_at =
        coalesce(
          activated_at,
          now()
        )
    where
      workspace_creator_id =
        v_relationship
          .workspace_creator_id
      and status =
        'pending';

    v_activated :=
      true;
  end if;

  perform pci.append_event(
    p_workspace_id,
    'creator',
    p_actor_user_id,
    v_creator.creator_id,
    'creator_legal_acceptance',
    v_acceptance_id,
    'creator.registration_legal_document_accepted',
    null,
    'accepted',
    p_request_id,
    v_receipt_id,
    jsonb_build_object(
      'legal_document_id',
      v_document.legal_document_id,
      'document_type',
      v_document.document_type,
      'document_version',
      v_document.document_version,
      'registration_application',
      true,
      'workspace_activated',
      v_activated
    )
  );

  if v_activated then
    perform pci.append_event(
      p_workspace_id,
      'system',
      null,
      v_creator.creator_id,
      'workspace_creator',
      v_relationship
        .workspace_creator_id,
      'workspace_creator.registration_activated',
      'pending',
      'active',
      p_request_id,
      v_receipt_id,
      jsonb_build_object(
        'application_reviewed_at',
        v_relationship
          .application_reviewed_at,
        'required_legal_document_count',
        jsonb_array_length(
          v_relationship
            .application_legal_requirements_snapshot
        )
      )
    );
  end if;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'creator_id',
      v_creator.creator_id,
      'workspace_id',
      p_workspace_id,
      'legal_acceptance_id',
      v_acceptance_id,
      'legal_document_id',
      v_document.legal_document_id,
      'document_type',
      v_document.document_type,
      'document_version',
      v_document.document_version,
      'remaining_required_documents',
      v_missing,
      'workspace_activated',
      v_activated,
      'workspace_creator_status',
      case
        when v_activated
          then 'active'
        else 'pending'
      end
    );

  update pci.command_receipts
  set
    status =
      'completed',
    result_entity_type =
      'creator_legal_acceptance',
    result_entity_id =
      v_acceptance_id,
    response_snapshot =
      v_result,
    completed_at =
      now()
  where
    command_receipt_id =
      v_receipt_id;

  return
    v_result;
end;
$function$;


revoke all
on function
  pci_api.creator_accept_registration_legal_document(
    uuid,
    text,
    uuid,
    text,
    inet,
    text,
    uuid,
    uuid
  )
from
  public,
  anon,
  authenticated;


grant execute
on function
  pci_api.creator_accept_registration_legal_document(
    uuid,
    text,
    uuid,
    text,
    inet,
    text,
    uuid,
    uuid
  )
to service_role;


comment on function
  pci_api.creator_accept_registration_legal_document(
    uuid,
    text,
    uuid,
    text,
    inet,
    text,
    uuid,
    uuid
  )
is
  'Accepts one exact legal document from an approved Creator self-registration snapshot and activates the workspace relationship only after every required snapshot document is accepted.';


commit;
