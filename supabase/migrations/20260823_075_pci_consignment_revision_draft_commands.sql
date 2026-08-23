-- Protocol Creative Insights
-- 2.1I.2B.1B.1
-- Consignment revision draft lifecycle commands.


-- ================================================================
-- 1. CREATE FUTURE REVISION DRAFT
-- ================================================================

create or replace function
pci_api.admin_create_consignment_revision(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  v_consignment
    pci.consignments%rowtype;

  v_current
    pci.consignment_revisions%rowtype;

  v_existing_draft
    pci.consignment_revisions%rowtype;

  v_receipt_id uuid;
  v_existing_receipt
    pci.command_receipts%rowtype;

  v_revision_id uuid;
  v_revision_number integer;
  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if p_consignment_id is null
     or p_idempotency_key is null
     or p_request_id is null
  then
    raise exception
      using
        errcode='22023',
        message=
          'pci_consignment_revision_context_required';
  end if;


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
    'admin_create_consignment_revision',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning command_receipt_id
  into v_receipt_id;


  if v_receipt_id is null then
    select *
    into v_existing_receipt
    from pci.command_receipts cr
    where cr.actor_type='operator'
      and cr.actor_user_id=
          p_actor_user_id
      and cr.actor_creator_id is null
      and cr.command_name=
          'admin_create_consignment_revision'
      and cr.idempotency_key=
          p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing_receipt.command_receipt_id
         is null
    then
      raise exception
        using
          errcode='23505',
          message=
            'pci_idempotency_conflict';
    end if;

    if v_existing_receipt.status=
         'completed'
    then
      return
        v_existing_receipt
          .response_snapshot;
    end if;

    raise exception
      using
        errcode='40001',
        message=
          'pci_command_already_processing';
  end if;


  select *
  into v_consignment
  from pci.consignments c
  where c.workspace_id=
        p_workspace_id
    and c.consignment_id=
        p_consignment_id
  for update;


  if v_consignment.consignment_id
       is null
  then
    raise exception
      using
        errcode='P0002',
        message=
          'pci_consignment_not_found';
  end if;


  if v_consignment.status
       not in ('open','paused')
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_not_creatable';
  end if;


  if v_consignment.current_revision_id
       is null
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_required';
  end if;


  select *
  into v_current
  from pci.consignment_revisions r
  where r.consignment_revision_id=
        v_consignment.current_revision_id
    and r.consignment_id=
        v_consignment.consignment_id
  for update;


  if v_current.consignment_revision_id
       is null
     or v_current.status <>
        'published'
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_not_creatable';
  end if;


  select *
  into v_existing_draft
  from pci.consignment_revisions r
  where r.consignment_id=
        v_consignment.consignment_id
    and r.status='draft'
  limit 1;


  if v_existing_draft
       .consignment_revision_id
       is not null
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_draft_exists';
  end if;


  select coalesce(
    max(r.revision_number),
    0
  ) + 1
  into v_revision_number
  from pci.consignment_revisions r
  where r.consignment_id=
        v_consignment.consignment_id;


  insert into pci.consignment_revisions (
    consignment_id,
    revision_number,
    status,

    title,
    summary,
    objective,
    creative_angle,
    hook_guidance,

    format_requirements,
    acceptance_criteria,

    subject_type,
    subject_ref,
    subject_snapshot,

    base_price_amount,
    currency,
    slots_available,
    performance_bonus_policy,
    pre_purchase_revision_limit,

    rights_package_snapshot,
    matching_tags,

    created_by
  )
  values (
    v_consignment.consignment_id,
    v_revision_number,
    'draft',

    v_current.title,
    v_current.summary,
    v_current.objective,
    v_current.creative_angle,
    v_current.hook_guidance,

    v_current.format_requirements,
    v_current.acceptance_criteria,

    v_current.subject_type,
    v_current.subject_ref,
    v_current.subject_snapshot,

    v_current.base_price_amount,
    v_current.currency,
    v_current.slots_available,
    v_current.performance_bonus_policy,
    v_current.pre_purchase_revision_limit,

    v_current.rights_package_snapshot,
    v_current.matching_tags,

    p_actor_user_id
  )
  returning consignment_revision_id
  into v_revision_id;


  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,

    'consignment_revision',
    v_revision_id,

    'consignment.revision_draft_created',

    null,
    'draft',

    p_request_id,
    v_receipt_id,

    jsonb_build_object(
      'consignment_id',
      v_consignment.consignment_id,

      'base_revision_id',
      v_current.consignment_revision_id,

      'base_revision_number',
      v_current.revision_number,

      'revision_number',
      v_revision_number
    )
  );


  v_result :=
    jsonb_build_object(
      'ok',
      true,

      'consignment_id',
      v_consignment.consignment_id,

      'consignment_revision_id',
      v_revision_id,

      'revision_number',
      v_revision_number,

      'status',
      'draft',

      'current_revision_id',
      v_consignment.current_revision_id
    );


  update pci.command_receipts
  set
    status='completed',
    result_entity_type=
      'consignment_revision',
    result_entity_id=
      v_revision_id,
    response_snapshot=
      v_result,
    completed_at=now()
  where command_receipt_id=
        v_receipt_id;


  return v_result;
