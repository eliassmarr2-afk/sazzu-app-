-- Protocol Creative Insights
-- 2.1I.1B.1 · Consignment matching foundation

create or replace function pci.normalize_tag_array(
  p_tags text[]
)
returns text[]
language sql
immutable
set search_path=''
as $$
  select coalesce(
    array_agg(d.tag order by d.ord),
    '{}'::text[]
  )
  from (
    select distinct on (
      lower(btrim(u.tag))
    )
      btrim(u.tag) as tag,
      u.ord
    from unnest(
      coalesce(
        p_tags,
        '{}'::text[]
      )
    ) with ordinality as u(tag, ord)
    where u.tag is not null
      and btrim(u.tag) <> ''
      and char_length(
        btrim(u.tag)
      ) <= 60
    order by
      lower(btrim(u.tag)),
      u.ord
  ) d;
$$;

revoke all
on function pci.normalize_tag_array(text[])
from public, anon, authenticated;

grant execute
on function pci.normalize_tag_array(text[])
to service_role;


alter table pci.consignment_revisions
  add column matching_tags text[]
  not null
  default '{}'::text[];

alter table pci.consignment_revisions
  add constraint
  consignment_revisions_matching_tags_check
  check (
    cardinality(matching_tags) <= 20
    and matching_tags =
      pci.normalize_tag_array(
        matching_tags
      )
  );


create or replace function
pci.guard_consignment_revision_immutability()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.status = 'superseded' then
    raise exception
      using errcode = '23514',
      message =
        'pci_consignment_revision_immutable';
  end if;

  if old.status = 'published' then
    if new.status <> 'superseded'
       or new.consignment_revision_id
          is distinct from
          old.consignment_revision_id
       or new.consignment_id
          is distinct from
          old.consignment_id
       or new.revision_number
          is distinct from
          old.revision_number
       or new.title
          is distinct from old.title
       or new.summary
          is distinct from old.summary
       or new.objective
          is distinct from old.objective
       or new.creative_angle
          is distinct from
          old.creative_angle
       or new.hook_guidance
          is distinct from
          old.hook_guidance
       or new.format_requirements
          is distinct from
          old.format_requirements
       or new.acceptance_criteria
          is distinct from
          old.acceptance_criteria
       or new.subject_type
          is distinct from
          old.subject_type
       or new.subject_ref
          is distinct from
          old.subject_ref
       or new.subject_snapshot
          is distinct from
          old.subject_snapshot
       or new.base_price_amount
          is distinct from
          old.base_price_amount
       or new.currency
          is distinct from old.currency
       or new.slots_available
          is distinct from
          old.slots_available
       or new.performance_bonus_policy
          is distinct from
          old.performance_bonus_policy
       or new.pre_purchase_revision_limit
          is distinct from
          old.pre_purchase_revision_limit
       or new.rights_package_snapshot
          is distinct from
          old.rights_package_snapshot
       or new.matching_tags
          is distinct from
          old.matching_tags
       or new.published_at
          is distinct from
          old.published_at
       or new.created_by
          is distinct from
          old.created_by
       or new.created_at
          is distinct from
          old.created_at
       or new.superseded_at is null
    then
      raise exception
        using errcode = '23514',
        message =
          'pci_published_consignment_revision_immutable';
    end if;
  end if;

  return new;
end;
$$;


