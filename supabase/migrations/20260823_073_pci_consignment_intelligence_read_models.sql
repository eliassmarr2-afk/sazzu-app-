-- Protocol Creative Insights
-- 2.1I.1B.2
-- Consignment matching candidates + financial read models.
--
-- READ MODEL ONLY.
-- No operational state is mutated by this migration.


-- ================================================================
-- 1. FINANCIAL ATTRIBUTION
-- ================================================================
--
-- Attribution is based on purchase_offer_items.amount because each
-- item is bound to one Submission. We intentionally do NOT attribute
-- purchase.total_amount to every Consignment: a future Purchase may
-- contain assets from more than one Consignment.

create or replace function
pci.consignment_financial_summary(
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language sql
stable
set search_path=''
as $$
  with attributed as (
    select
      pu.purchase_id,
      pu.status,
      pu.currency,
      poi.offer_item_id,
      poi.amount

    from pci.purchase_offer_items poi

    join pci.purchase_offers po
      on po.offer_id=
         poi.offer_id

    join pci.purchases pu
      on pu.offer_id=
         po.offer_id
     and pu.workspace_id=
         p_workspace_id

    join pci.submissions s
      on s.submission_id=
         poi.submission_id
     and s.workspace_id=
         p_workspace_id

    where s.consignment_id=
          p_consignment_id
  )

  select jsonb_build_object(
    'purchases',
    count(
      distinct purchase_id
    ) filter (
      where status <> 'rescinded'
    ),

    'committed_amount',
    coalesce(
      sum(amount) filter (
        where status in (
          'agreed',
          'settled',
          'in_dispute'
        )
      ),
      0
    ),

    'settled_amount',
    coalesce(
      sum(amount) filter (
        where status='settled'
      ),
      0
    ),

    'currency',
    case
      when count(
        distinct currency
      ) filter (
        where status <> 'rescinded'
      ) = 1
      then min(currency) filter (
        where status <> 'rescinded'
      )
      else null
    end,

    'currency_mixed',
    count(
      distinct currency
    ) filter (
      where status <> 'rescinded'
    ) > 1
  )
  from attributed;
$$;

revoke all
on function
pci.consignment_financial_summary(
  text,
  uuid
)
from public, anon, authenticated;

grant execute
on function
pci.consignment_financial_summary(
  text,
  uuid
)
to service_role;


-- ================================================================
-- 2. MATCHING CANDIDATES
-- ================================================================
--
-- This is intentionally NOT an algorithmic score.
--
-- Matching:
--   consignment revision matching_tags
--   ↔ workspace_creator specialty_tags
--
-- Capacity:
-- active_jobs_count:
--   active participations on open/paused Consignments
--
-- open_obligations_count:
--   non-terminal Submissions
--
-- These values are informational only in 2.1I.1B.2.

create or replace function
pci.consignment_matching_candidates(
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language sql
stable
set search_path=''
as $$
  with target as (
    select
      c.consignment_id,
      c.current_revision_id,
      coalesce(
        r.matching_tags,
        '{}'::text[]
      ) as matching_tags

    from pci.consignments c

    left join pci.consignment_revisions r
      on r.consignment_revision_id=
         c.current_revision_id

    where c.workspace_id=
          p_workspace_id
      and c.consignment_id=
          p_consignment_id
  ),

  candidate_rows as (
    select
      cr.creator_id,
      cr.display_name,
      cr.email,
      cr.status
        as creator_status,

      wc.workspace_creator_id,
      wc.status
        as relationship_status,
      wc.provider_tier,
      wc.specialty_tags,
      wc.max_simultaneous_jobs,
      wc.max_open_obligations,

      current_cp.status
        as current_participation_status,

      tag_match.match_count,
      tag_match.matched_tags,
      tag_match.missing_tags,

      cardinality(
        t.matching_tags
      ) as required_tag_count,

      case
        when cardinality(
          t.matching_tags
        ) = 0
        then null
        else
          tag_match.match_count::numeric
          /
          cardinality(
            t.matching_tags
          )::numeric
      end as matching_ratio,

      capacity.active_jobs_count,
      capacity.open_obligations_count,

      case
        when wc.max_simultaneous_jobs
             is null
        then null
        else greatest(
          wc.max_simultaneous_jobs
          -
          capacity.active_jobs_count,
          0
        )
      end as simultaneous_jobs_remaining,

      case
        when wc.max_open_obligations
             is null
        then null
        else greatest(
          wc.max_open_obligations
          -
          capacity.open_obligations_count,
          0
        )
      end as open_obligations_remaining,

      (
        wc.status='active'
        and cr.status='active'
      ) as eligible_for_assignment,

      (
        wc.status='active'
        and cr.status='active'
        and (
          wc.max_simultaneous_jobs
            is null
          or capacity.active_jobs_count
             <
             wc.max_simultaneous_jobs
        )
        and (
          wc.max_open_obligations
            is null
          or capacity.open_obligations_count
             <
             wc.max_open_obligations
        )
      ) as available_for_new_assignment,

      history.submissions_total,
      history.preselected_total,
      history.acquired_total,
      history.purchases_total,
      history.negotiations_open,

      case
        when history.submissions_total=0
        then null
        else
          history.acquired_total::numeric
          /
          history.submissions_total::numeric
      end as acquisition_rate,

      history.paid_amount

    from target t

    join pci.workspace_creators wc
      on wc.workspace_id=
         p_workspace_id
     and wc.status in (
       'active',
       'restricted'
     )

    join pci.creators cr
      on cr.creator_id=
         wc.creator_id
     and cr.status='active'

    left join
      pci.consignment_participations
        current_cp
      on current_cp.consignment_id=
         p_consignment_id
     and current_cp.creator_id=
         cr.creator_id

    cross join lateral (
      select
        count(*) filter (
          where exists (
            select 1
            from unnest(
              wc.specialty_tags
            ) st(tag)
            where lower(st.tag)=
                  lower(required.tag)
          )
        )::integer
          as match_count,

        coalesce(
          array_agg(
            required.tag
            order by required.ord
          ) filter (
            where exists (
              select 1
              from unnest(
                wc.specialty_tags
              ) st(tag)
              where lower(st.tag)=
                    lower(required.tag)
            )
          ),
          '{}'::text[]
        ) as matched_tags,

        coalesce(
          array_agg(
            required.tag
            order by required.ord
          ) filter (
            where not exists (
              select 1
              from unnest(
                wc.specialty_tags
              ) st(tag)
              where lower(st.tag)=
                    lower(required.tag)
            )
          ),
          '{}'::text[]
        ) as missing_tags

      from unnest(
        t.matching_tags
      ) with ordinality
        as required(tag, ord)
    ) tag_match

    cross join lateral (
      select
        (
          select count(
            distinct cp.consignment_id
          )::integer

          from
            pci.consignment_participations cp

          join pci.consignments active_c
            on active_c.consignment_id=
               cp.consignment_id
           and active_c.workspace_id=
               p_workspace_id

          where cp.workspace_id=
                p_workspace_id
            and cp.creator_id=
                cr.creator_id
            and cp.status='active'
            and active_c.status in (
              'open',
              'paused'
            )
        ) as active_jobs_count,

        (
          select count(*)::integer
          from pci.submissions s
          where s.workspace_id=
                p_workspace_id
            and s.creator_id=
                cr.creator_id
            and s.status in (
              'draft',
              'submitted',
              'under_review',
              'changes_requested',
              'preselected'
            )
        ) as open_obligations_count
    ) capacity

    cross join lateral (
      select
        (
          select count(*)::integer
          from pci.submissions s
          where s.workspace_id=
                p_workspace_id
            and s.creator_id=
                cr.creator_id
        ) as submissions_total,

        (
          select count(*)::integer
          from pci.submissions s
          where s.workspace_id=
                p_workspace_id
            and s.creator_id=
                cr.creator_id
            and s.status='preselected'
        ) as preselected_total,

        (
          select count(*)::integer
          from pci.submissions s
          where s.workspace_id=
                p_workspace_id
            and s.creator_id=
                cr.creator_id
            and s.status='acquired'
        ) as acquired_total,

        (
          select count(*)::integer
          from pci.purchases pu
          where pu.workspace_id=
                p_workspace_id
            and pu.creator_id=
                cr.creator_id
            and pu.status <>
                'rescinded'
        ) as purchases_total,

        (
          select count(*)::integer
          from pci.negotiations n
          where n.workspace_id=
                p_workspace_id
            and n.creator_id=
                cr.creator_id
            and n.status='open'
        ) as negotiations_open,

        coalesce(
          (
            select sum(py.amount_due)
            from pci.payables py
            where py.workspace_id=
                  p_workspace_id
              and py.creator_id=
                  cr.creator_id
              and py.status='paid'
          ),
          0
        ) as paid_amount
    ) history
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'creator_id',
        creator_id,

        'display_name',
        display_name,

        'email',
        email,

        'creator_status',
        creator_status,

        'relationship',
        jsonb_build_object(
          'workspace_creator_id',
          workspace_creator_id,

          'status',
          relationship_status,

          'provider_tier',
          provider_tier,

          'specialty_tags',
          specialty_tags,

          'max_simultaneous_jobs',
          max_simultaneous_jobs,

          'max_open_obligations',
          max_open_obligations
        ),

        'matching',
        jsonb_build_object(
          'match_count',
          match_count,

          'required_tag_count',
          required_tag_count,

          'matching_ratio',
          matching_ratio,

          'matched_tags',
          matched_tags,

          'missing_tags',
          missing_tags
        ),

        'capacity',
        jsonb_build_object(
          'active_jobs_count',
          active_jobs_count,

          'max_simultaneous_jobs',
          max_simultaneous_jobs,

          'simultaneous_jobs_remaining',
          simultaneous_jobs_remaining,

          'open_obligations_count',
          open_obligations_count,

          'max_open_obligations',
          max_open_obligations,

          'open_obligations_remaining',
          open_obligations_remaining,

          'available_for_new_assignment',
          available_for_new_assignment
        ),

        'history',
        jsonb_build_object(
          'submissions',
          submissions_total,

          'preselected',
          preselected_total,

          'acquired',
          acquired_total,

          'acquisition_rate',
          acquisition_rate,

          'purchases',
          purchases_total,

          'negotiations_open',
          negotiations_open,

          'paid_amount',
          paid_amount
        ),

        'current_participation_status',
        current_participation_status,

        'eligible_for_assignment',
        eligible_for_assignment
      )

      order by
        match_count desc,

        available_for_new_assignment
          desc,

        (
          provider_tier='preferred'
        ) desc,

        acquired_total desc,

        display_name asc
    ),
    '[]'::jsonb
  )
  from candidate_rows;
