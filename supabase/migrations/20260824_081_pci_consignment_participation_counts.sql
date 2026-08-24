-- Protocol Creative Insights (PCI)
-- 2.1M.3 · Separate active participants from invitation history.
-- Runtime-test first. No production deployment in this phase.

create or replace function pci_api.admin_consignment_detail(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_consignment pci.consignments%rowtype;
  v_current_revision pci.consignment_revisions%rowtype;
  v_revisions jsonb;
  v_participants jsonb;
  v_submissions jsonb;
  v_financial jsonb;
  v_matching_candidates jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id=p_consignment_id
    and c.workspace_id=p_workspace_id;

  if v_consignment.consignment_id is null then
    raise exception using errcode='P0002',message='pci_consignment_not_found';
  end if;

  if v_consignment.current_revision_id is not null then
    select * into v_current_revision
    from pci.consignment_revisions r
    where r.consignment_revision_id=v_consignment.current_revision_id
      and r.consignment_id=v_consignment.consignment_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'consignment_revision_id',r.consignment_revision_id,
        'revision_number',r.revision_number,
        'status',r.status,
        'title',r.title,
        'summary',r.summary,
        'objective',r.objective,
        'creative_angle',r.creative_angle,
        'hook_guidance',r.hook_guidance,
        'format_requirements',r.format_requirements,
        'acceptance_criteria',r.acceptance_criteria,
        'subject_type',r.subject_type,
        'subject_ref',r.subject_ref,
        'subject_snapshot',r.subject_snapshot,
        'base_price_amount',r.base_price_amount,
        'currency',r.currency,
        'slots_available',r.slots_available,
        'performance_bonus_policy',r.performance_bonus_policy,
        'pre_purchase_revision_limit',r.pre_purchase_revision_limit,
        'rights_package_snapshot',r.rights_package_snapshot,
        'matching_tags',r.matching_tags,
        'published_at',r.published_at,
        'superseded_at',r.superseded_at,
        'created_at',r.created_at
      ) order by r.revision_number desc
    ),
    '[]'::jsonb
  ) into v_revisions
  from pci.consignment_revisions r
  where r.consignment_id=v_consignment.consignment_id;

  -- Keep the full participation history for audit/UI.
  -- Operational participant counts below intentionally count active only.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'participation_id',cp.participation_id,
        'status',cp.status,
        'consignment_revision_id',cp.consignment_revision_id,
        'joined_at',cp.joined_at,
        'declined_at',cp.declined_at,
        'withdrawn_at',cp.withdrawn_at,
        'created_at',cp.created_at,
        'creator',jsonb_build_object(
          'creator_id',cr.creator_id,
          'display_name',cr.display_name,
          'email',cr.email,
          'status',cr.status,
          'relationship_status',wc.status,
          'provider_tier',wc.provider_tier,
          'specialty_tags',wc.specialty_tags
        )
      ) order by cp.created_at desc
    ),
    '[]'::jsonb
  ) into v_participants
  from pci.consignment_participations cp
  join pci.creators cr on cr.creator_id=cp.creator_id
  left join pci.workspace_creators wc
    on wc.workspace_id=p_workspace_id
   and wc.creator_id=cp.creator_id
  where cp.workspace_id=p_workspace_id
    and cp.consignment_id=v_consignment.consignment_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'submission_id',s.submission_id,
        'status',s.status,
        'concept_label',s.concept_label,
        'current_version_id',s.current_version_id,
        'submitted_at',s.submitted_at,
        'acquired_at',s.acquired_at,
        'created_at',s.created_at,
        'creator',jsonb_build_object(
          'creator_id',cr.creator_id,
          'display_name',cr.display_name
        ),
        'accepted_revision',jsonb_build_object(
          'consignment_revision_id',ar.consignment_revision_id,
          'revision_number',ar.revision_number,
          'title',ar.title,
          'matching_tags',ar.matching_tags
        )
      ) order by coalesce(s.submitted_at,s.created_at) desc
    ),
    '[]'::jsonb
  ) into v_submissions
  from pci.submissions s
  join pci.creators cr on cr.creator_id=s.creator_id
  join pci.consignment_participations cp on cp.participation_id=s.participation_id
  join pci.consignment_revisions ar on ar.consignment_revision_id=cp.consignment_revision_id
  where s.workspace_id=p_workspace_id
    and s.consignment_id=v_consignment.consignment_id;

  v_financial:=pci.consignment_financial_summary(p_workspace_id,v_consignment.consignment_id);
  v_matching_candidates:=pci.consignment_matching_candidates(p_workspace_id,v_consignment.consignment_id);

  return jsonb_build_object(
    'ok',true,
    'workspace_id',p_workspace_id,
    'consignment',jsonb_build_object(
      'consignment_id',v_consignment.consignment_id,
      'status',v_consignment.status,
      'visibility',v_consignment.visibility,
      'max_submissions_per_creator',v_consignment.max_submissions_per_creator,
      'max_versions_per_submission',v_consignment.max_versions_per_submission,
      'opens_at',v_consignment.opens_at,
      'closes_at',v_consignment.closes_at,
      'cancelled_reason',v_consignment.cancelled_reason,
      'published_at',v_consignment.published_at,
      'closed_at',v_consignment.closed_at,
      'archived_at',v_consignment.archived_at,
      'created_at',v_consignment.created_at,
      'updated_at',v_consignment.updated_at
    ),
    'current_revision',case
      when v_current_revision.consignment_revision_id is null then null
      else jsonb_build_object(
        'consignment_revision_id',v_current_revision.consignment_revision_id,
        'revision_number',v_current_revision.revision_number,
        'status',v_current_revision.status,
        'title',v_current_revision.title,
        'summary',v_current_revision.summary,
        'objective',v_current_revision.objective,
        'creative_angle',v_current_revision.creative_angle,
        'hook_guidance',v_current_revision.hook_guidance,
        'format_requirements',v_current_revision.format_requirements,
        'acceptance_criteria',v_current_revision.acceptance_criteria,
        'subject_type',v_current_revision.subject_type,
        'subject_ref',v_current_revision.subject_ref,
        'subject_snapshot',v_current_revision.subject_snapshot,
        'base_price_amount',v_current_revision.base_price_amount,
        'currency',v_current_revision.currency,
        'slots_available',v_current_revision.slots_available,
        'performance_bonus_policy',v_current_revision.performance_bonus_policy,
        'pre_purchase_revision_limit',v_current_revision.pre_purchase_revision_limit,
        'rights_package_snapshot',v_current_revision.rights_package_snapshot,
        'matching_tags',v_current_revision.matching_tags,
        'published_at',v_current_revision.published_at
      )
    end,
    'counts',jsonb_build_object(
      'participants',(
        select count(*)
        from pci.consignment_participations cp
        where cp.workspace_id=p_workspace_id
          and cp.consignment_id=v_consignment.consignment_id
          and cp.status='active'
      ),
      'invitations_pending',(
        select count(*)
        from pci.consignment_participations cp
        where cp.workspace_id=p_workspace_id
          and cp.consignment_id=v_consignment.consignment_id
          and cp.status='invited'
      ),
      'invitations_declined',(
        select count(*)
        from pci.consignment_participations cp
        where cp.workspace_id=p_workspace_id
          and cp.consignment_id=v_consignment.consignment_id
          and cp.status='declined'
      ),
      'submissions',jsonb_array_length(v_submissions),
      'waiting_review',(select count(*) from pci.submissions s where s.consignment_id=v_consignment.consignment_id and s.status='submitted'),
      'preselected',(select count(*) from pci.submissions s where s.consignment_id=v_consignment.consignment_id and s.status='preselected'),
      'acquired',(select count(*) from pci.submissions s where s.consignment_id=v_consignment.consignment_id and s.status='acquired'),
      'matching_candidates',jsonb_array_length(v_matching_candidates)
    ),
    'financial',v_financial,
    'matching_candidates',v_matching_candidates,
    'revisions',v_revisions,
    'participants',v_participants,
    'submissions',v_submissions
  );