end;
$$;


revoke all
on function
pci_api.admin_create_consignment_revision(
  uuid,
  text,
  uuid,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function
pci_api.admin_create_consignment_revision(
  uuid,
  text,
  uuid,
  uuid,
  uuid
)
to service_role;



-- ================================================================
-- 2. UPDATE FUTURE REVISION DRAFT
-- ================================================================

create or replace function
pci_api.admin_update_consignment_revision_draft(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid,
  p_consignment_revision_id uuid,
  p_revision jsonb,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  v_consignment
    pci.consignments%rowtype;

  v_revision
    pci.consignment_revisions%rowtype;

  v_receipt_id uuid;
  v_existing_receipt
    pci.command_receipts%rowtype;

  v_title text;

  v_matching_json jsonb :=
    coalesce(
      p_revision->'matching_tags',
      '[]'::jsonb
    );

  v_matching_tags text[] :=
    '{}'::text[];

  v_result jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );


  if p_consignment_id is null
     or p_consignment_revision_id
        is null
     or p_idempotency_key is null
     or p_request_id is null
     or jsonb_typeof(p_revision)
        <> 'object'
  then
    raise exception
      using
        errcode='22023',
        message=
          'pci_consignment_revision_context_required';
  end if;


  v_title :=
    nullif(
      btrim(
        coalesce(
          p_revision->>'title',
          ''
        )
      ),
      ''
    );


  if v_title is null then
    raise exception
      using
        errcode='22023',
        message=
          'pci_consignment_title_required';
  end if;


  if jsonb_typeof(
       v_matching_json
     ) <> 'array'
  then
    raise exception
      using
        errcode='22023',
        message=
          'pci_consignment_matching_tags_invalid';
  end if;


  if jsonb_array_length(
       v_matching_json
     ) > 20
     or exists (
       select 1
       from jsonb_array_elements(
         v_matching_json
       ) as e(value)

       where jsonb_typeof(
               e.value
             ) <> 'string'

          or btrim(
               e.value #>> '{}'
             ) = ''

          or char_length(
               btrim(
                 e.value #>> '{}'
               )
             ) > 60
     )
  then
    raise exception
      using
        errcode='22023',
        message=
          'pci_consignment_matching_tags_invalid';
  end if;


  select pci.normalize_tag_array(
    coalesce(
      array_agg(
        e.value #>> '{}'
        order by e.ord
      ),
      '{}'::text[]
    )
  )
  into v_matching_tags

  from jsonb_array_elements(
    v_matching_json
  ) with ordinality
    as e(value, ord);


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
    'admin_update_consignment_revision_draft',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning command_receipt_id
  into v_receipt_id;


  if v_receipt_id is null then
    select *
    into v_existing_receipt
    from pci.command_receipts cr

    where cr.actor_type='operator'
      and cr.actor_user_id=
          p_actor_user_id
      and cr.actor_creator_id is null
      and cr.command_name=
          'admin_update_consignment_revision_draft'
      and cr.idempotency_key=
          p_idempotency_key

    order by cr.created_at desc
    limit 1;


    if v_existing_receipt.command_receipt_id
         is null
    then
      raise exception
        using
          errcode='23505',
          message=
            'pci_idempotency_conflict';
    end if;


    if v_existing_receipt.status=
         'completed'
    then
      return
        v_existing_receipt
          .response_snapshot;
    end if;


    raise exception
      using
        errcode='40001',
        message=
          'pci_command_already_processing';
  end if;


  select *
  into v_consignment
  from pci.consignments c

  where c.workspace_id=
        p_workspace_id
    and c.consignment_id=
        p_consignment_id

  for update;


  if v_consignment.consignment_id
       is null
  then
    raise exception
      using
        errcode='P0002',
        message=
          'pci_consignment_not_found';
  end if;


  if v_consignment.status
       not in ('open','paused')
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_not_editable';
  end if;


  select *
  into v_revision
  from pci.consignment_revisions r

  where r.consignment_revision_id=
        p_consignment_revision_id
    and r.consignment_id=
        v_consignment.consignment_id

  for update;


  if v_revision.consignment_revision_id
       is null
     or v_revision.status <> 'draft'
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_not_editable';
  end if;


  if v_revision.consignment_revision_id =
       v_consignment.current_revision_id
  then
    raise exception
      using
        errcode='23514',
        message=
          'pci_consignment_revision_not_editable';
  end if;


  update pci.consignment_revisions
  set
    title=
      v_title,

    summary=
      nullif(
        p_revision->>'summary',
        ''
      ),

    objective=
      nullif(
        p_revision->>'objective',
        ''
      ),

    creative_angle=
      nullif(
        p_revision->>'creative_angle',
        ''
      ),

    hook_guidance=
      nullif(
        p_revision->>'hook_guidance',
        ''
      ),

    format_requirements=
      coalesce(
        p_revision->'format_requirements',
        '{}'::jsonb
      ),

    acceptance_criteria=
      coalesce(
        p_revision->'acceptance_criteria',
        '{}'::jsonb
      ),

    subject_type=
      nullif(
        p_revision->>'subject_type',
        ''
      ),

    subject_ref=
      nullif(
        p_revision->>'subject_ref',
        ''
      ),

    subject_snapshot=
      coalesce(
        p_revision->'subject_snapshot',
        '{}'::jsonb
      ),

    base_price_amount=
      case
        when nullif(
          p_revision->>'base_price_amount',
          ''
        ) is null
        then null
        else (
          p_revision->>'base_price_amount'
        )::numeric
      end,

    currency=
      coalesce(
        nullif(
          p_revision->>'currency',
          ''
        ),
        'ARS'
      ),

    slots_available=
      case
        when nullif(
          p_revision->>'slots_available',
          ''
        ) is null
        then null
        else (
          p_revision->>'slots_available'
        )::integer
      end,

    performance_bonus_policy=
      coalesce(
        p_revision->'performance_bonus_policy',
        '{}'::jsonb
      ),

    pre_purchase_revision_limit=
      case
        when nullif(
          p_revision->>
            'pre_purchase_revision_limit',
          ''
        ) is null
        then null
        else (
          p_revision->>
            'pre_purchase_revision_limit'
        )::integer
      end,

    rights_package_snapshot=
      coalesce(
        p_revision->
          'rights_package_snapshot',
        '{}'::jsonb
      ),

    matching_tags=
      v_matching_tags

  where consignment_revision_id=
        v_revision
          .consignment_revision_id;


  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,

    'consignment_revision',
    v_revision.consignment_revision_id,

    'consignment.revision_draft_updated',

    'draft',
    'draft',

    p_request_id,
    v_receipt_id,

    jsonb_build_object(
      'consignment_id',
      v_consignment.consignment_id,

      'revision_number',
      v_revision.revision_number,

      'matching_tags',
      to_jsonb(v_matching_tags)
    )
  );


  v_result :=
    jsonb_build_object(
      'ok',
      true,

      'consignment_id',
      v_consignment.consignment_id,

      'consignment_revision_id',
      v_revision.consignment_revision_id,

      'revision_number',
      v_revision.revision_number,

      'status',
      'draft',

      'matching_tags',
      to_jsonb(v_matching_tags)
    );


  update pci.command_receipts
  set
    status='completed',
    result_entity_type=
      'consignment_revision',
    result_entity_id=
      v_revision.consignment_revision_id,
    response_snapshot=
      v_result,
    completed_at=now()

  where command_receipt_id=
        v_receipt_id;


  return v_result;
end;
$$;


revoke all
on function
pci_api.admin_update_consignment_revision_draft(
  uuid,
  text,
  uuid,
  uuid,
  jsonb,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function
pci_api.admin_update_consignment_revision_draft(
  uuid,
  text,
  uuid,
  uuid,
  jsonb,
  uuid,
  uuid
)
to service_role;