$$;

revoke all
on function
pci.consignment_matching_candidates(
  text,
  uuid
)
from public, anon, authenticated;

grant execute
on function
pci.consignment_matching_candidates(
  text,
  uuid
)
to service_role;


-- ================================================================
-- 3. ADMIN CONSIGNMENT LIST
-- ================================================================

create or replace function
pci_api.admin_consignments(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  v_items jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select coalesce(
    jsonb_agg(
      item
      order by (
        item->>'created_at'
      ) desc
    ),
    '[]'::jsonb
  )
  into v_items

  from (
    select jsonb_build_object(
      'consignment_id',
      c.consignment_id,

      'status',
      c.status,

      'visibility',
      c.visibility,

      'opens_at',
      c.opens_at,

      'closes_at',
      c.closes_at,

      'published_at',
      c.published_at,

      'closed_at',
      c.closed_at,

      'archived_at',
      c.archived_at,

      'created_at',
      c.created_at,

      'updated_at',
      c.updated_at,

      'max_submissions_per_creator',
      c.max_submissions_per_creator,

      'max_versions_per_submission',
      c.max_versions_per_submission,

      'current_revision',
      case
        when r.consignment_revision_id
             is null
        then null
        else jsonb_build_object(
          'consignment_revision_id',
          r.consignment_revision_id,

          'revision_number',
          r.revision_number,

          'status',
          r.status,

          'title',
          r.title,

          'summary',
          r.summary,

          'base_price_amount',
          r.base_price_amount,

          'currency',
          r.currency,

          'slots_available',
          r.slots_available,

          'pre_purchase_revision_limit',
          r.pre_purchase_revision_limit,

          'matching_tags',
          r.matching_tags,

          'published_at',
          r.published_at
        )
      end,

      'counts',
      jsonb_build_object(
        'participants',
        (
          select count(*)
          from
            pci.consignment_participations cp
          where cp.consignment_id=
                c.consignment_id
            and cp.status in (
              'active',
              'invited'
            )
        ),

        'submissions',
        (
          select count(*)
          from pci.submissions s
          where s.consignment_id=
                c.consignment_id
        ),

        'waiting_review',
        (
          select count(*)
          from pci.submissions s
          where s.consignment_id=
                c.consignment_id
            and s.status='submitted'
        ),

        'preselected',
        (
          select count(*)
          from pci.submissions s
          where s.consignment_id=
                c.consignment_id
            and s.status='preselected'
        ),

        'acquired',
        (
          select count(*)
          from pci.submissions s
          where s.consignment_id=
                c.consignment_id
            and s.status='acquired'
        )
      ),

      'financial',
      pci.consignment_financial_summary(
        p_workspace_id,
        c.consignment_id
      )
    ) item

    from pci.consignments c

    left join pci.consignment_revisions r
      on r.consignment_revision_id=
         c.current_revision_id

    where c.workspace_id=
          p_workspace_id
  ) q;

  return jsonb_build_object(
    'ok',
    true,
    'workspace_id',
    p_workspace_id,
    'items',
    v_items
  );
end;
$$;


-- ================================================================
-- 4. ADMIN CONSIGNMENT DETAIL
-- ================================================================

create or replace function
pci_api.admin_consignment_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  v_consignment
    pci.consignments%rowtype;

  v_current_revision
    pci.consignment_revisions%rowtype;

  v_revisions jsonb;
  v_participants jsonb;
  v_submissions jsonb;
  v_financial jsonb;
  v_matching_candidates jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select *
  into v_consignment
  from pci.consignments c
  where c.consignment_id=
        p_consignment_id
    and c.workspace_id=
        p_workspace_id;

  if v_consignment.consignment_id
       is null
  then
    raise exception
      using errcode='P0002',
      message=
        'pci_consignment_not_found';
  end if;

  if v_consignment.current_revision_id
       is not null
  then
    select *
    into v_current_revision
    from pci.consignment_revisions r
    where r.consignment_revision_id=
          v_consignment.current_revision_id
      and r.consignment_id=
          v_consignment.consignment_id;
  end if;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'consignment_revision_id',
        r.consignment_revision_id,

        'revision_number',
        r.revision_number,

        'status',
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
        r.matching_tags,

        'published_at',
        r.published_at,

        'superseded_at',
        r.superseded_at,

        'created_at',
        r.created_at
      )
      order by
        r.revision_number desc
    ),
    '[]'::jsonb
  )
  into v_revisions
  from pci.consignment_revisions r
  where r.consignment_id=
        v_consignment.consignment_id;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'participation_id',
        cp.participation_id,

        'status',
        cp.status,

        'consignment_revision_id',
        cp.consignment_revision_id,

        'joined_at',
        cp.joined_at,

        'declined_at',
        cp.declined_at,

        'withdrawn_at',
        cp.withdrawn_at,

        'created_at',
        cp.created_at,

        'creator',
        jsonb_build_object(
          'creator_id',
          cr.creator_id,

          'display_name',
          cr.display_name,

          'email',
          cr.email,

          'status',
          cr.status,

          'relationship_status',
          wc.status,

          'provider_tier',
          wc.provider_tier,

          'specialty_tags',
          wc.specialty_tags
        )
      )
      order by
        cp.created_at desc
    ),
    '[]'::jsonb
  )
  into v_participants

  from pci.consignment_participations cp

  join pci.creators cr
    on cr.creator_id=
       cp.creator_id

  left join pci.workspace_creators wc
    on wc.workspace_id=
       p_workspace_id
   and wc.creator_id=
       cp.creator_id

  where cp.workspace_id=
        p_workspace_id
    and cp.consignment_id=
        v_consignment.consignment_id;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'submission_id',
        s.submission_id,

        'status',
        s.status,

        'concept_label',
        s.concept_label,

        'current_version_id',
        s.current_version_id,

        'submitted_at',
        s.submitted_at,

        'acquired_at',
        s.acquired_at,

        'created_at',
        s.created_at,

        'creator',
        jsonb_build_object(
          'creator_id',
          cr.creator_id,

          'display_name',
          cr.display_name
        ),

        'accepted_revision',
        jsonb_build_object(
          'consignment_revision_id',
          ar.consignment_revision_id,

          'revision_number',
          ar.revision_number,

          'title',
          ar.title,

          'matching_tags',
          ar.matching_tags
        )
      )
      order by
        coalesce(
          s.submitted_at,
          s.created_at
        ) desc
    ),
    '[]'::jsonb
  )
  into v_submissions

  from pci.submissions s

  join pci.creators cr
    on cr.creator_id=
       s.creator_id

  join pci.consignment_participations cp
    on cp.participation_id=
       s.participation_id

  join pci.consignment_revisions ar
    on ar.consignment_revision_id=
       cp.consignment_revision_id

  where s.workspace_id=
        p_workspace_id
    and s.consignment_id=
        v_consignment.consignment_id;


  v_financial :=
    pci.consignment_financial_summary(
      p_workspace_id,
      v_consignment.consignment_id
    );

  v_matching_candidates :=
    pci.consignment_matching_candidates(
      p_workspace_id,
      v_consignment.consignment_id
    );


  return jsonb_build_object(
    'ok',
    true,

    'workspace_id',
    p_workspace_id,

    'consignment',
    jsonb_build_object(
      'consignment_id',
      v_consignment.consignment_id,

      'status',
      v_consignment.status,

      'visibility',
      v_consignment.visibility,

      'max_submissions_per_creator',
      v_consignment
        .max_submissions_per_creator,

      'max_versions_per_submission',
      v_consignment
        .max_versions_per_submission,

      'opens_at',
      v_consignment.opens_at,

      'closes_at',
      v_consignment.closes_at,

      'cancelled_reason',
      v_consignment.cancelled_reason,

      'published_at',
      v_consignment.published_at,

      'closed_at',
      v_consignment.closed_at,

      'archived_at',
      v_consignment.archived_at,

      'created_at',
      v_consignment.created_at,

      'updated_at',
      v_consignment.updated_at
    ),

    'current_revision',
    case
      when v_current_revision
             .consignment_revision_id
           is null
      then null
      else jsonb_build_object(
        'consignment_revision_id',
        v_current_revision
          .consignment_revision_id,

        'revision_number',
        v_current_revision
          .revision_number,

        'status',
        v_current_revision.status,

        'title',
        v_current_revision.title,

        'summary',
        v_current_revision.summary,

        'objective',
        v_current_revision.objective,

        'creative_angle',
        v_current_revision.creative_angle,

        'hook_guidance',
        v_current_revision.hook_guidance,

        'format_requirements',
        v_current_revision
          .format_requirements,

        'acceptance_criteria',
        v_current_revision
          .acceptance_criteria,

        'subject_type',
        v_current_revision.subject_type,

        'subject_ref',
        v_current_revision.subject_ref,

        'subject_snapshot',
        v_current_revision
          .subject_snapshot,

        'base_price_amount',
        v_current_revision
          .base_price_amount,

        'currency',
        v_current_revision.currency,

        'slots_available',
        v_current_revision
          .slots_available,

        'performance_bonus_policy',
        v_current_revision
          .performance_bonus_policy,

        'pre_purchase_revision_limit',
        v_current_revision
          .pre_purchase_revision_limit,

        'rights_package_snapshot',
        v_current_revision
          .rights_package_snapshot,

        'matching_tags',
        v_current_revision
          .matching_tags,

        'published_at',
        v_current_revision
          .published_at
      )
    end,

    'counts',
    jsonb_build_object(
      'participants',
      jsonb_array_length(
        v_participants
      ),

      'submissions',
      jsonb_array_length(
        v_submissions
      ),

      'waiting_review',
      (
        select count(*)
        from pci.submissions s
        where s.consignment_id=
              v_consignment
                .consignment_id
          and s.status='submitted'
      ),

      'preselected',
      (
        select count(*)
        from pci.submissions s
        where s.consignment_id=
              v_consignment
                .consignment_id
          and s.status='preselected'
      ),

      'acquired',
      (
        select count(*)
        from pci.submissions s
        where s.consignment_id=
              v_consignment
                .consignment_id
          and s.status='acquired'
      ),

      'matching_candidates',
      jsonb_array_length(
        v_matching_candidates
      )
    ),

    'financial',
    v_financial,

    'matching_candidates',
    v_matching_candidates,

    'revisions',
    v_revisions,

    'participants',
    v_participants,

    'submissions',
    v_submissions
  );
end;
$$;