end;
$$;

create or replace function pci_api.admin_consignments(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select coalesce(
    jsonb_agg(item order by (item->>'created_at') desc),
    '[]'::jsonb
  )
  into v_items
  from (
    select jsonb_build_object(
      'consignment_id',c.consignment_id,
      'status',c.status,
      'visibility',c.visibility,
      'opens_at',c.opens_at,
      'closes_at',c.closes_at,
      'published_at',c.published_at,
      'closed_at',c.closed_at,
      'archived_at',c.archived_at,
      'created_at',c.created_at,
      'updated_at',c.updated_at,
      'max_submissions_per_creator',c.max_submissions_per_creator,
      'max_versions_per_submission',c.max_versions_per_submission,
      'current_revision',case
        when r.consignment_revision_id is null then null
        else jsonb_build_object(
          'consignment_revision_id',r.consignment_revision_id,
          'revision_number',r.revision_number,
          'status',r.status,
          'title',r.title,
          'summary',r.summary,
          'base_price_amount',r.base_price_amount,
          'currency',r.currency,
          'slots_available',r.slots_available,
          'pre_purchase_revision_limit',r.pre_purchase_revision_limit,
          'matching_tags',r.matching_tags,
          'published_at',r.published_at
        )
      end,
      'counts',jsonb_build_object(
        'participants',(
          select count(*)
          from pci.consignment_participations cp
          where cp.consignment_id=c.consignment_id
            and cp.status='active'
        ),
        'invitations_pending',(
          select count(*)
          from pci.consignment_participations cp
          where cp.consignment_id=c.consignment_id
            and cp.status='invited'
        ),
        'invitations_declined',(
          select count(*)
          from pci.consignment_participations cp
          where cp.consignment_id=c.consignment_id
            and cp.status='declined'
        ),
        'submissions',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id),
        'waiting_review',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id and s.status='submitted'),
        'preselected',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id and s.status='preselected'),
        'acquired',(select count(*) from pci.submissions s where s.consignment_id=c.consignment_id and s.status='acquired')
      ),
      'financial',pci.consignment_financial_summary(p_workspace_id,c.consignment_id)
    ) item
    from pci.consignments c
    left join pci.consignment_revisions r
      on r.consignment_revision_id=c.current_revision_id
    where c.workspace_id=p_workspace_id
  ) q;

  return jsonb_build_object('ok',true,'workspace_id',p_workspace_id,'items',v_items);
end;
$$;

comment on function pci_api.admin_consignment_detail(uuid,text,uuid) is
  'Admin Consignment detail read model. participants count is active-only; full participation history remains in participants[].';

comment on function pci_api.admin_consignments(uuid,text) is
  'Admin Consignments list read model. participants count is active-only; invitation counts are exposed separately.';
