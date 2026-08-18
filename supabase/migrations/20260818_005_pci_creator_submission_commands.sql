-- Protocol Creative Insights (PCI)
-- Creator-side transactional commands for the first vertical slice.

create or replace function pci.require_active_creator(
  p_auth_user_id uuid
)
returns pci.creators
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
begin
  select * into v_creator
  from pci.creators c
  where c.auth_user_id = p_auth_user_id
  for update;

  if v_creator.creator_id is null then
    raise exception using errcode = '42501', message = 'pci_creator_not_linked';
  end if;

  if v_creator.status <> 'active' then
    raise exception using errcode = '42501', message = 'pci_creator_not_active';
  end if;

  return v_creator;
end;
$$;

revoke all on function pci.require_active_creator(uuid) from public, anon, authenticated;
grant execute on function pci.require_active_creator(uuid) to service_role;

create or replace function pci_api.join_consignment(
  p_actor_user_id uuid,
  p_consignment_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_consignment pci.consignments%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_participation_id uuid;
  v_result jsonb;
begin
  if p_consignment_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_join_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id = p_consignment_id
  for update;

  if v_consignment.consignment_id is null then
    raise exception using errcode = 'P0002', message = 'pci_consignment_not_found';
  end if;

  if v_consignment.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_consignment_not_open';
  end if;

  if v_consignment.visibility <> 'open' then
    raise exception using errcode = '42501', message = 'pci_consignment_invitation_required';
  end if;

  if v_consignment.current_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_consignment_revision_required';
  end if;

  select * into v_relationship
  from pci.workspace_creators wc
  where wc.workspace_id = v_consignment.workspace_id
    and wc.creator_id = v_creator.creator_id;

  if v_relationship.workspace_creator_id is null or v_relationship.status <> 'active' then
    raise exception using errcode = '42501', message = 'pci_creator_workspace_access_denied';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_consignment.workspace_id,
    'join_consignment', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'join_consignment'
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

  insert into pci.consignment_participations (
    workspace_id,
    consignment_id,
    consignment_revision_id,
    creator_id,
    status,
    joined_at
  ) values (
    v_consignment.workspace_id,
    v_consignment.consignment_id,
    v_consignment.current_revision_id,
    v_creator.creator_id,
    'active',
    now()
  )
  on conflict (consignment_id, creator_id) do update
  set status = case
      when pci.consignment_participations.status = 'active' then 'active'
      else pci.consignment_participations.status
    end
  returning participation_id into v_participation_id;

  if not exists (
    select 1 from pci.consignment_participations p
    where p.participation_id = v_participation_id and p.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'pci_participation_not_joinable';
  end if;

  perform pci.append_event(
    v_consignment.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'consignment_participation', v_participation_id,
    'creator.joined_consignment', null, 'active',
    p_request_id, v_receipt_id,
    jsonb_build_object('consignment_id', v_consignment.consignment_id, 'revision_id', v_consignment.current_revision_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'participation_id', v_participation_id,
    'consignment_id', v_consignment.consignment_id,
    'consignment_revision_id', v_consignment.current_revision_id,
    'status', 'active'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'consignment_participation',
      result_entity_id = v_participation_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.create_submission(
  p_actor_user_id uuid,
  p_consignment_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_concept_label text default null,
  p_concept_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_consignment pci.consignments%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_submission_id uuid;
  v_submission_count integer;
  v_result jsonb;
begin
  if p_consignment_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_submission_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id = p_consignment_id
  for update;

  if v_consignment.consignment_id is null or v_consignment.status <> 'open' then
    raise exception using errcode = '23514', message = 'pci_consignment_not_open';
  end if;

  select * into v_participation
  from pci.consignment_participations p
  where p.consignment_id = p_consignment_id
    and p.creator_id = v_creator.creator_id
    and p.status = 'active'
  for update;

  if v_participation.participation_id is null then
    raise exception using errcode = '42501', message = 'pci_active_participation_required';
  end if;

  if v_consignment.max_submissions_per_creator is not null then
    select count(*) into v_submission_count
    from pci.submissions s
    where s.consignment_id = p_consignment_id
      and s.creator_id = v_creator.creator_id
      and s.status <> 'withdrawn';

    if v_submission_count >= v_consignment.max_submissions_per_creator then
      raise exception using errcode = '23514', message = 'pci_submission_limit_reached';
    end if;
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_consignment.workspace_id,
    'create_submission', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'create_submission'
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

  insert into pci.submissions (
    workspace_id, consignment_id, participation_id, creator_id,
    status, concept_label, concept_metadata
  ) values (
    v_consignment.workspace_id, p_consignment_id, v_participation.participation_id, v_creator.creator_id,
    'draft', nullif(btrim(coalesce(p_concept_label,'')), ''), coalesce(p_concept_metadata, '{}'::jsonb)
  ) returning submission_id into v_submission_id;

  perform pci.append_event(
    v_consignment.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'submission', v_submission_id,
    'submission.created', null, 'draft',
    p_request_id, v_receipt_id,
    jsonb_build_object('consignment_id', p_consignment_id, 'participation_id', v_participation.participation_id)
  );

  v_result := jsonb_build_object('ok', true, 'submission_id', v_submission_id, 'status', 'draft');

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'submission', result_entity_id = v_submission_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.reserve_submission_version(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_original_filename text,
  p_mime_type text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_submission pci.submissions%rowtype;
  v_consignment pci.consignments%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_version_id uuid := gen_random_uuid();
  v_version_number integer;
  v_extension text;
  v_storage_path text;
  v_result jsonb;
begin
  if p_submission_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_version_context_required';
  end if;

  if p_mime_type not in ('video/mp4','video/quicktime') then
    raise exception using errcode = '22023', message = 'pci_video_mime_not_allowed';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id
  for update;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  if v_submission.status not in ('draft','changes_requested') then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_allowed';
  end if;

  select * into v_consignment
  from pci.consignments c
  where c.consignment_id = v_submission.consignment_id;

  select coalesce(max(sv.version_number), 0) + 1 into v_version_number
  from pci.submission_versions sv
  where sv.submission_id = p_submission_id;

  if v_consignment.max_versions_per_submission is not null
     and v_version_number > v_consignment.max_versions_per_submission then
    raise exception using errcode = '23514', message = 'pci_version_limit_reached';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_submission.workspace_id,
    'reserve_submission_version', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'reserve_submission_version'
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

  v_extension := case when p_mime_type = 'video/quicktime' then 'mov' else 'mp4' end;
  v_storage_path := format(
    'workspace/%s/creator/%s/submission/%s/version/%s/original.%s',
    v_submission.workspace_id,
    v_creator.creator_id,
    v_submission.submission_id,
    v_version_id,
    v_extension
  );

  insert into pci.submission_versions (
    submission_version_id, submission_id, version_number, status,
    storage_bucket, storage_path, original_filename, mime_type
  ) values (
    v_version_id, p_submission_id, v_version_number, 'uploading',
    'pci-submissions', v_storage_path, nullif(btrim(coalesce(p_original_filename,'')), ''), p_mime_type
  );

  perform pci.append_event(
    v_submission.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'submission_version', v_version_id,
    'submission.version_reserved', null, 'uploading',
    p_request_id, v_receipt_id,
    jsonb_build_object('submission_id', p_submission_id, 'version_number', v_version_number)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'submission_version_id', v_version_id,
    'version_number', v_version_number,
    'status', 'uploading',
    'storage_bucket', 'pci-submissions',
    'storage_path', v_storage_path,
    'mime_type', p_mime_type
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'submission_version', result_entity_id = v_version_id,
      response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.join_consignment(uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.create_submission(uuid,uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function pci_api.reserve_submission_version(uuid,uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function pci_api.join_consignment(uuid,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.create_submission(uuid,uuid,uuid,uuid,text,jsonb) to service_role;
grant execute on function pci_api.reserve_submission_version(uuid,uuid,uuid,uuid,text,text) to service_role;
