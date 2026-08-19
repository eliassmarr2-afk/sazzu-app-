-- Protocol Creative Insights (PCI)
-- Phase 1N.5 frontend support: formal Creator rights declaration v1 + Creator-safe clearance projection.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.guard_creator_rights_declaration_schema_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_declaration jsonb := coalesce(new.rights_declaration, '{}'::jsonb);
  v_origin jsonb;
  v_third_party jsonb;
  v_music jsonb;
  v_ai jsonb;
  v_people jsonb;
  v_certification jsonb;
  v_used boolean;
  v_people_present boolean;
begin
  if new.rights_declaration is not distinct from old.rights_declaration then
    return new;
  end if;

  -- Empty declaration remains valid before the Creator submits one.
  if v_declaration = '{}'::jsonb then
    return new;
  end if;

  if jsonb_typeof(v_declaration) <> 'object'
     or coalesce(v_declaration->>'schema_version', '') <> '1'
     or v_declaration - array['schema_version','origin','third_party_assets','music_audio','ai','people','certification']::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  v_origin := v_declaration->'origin';
  v_third_party := v_declaration->'third_party_assets';
  v_music := v_declaration->'music_audio';
  v_ai := v_declaration->'ai';
  v_people := v_declaration->'people';
  v_certification := v_declaration->'certification';

  if jsonb_typeof(v_origin) <> 'object'
     or v_origin - array['source_type','creator_authorship_confirmed','notes']::text[] <> '{}'::jsonb
     or coalesce(v_origin->>'source_type','') not in ('creator_original','creator_original_with_third_party_elements')
     or coalesce((v_origin->>'creator_authorship_confirmed')::boolean, false) is not true
     or length(coalesce(v_origin->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_third_party) <> 'object'
     or v_third_party - array['used','authorization_confirmed','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_third_party->'used') <> 'boolean'
     or length(coalesce(v_third_party->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_used := (v_third_party->>'used')::boolean;
  if v_used and (
    jsonb_typeof(v_third_party->'authorization_confirmed') <> 'boolean'
    or (v_third_party->>'authorization_confirmed')::boolean is not true
    or nullif(btrim(coalesce(v_third_party->>'notes','')), '') is null
  ) then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_music) <> 'object'
     or v_music - array['used','source','commercial_use_confirmed','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_music->'used') <> 'boolean'
     or coalesce(v_music->>'source','') not in ('none','original','licensed','platform_library','other')
     or length(coalesce(v_music->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_used := (v_music->>'used')::boolean;
  if (not v_used and v_music->>'source' <> 'none')
     or (v_used and v_music->>'source' = 'none')
     or (v_used and (
       jsonb_typeof(v_music->'commercial_use_confirmed') <> 'boolean'
       or (v_music->>'commercial_use_confirmed')::boolean is not true
     ))
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_ai) <> 'object'
     or v_ai - array['used','tool','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_ai->'used') <> 'boolean'
     or length(coalesce(v_ai->>'tool','')) > 160
     or length(coalesce(v_ai->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_used := (v_ai->>'used')::boolean;
  if v_used and nullif(btrim(coalesce(v_ai->>'tool','')), '') is null then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_people) <> 'object'
     or v_people - array['identifiable_people','all_adults_confirmed','permission_confirmed','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_people->'identifiable_people') <> 'boolean'
     or length(coalesce(v_people->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_people_present := (v_people->>'identifiable_people')::boolean;
  if v_people_present and (
    jsonb_typeof(v_people->'all_adults_confirmed') <> 'boolean'
    or (v_people->>'all_adults_confirmed')::boolean is not true
    or jsonb_typeof(v_people->'permission_confirmed') <> 'boolean'
    or (v_people->>'permission_confirmed')::boolean is not true
  ) then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_certification) <> 'object'
     or v_certification - array['information_accurate']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_certification->'information_accurate') <> 'boolean'
     or (v_certification->>'information_accurate')::boolean is not true
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  return new;
exception
  when invalid_text_representation then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
end;
$$;

revoke all on function pci.guard_creator_rights_declaration_schema_v1() from public, anon, authenticated;
grant execute on function pci.guard_creator_rights_declaration_schema_v1() to service_role;

drop trigger if exists pci_submission_versions_rights_declaration_schema_guard on pci.submission_versions;
create trigger pci_submission_versions_rights_declaration_schema_guard
before update of rights_declaration on pci.submission_versions
for each row execute function pci.guard_creator_rights_declaration_schema_v1();

comment on function pci.guard_creator_rights_declaration_schema_v1() is
  'Validates factual Creator rights declaration schema v1 on an exact immutable submission version. Empty declaration is allowed until first submission; commercial/legal terms remain separate versioned documents.';

create or replace function pci_api.creator_submission_detail(
  p_actor_user_id uuid,
  p_submission_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_submission pci.submissions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_versions jsonb;
  v_reviews jsonb;
  v_clearance_reviews jsonb;
begin
  if p_submission_id is null then
    raise exception using errcode = '22023', message = 'pci_submission_id_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  select * into v_participation
  from pci.consignment_participations p
  where p.participation_id = v_submission.participation_id
    and p.creator_id = v_creator.creator_id;

  if v_participation.participation_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_participation_context_invalid';
  end if;

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_participation.consignment_revision_id
    and r.consignment_id = v_submission.consignment_id;

  if v_revision.consignment_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_revision_context_invalid';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'submission_version_id', sv.submission_version_id,
      'version_number', sv.version_number,
      'status', sv.status,
      'rights_clearance_status', sv.rights_clearance_status,
      'rights_declaration', sv.rights_declaration,
      'rights_declaration_submitted_at', (
        select max(e.created_at)
        from pci.events e
        where e.entity_type = 'submission_version'
          and e.entity_id = sv.submission_version_id
          and e.event_type = 'rights.declaration_submitted'
      ),
      'rights_declaration_locked', exists (
        select 1 from pci.rights_grants rg
        where rg.submission_version_id = sv.submission_version_id
      ),
      'original_filename', sv.original_filename,
      'mime_type', sv.mime_type,
      'file_size_bytes', sv.file_size_bytes,
      'duration_seconds', sv.duration_seconds,
      'width', sv.width,
      'height', sv.height,
      'sha256', sv.sha256,
      'uploaded_at', sv.uploaded_at,
      'finalized_at', sv.finalized_at,
      'invalid_reason', sv.invalid_reason
    ) order by sv.version_number desc
  ), '[]'::jsonb)
  into v_versions
  from pci.submission_versions sv
  where sv.submission_id = v_submission.submission_id;

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_reviews
  from (
    select jsonb_build_object(
      'review_id', sr.review_id,
      'submission_version_id', sr.submission_version_id,
      'version_number', sv.version_number,
      'decision', sr.decision,
      'rejection_reason_code', sr.rejection_reason_code,
      'creator_feedback', sr.creator_feedback,
      'created_at', sr.created_at
    ) as item
    from pci.submission_reviews sr
    join pci.submission_versions sv
      on sv.submission_version_id = sr.submission_version_id
    where sr.submission_id = v_submission.submission_id
      and sr.decision in ('changes_requested','preselected','rejected')
  ) q;

  -- `reason` on a flagged clearance is Creator-facing corrective feedback.
  -- Protocol-private analysis belongs in pci.internal_notes instead.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'rights_clearance_review_id', rcr.rights_clearance_review_id,
      'submission_version_id', rcr.submission_version_id,
      'version_number', sv.version_number,
      'clearance_status', rcr.clearance_status,
      'reason', rcr.reason,
      'created_at', rcr.created_at
    ) order by rcr.created_at desc
  ), '[]'::jsonb)
  into v_clearance_reviews
  from pci.rights_clearance_reviews rcr
  join pci.submission_versions sv
    on sv.submission_version_id = rcr.submission_version_id
  where sv.submission_id = v_submission.submission_id;

  return jsonb_build_object(
    'ok', true,
    'submission', jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'workspace_id', v_submission.workspace_id,
      'consignment_id', v_submission.consignment_id,
      'consignment_revision_id', v_revision.consignment_revision_id,
      'consignment_revision_number', v_revision.revision_number,
      'consignment_title', v_revision.title,
      'status', v_submission.status,
      'concept_label', v_submission.concept_label,
      'concept_metadata', v_submission.concept_metadata,
      'current_version_id', v_submission.current_version_id,
      'submitted_at', v_submission.submitted_at,
      'rejected_at', v_submission.rejected_at,
      'withdrawn_at', v_submission.withdrawn_at,
      'acquired_at', v_submission.acquired_at,
      'created_at', v_submission.created_at
    ),
    'versions', v_versions,
    'reviews', v_reviews,
    'rights_clearance_reviews', v_clearance_reviews
  );
end;
$$;

revoke all on function pci_api.creator_submission_detail(uuid,uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_submission_detail(uuid,uuid) to service_role;

comment on function pci_api.creator_submission_detail(uuid,uuid) is
  'Creator-safe Submission detail anchored to the accepted brief revision. Includes Creator-owned rights declaration plus Creator-facing clearance history; never returns reviewer identity, Protocol internal notes or internal summaries.';