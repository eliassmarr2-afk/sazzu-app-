-- Protocol Creative Insights (PCI)
-- Creator upload finalization and creator-safe read models.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.creator_version_upload_context(
  p_actor_user_id uuid,
  p_submission_version_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
begin
  if p_submission_version_id is null then
    raise exception using errcode = '22023', message = 'pci_submission_version_id_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select sv.* into v_version
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.creator_id = v_creator.creator_id;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_version_not_found';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_version.submission_id;

  return jsonb_build_object(
    'ok', true,
    'submission_version_id', v_version.submission_version_id,
    'submission_id', v_version.submission_id,
    'workspace_id', v_submission.workspace_id,
    'status', v_version.status,
    'storage_bucket', v_version.storage_bucket,
    'storage_path', v_version.storage_path,
    'mime_type', v_version.mime_type,
    'original_filename', v_version.original_filename
  );
end;
$$;

create or replace function pci_api.finalize_submission_version(
  p_actor_user_id uuid,
  p_submission_version_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_file_size_bytes bigint,
  p_mime_type text,
  p_sha256 text,
  p_duration_seconds numeric default null,
  p_width integer default null,
  p_height integer default null,
  p_storage_validation jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_sha256 text;
  v_result jsonb;
begin
  if p_submission_version_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_finalize_context_required';
  end if;

  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 262144000 then
    raise exception using errcode = '22023', message = 'pci_video_size_invalid';
  end if;

  if p_mime_type not in ('video/mp4','video/quicktime') then
    raise exception using errcode = '22023', message = 'pci_video_mime_not_allowed';
  end if;

  v_sha256 := lower(btrim(coalesce(p_sha256, '')));
  if v_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'pci_sha256_invalid';
  end if;

  if p_duration_seconds is not null and p_duration_seconds < 0 then
    raise exception using errcode = '22023', message = 'pci_video_duration_invalid';
  end if;
  if p_width is not null and p_width <= 0 then
    raise exception using errcode = '22023', message = 'pci_video_width_invalid';
  end if;
  if p_height is not null and p_height <= 0 then
    raise exception using errcode = '22023', message = 'pci_video_height_invalid';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select sv.* into v_version
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.creator_id = v_creator.creator_id
  for update of sv;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_version_not_found';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_version.submission_id
  for update;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_submission.workspace_id,
    'finalize_submission_version', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'finalize_submission_version'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc
    limit 1;

    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  if v_version.status not in ('uploading','processing') then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_finalizable';
  end if;

  if v_version.storage_bucket <> 'pci-submissions' or v_version.storage_path is null then
    raise exception using errcode = '23514', message = 'pci_submission_version_storage_invalid';
  end if;

  if v_version.mime_type is distinct from p_mime_type then
    raise exception using errcode = '23514', message = 'pci_submission_version_mime_mismatch';
  end if;

  if coalesce((p_storage_validation->>'object_exists')::boolean, false) is not true then
    raise exception using errcode = '23514', message = 'pci_storage_object_not_verified';
  end if;

  update pci.submission_versions
  set status = 'processing'
  where submission_version_id = v_version.submission_version_id;

  perform pci.append_event(
    v_submission.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'submission_version', v_version.submission_version_id,
    'submission.version_processing', v_version.status, 'processing',
    p_request_id, v_receipt_id,
    jsonb_build_object('submission_id', v_submission.submission_id)
  );

  update pci.submission_versions
  set status = 'ready',
      file_size_bytes = p_file_size_bytes,
      mime_type = p_mime_type,
      sha256 = v_sha256,
      duration_seconds = p_duration_seconds,
      width = p_width,
      height = p_height,
      technical_validation = coalesce(p_storage_validation, '{}'::jsonb)
        || jsonb_build_object(
             'checksum_algorithm', 'sha256',
             'checksum_source', 'creator_client',
             'finalized_by_backend', true
           ),
      uploaded_at = coalesce(uploaded_at, now()),
      finalized_at = now(),
      invalid_reason = null
  where submission_version_id = v_version.submission_version_id;

  update pci.submissions
  set current_version_id = v_version.submission_version_id,
      status = 'submitted',
      submitted_at = now()
  where submission_id = v_submission.submission_id
    and status in ('draft','changes_requested');

  perform pci.append_event(
    v_submission.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'submission_version', v_version.submission_version_id,
    'submission.version_ready', 'processing', 'ready',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'file_size_bytes', p_file_size_bytes,
      'mime_type', p_mime_type,
      'sha256', v_sha256
    )
  );

  if v_submission.status in ('draft','changes_requested') then
    perform pci.append_event(
      v_submission.workspace_id,
      'creator', p_actor_user_id, v_creator.creator_id,
      'submission', v_submission.submission_id,
      'submission.submitted', v_submission.status, 'submitted',
      p_request_id, v_receipt_id,
      jsonb_build_object('submission_version_id', v_version.submission_version_id)
    );
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'version_status', 'ready',
    'submission_status', case
      when v_submission.status in ('draft','changes_requested') then 'submitted'
      else v_submission.status
    end,
    'sha256', v_sha256
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'submission_version',
      result_entity_id = v_version.submission_version_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.creator_opportunities(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);

  select coalesce(jsonb_agg(item order by (item->>'published_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'consignment_id', c.consignment_id,
      'workspace_id', c.workspace_id,
      'visibility', c.visibility,
      'status', c.status,
      'published_at', c.published_at,
      'closes_at', c.closes_at,
      'revision', jsonb_build_object(
        'consignment_revision_id', r.consignment_revision_id,
        'revision_number', r.revision_number,
        'title', r.title,
        'summary', r.summary,
        'objective', r.objective,
        'creative_angle', r.creative_angle,
        'hook_guidance', r.hook_guidance,
        'format_requirements', r.format_requirements,
        'acceptance_criteria', r.acceptance_criteria,
        'subject_type', r.subject_type,
        'subject_ref', r.subject_ref,
        'subject_snapshot', r.subject_snapshot,
        'base_price_amount', r.base_price_amount,
        'currency', r.currency,
        'slots_available', r.slots_available,
        'performance_bonus_policy', r.performance_bonus_policy,
        'pre_purchase_revision_limit', r.pre_purchase_revision_limit,
        'rights_package_snapshot', r.rights_package_snapshot
      ),
      'participation', case when p.participation_id is null then null else jsonb_build_object(
        'participation_id', p.participation_id,
        'status', p.status,
        'joined_at', p.joined_at
      ) end
    ) as item
    from pci.consignments c
    join pci.consignment_revisions r
      on r.consignment_revision_id = c.current_revision_id
    join pci.workspace_creators wc
      on wc.workspace_id = c.workspace_id
     and wc.creator_id = v_creator.creator_id
     and wc.status in ('active','restricted')
    left join pci.consignment_participations p
      on p.consignment_id = c.consignment_id
     and p.creator_id = v_creator.creator_id
    where c.status = 'open'
      and (c.opens_at is null or c.opens_at <= now())
      and (c.closes_at is null or c.closes_at > now())
      and (
        c.visibility = 'open'
        or (c.visibility = 'invite_only' and p.status = 'invited')
      )
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

create or replace function pci_api.creator_submissions(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'submission_id', s.submission_id,
      'workspace_id', s.workspace_id,
      'consignment_id', s.consignment_id,
      'status', s.status,
      'concept_label', s.concept_label,
      'created_at', s.created_at,
      'submitted_at', s.submitted_at,
      'current_version', case when sv.submission_version_id is null then null else jsonb_build_object(
        'submission_version_id', sv.submission_version_id,
        'version_number', sv.version_number,
        'status', sv.status,
        'rights_clearance_status', sv.rights_clearance_status,
        'original_filename', sv.original_filename,
        'mime_type', sv.mime_type,
        'file_size_bytes', sv.file_size_bytes,
        'duration_seconds', sv.duration_seconds,
        'width', sv.width,
        'height', sv.height,
        'finalized_at', sv.finalized_at
      ) end
    ) as item
    from pci.submissions s
    left join pci.submission_versions sv
      on sv.submission_version_id = s.current_version_id
    where s.creator_id = v_creator.creator_id
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

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
  v_versions jsonb;
  v_consignment_title text;
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

  select r.title into v_consignment_title
  from pci.consignments c
  join pci.consignment_revisions r on r.consignment_revision_id = c.current_revision_id
  where c.consignment_id = v_submission.consignment_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'submission_version_id', sv.submission_version_id,
      'version_number', sv.version_number,
      'status', sv.status,
      'rights_clearance_status', sv.rights_clearance_status,
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

  return jsonb_build_object(
    'ok', true,
    'submission', jsonb_build_object(
      'submission_id', v_submission.submission_id,
      'workspace_id', v_submission.workspace_id,
      'consignment_id', v_submission.consignment_id,
      'consignment_title', v_consignment_title,
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
    'versions', v_versions
  );
end;
$$;

revoke all on function pci_api.creator_version_upload_context(uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.finalize_submission_version(uuid,uuid,uuid,uuid,bigint,text,text,numeric,integer,integer,jsonb) from public, anon, authenticated;
revoke all on function pci_api.creator_opportunities(uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_submissions(uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_submission_detail(uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.creator_version_upload_context(uuid,uuid) to service_role;
grant execute on function pci_api.finalize_submission_version(uuid,uuid,uuid,uuid,bigint,text,text,numeric,integer,integer,jsonb) to service_role;
grant execute on function pci_api.creator_opportunities(uuid) to service_role;
grant execute on function pci_api.creator_submissions(uuid) to service_role;
grant execute on function pci_api.creator_submission_detail(uuid,uuid) to service_role;

comment on function pci_api.finalize_submission_version(uuid,uuid,uuid,uuid,bigint,text,text,numeric,integer,integer,jsonb) is
  'Finalizes a creator-owned upload only after the Edge Function verifies the exact Storage object. Marks the version ready and submits/resubmits the creative.';