create or replace function pci_api.create_consignment(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_revision jsonb,
  p_visibility text default 'open',
  p_max_submissions_per_creator integer default null,
  p_max_versions_per_submission integer default null,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_consignment_id uuid;
  v_revision_id uuid;
  v_title text;
  v_result jsonb;

  v_matching_json jsonb :=
    coalesce(
      p_revision->'matching_tags',
      '[]'::jsonb
    );

  v_matching_tags text[] :=
    '{}'::text[];
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if p_idempotency_key is null
     or p_request_id is null
  then
    raise exception
      using errcode='22023',
      message=
        'pci_idempotency_and_request_required';
  end if;

  if p_visibility not in (
    'open',
    'invite_only'
  ) then
    raise exception
      using errcode='22023',
      message=
        'pci_invalid_consignment_visibility';
  end if;

  if p_max_submissions_per_creator
       is not null
     and p_max_submissions_per_creator <= 0
  then
    raise exception
      using errcode='22023',
      message=
        'pci_invalid_submission_limit';
  end if;

  if p_max_versions_per_submission
       is not null
     and p_max_versions_per_submission <= 0
  then
    raise exception
      using errcode='22023',
      message=
        'pci_invalid_version_limit';
  end if;

  if p_closes_at is not null
     and p_opens_at is not null
     and p_closes_at <= p_opens_at
  then
    raise exception
      using errcode='22023',
      message=
        'pci_invalid_consignment_window';
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
      using errcode='22023',
      message=
        'pci_consignment_title_required';
  end if;

  if jsonb_typeof(
       v_matching_json
     ) <> 'array'
  then
    raise exception
      using errcode='22023',
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
      using errcode='22023',
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
    'create_consignment',
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
    where cr.actor_type='operator'
      and cr.actor_user_id=
          p_actor_user_id
      and cr.actor_creator_id
          is null
      and cr.command_name=
          'create_consignment'
      and cr.idempotency_key=
          p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing.command_receipt_id
         is null
    then
      raise exception
        using errcode='23505',
        message=
          'pci_idempotency_conflict';
    end if;

    if v_existing.status='completed'
    then
      return
        v_existing.response_snapshot;
    end if;

    raise exception
      using errcode='40001',
      message=
        'pci_command_already_processing';
  end if;

  insert into pci.consignments (
    workspace_id,
    status,
    visibility,
    max_submissions_per_creator,
    max_versions_per_submission,
    opens_at,
    closes_at,
    created_by
  )
  values (
    p_workspace_id,
    'draft',
    p_visibility,
    p_max_submissions_per_creator,
    p_max_versions_per_submission,
    p_opens_at,
    p_closes_at,
    p_actor_user_id
  )
  returning consignment_id
  into v_consignment_id;

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
    v_consignment_id,
    1,
    'draft',
    v_title,
    nullif(
      p_revision->>'summary',
      ''
    ),
    nullif(
      p_revision->>'objective',
      ''
    ),
    nullif(
      p_revision->>'creative_angle',
      ''
    ),
    nullif(
      p_revision->>'hook_guidance',
      ''
    ),
    coalesce(
      p_revision->'format_requirements',
      '{}'::jsonb
    ),
    coalesce(
      p_revision->'acceptance_criteria',
      '{}'::jsonb
    ),
    nullif(
      p_revision->>'subject_type',
      ''
    ),
    nullif(
      p_revision->>'subject_ref',
      ''
    ),
    coalesce(
      p_revision->'subject_snapshot',
      '{}'::jsonb
    ),
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
    coalesce(
      nullif(
        p_revision->>'currency',
        ''
      ),
      'ARS'
    ),
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
    coalesce(
      p_revision->'performance_bonus_policy',
      '{}'::jsonb
    ),
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
    coalesce(
      p_revision->'rights_package_snapshot',
      '{}'::jsonb
    ),
    v_matching_tags,
    p_actor_user_id
  )
  returning consignment_revision_id
  into v_revision_id;

  update pci.consignments
  set current_revision_id=
      v_revision_id
  where consignment_id=
        v_consignment_id;

  perform pci.append_event(
    p_workspace_id,
    'operator',
    p_actor_user_id,
    null,
    'consignment',
    v_consignment_id,
    'consignment.created',
    null,
    'draft',
    p_request_id,
    v_receipt_id,
    jsonb_build_object(
      'revision_id',
      v_revision_id,
      'revision_number',
      1,
      'matching_tags',
      to_jsonb(v_matching_tags)
    )
  );

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'consignment_id',
      v_consignment_id,
      'consignment_revision_id',
      v_revision_id,
      'status',
      'draft'
    );

  update pci.command_receipts
  set status='completed',
      result_entity_type=
        'consignment',
      result_entity_id=
        v_consignment_id,
      response_snapshot=
        v_result,
      completed_at=now()
  where command_receipt_id=
        v_receipt_id;

  return v_result;
end;
$$;


create or replace function
pci_api.creator_opportunities(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  v_creator pci.creators%rowtype;
  v_items jsonb;
begin
  v_creator :=
    pci.require_active_creator(
      p_actor_user_id
    );

  select coalesce(
    jsonb_agg(
      item
      order by (
        item->>'published_at'
      ) desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select jsonb_build_object(
      'consignment_id',
      c.consignment_id,

      'workspace_id',
      c.workspace_id,

      'visibility',
      c.visibility,

      'status',
      c.status,

      'published_at',
      c.published_at,

      'closes_at',
      c.closes_at,

      'revision',
      jsonb_build_object(
        'consignment_revision_id',
        r.consignment_revision_id,

        'revision_number',
        r.revision_number,

        'revision_status',
        r.status,

        'title',
        r.title,

        'summary',
        r.summary,

        'objective',
        r.objective,

        'creative_angle',
        r.creative_angle,

        'hook_guidance',
        r.hook_guidance,

        'format_requirements',
        r.format_requirements,

        'acceptance_criteria',
        r.acceptance_criteria,

        'subject_type',
        r.subject_type,

        'subject_ref',
        r.subject_ref,

        'subject_snapshot',
        r.subject_snapshot,

        'base_price_amount',
        r.base_price_amount,

        'currency',
        r.currency,

        'slots_available',
        r.slots_available,

        'performance_bonus_policy',
        r.performance_bonus_policy,

        'pre_purchase_revision_limit',
        r.pre_purchase_revision_limit,

        'rights_package_snapshot',
        r.rights_package_snapshot,

        'matching_tags',
        r.matching_tags
      ),

      'participation',
      case
        when p.participation_id
             is null
        then null
        else jsonb_build_object(
          'participation_id',
          p.participation_id,

          'consignment_revision_id',
          p.consignment_revision_id,

          'status',
          p.status,

          'joined_at',
          p.joined_at
        )
      end
    ) as item

    from pci.consignments c

    join pci.workspace_creators wc
      on wc.workspace_id=
         c.workspace_id
     and wc.creator_id=
         v_creator.creator_id
     and wc.status in (
       'active',
       'restricted'
     )

    left join
      pci.consignment_participations p
      on p.consignment_id=
         c.consignment_id
     and p.creator_id=
         v_creator.creator_id

    join pci.consignment_revisions r
      on r.consignment_revision_id=
         case
           when p.status in (
             'invited',
             'active'
           )
           then
             p.consignment_revision_id
           else
             c.current_revision_id
         end

    where c.status='open'
      and (
        c.opens_at is null
        or c.opens_at<=now()
      )
      and (
        c.closes_at is null
        or c.closes_at>now()
      )
      and (
        c.visibility='open'
        or (
          c.visibility='invite_only'
          and p.status in (
            'invited',
            'active'
          )
        )
      )
  ) q;

  return jsonb_build_object(
    'ok',
    true,
    'items',
    v_items
  );
end;
$$;
