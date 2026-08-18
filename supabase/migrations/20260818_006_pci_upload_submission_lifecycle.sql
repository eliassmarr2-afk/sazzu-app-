-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Upload -> technical processing -> rights declaration -> submission
--
-- Completes the first vertical slice so an uploaded V1 can become a valid
-- human-review submission without conflating technical invalidity with a
-- creative rejection.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: declare rights/origin facts for one exact version.
-- This is a declaration layer; it does not grant Protocol commercial rights.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_declare_version_rights(
  p_actor_user_id uuid,
  p_submission_version_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_authorship_basis text;
  v_contains_people boolean;
  v_people_authorized boolean;
  v_contains_external boolean;
  v_external_basis text;
  v_ai_used boolean;
  v_contains_minors boolean;
  v_clearance text := 'pending';
  v_result jsonb;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, true);
  perform pci.lock_command_key(
    'creator:' || v_creator_id::text || ':creator_declare_version_rights',
    p_idempotency_key
  );

  select sv.* into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = p_submission_version_id
    and sv.creator_id = v_creator_id
  for update;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_not_found';
  end if;

  perform pci.require_active_workspace_creator(v_creator_id, v_version.workspace_id);

  select s.* into v_submission
  from pci.submissions s
  where s.submission_id = v_version.submission_id
  for update;

  if v_submission.status in ('rejected', 'withdrawn', 'acquired') then
    raise exception using errcode = 'P0001', message = 'rights_declaration_not_allowed_in_current_state';
  end if;

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_creator_id
    and r.command_name = 'creator_declare_version_rights'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    v_version.workspace_id,
    'creator_declare_version_rights',
    p_request_hash,
    'processing'
  );

  v_authorship_basis := nullif(btrim(p_payload->>'authorship_basis'), '');
  v_contains_people := coalesce((p_payload->>'contains_identifiable_people')::boolean, false);
  v_people_authorized := coalesce((p_payload->>'image_voice_authorized')::boolean, false);
  v_contains_external := coalesce((p_payload->>'contains_external_material')::boolean, false);
  v_external_basis := nullif(btrim(p_payload->>'external_material_basis'), '');
  v_ai_used := coalesce((p_payload->>'generative_ai_used')::boolean, false);
  v_contains_minors := coalesce((p_payload->>'contains_minors')::boolean, false);

  if v_authorship_basis not in ('creator_owned', 'protocol_supplied', 'licensed_third_party', 'mixed') then
    raise exception using errcode = 'P0001', message = 'invalid_authorship_basis';
  end if;

  if v_contains_minors then
    raise exception using errcode = 'P0001', message = 'minors_not_supported';
  end if;

  if v_contains_people and not v_people_authorized then
    v_clearance := 'pending';
  elsif v_contains_external then
    if v_external_basis not in ('creator_owned', 'protocol_supplied', 'licensed_third_party') then
      raise exception using errcode = 'P0001', message = 'external_material_basis_required';
    end if;

    -- Third-party licensing remains pending until documentary evidence is
    -- reviewed in the rights-document slice.
    if v_external_basis in ('creator_owned', 'protocol_supplied')
       and v_authorship_basis in ('creator_owned', 'protocol_supplied', 'mixed') then
      v_clearance := 'complete';
    else
      v_clearance := 'pending';
    end if;
  elsif v_authorship_basis in ('creator_owned', 'protocol_supplied') then
    v_clearance := 'complete';
  else
    v_clearance := 'pending';
  end if;

  update pci.submission_versions
  set rights_declaration_snapshot = jsonb_build_object(
        'authorship_basis', v_authorship_basis,
        'contains_identifiable_people', v_contains_people,
        'image_voice_authorized', v_people_authorized,
        'contains_external_material', v_contains_external,
        'external_material_basis', v_external_basis,
        'generative_ai_used', v_ai_used,
        'contains_minors', v_contains_minors,
        'notes', nullif(btrim(p_payload->>'notes'), ''),
        'declared_at', now()
      ),
      rights_clearance_status = v_clearance
  where submission_version_id = p_submission_version_id;

  perform pci.append_event(
    p_request_id,
    v_version.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    'submission_version',
    p_submission_version_id,
    'submission_version.rights_declared',
    v_version.rights_clearance_status,
    v_clearance,
    null,
    jsonb_build_object(
      'submission_id', v_version.submission_id,
      'authorship_basis', v_authorship_basis,
      'contains_identifiable_people', v_contains_people,
      'contains_external_material', v_contains_external,
      'generative_ai_used', v_ai_used
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_version_id', p_submission_version_id,
    'rights_clearance_status', v_clearance
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'submission_version',
      result_entity_id = p_submission_version_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator_id
    and command_name = 'creator_declare_version_rights'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: confirm that the signed Storage upload completed.
-- PostgreSQL verifies the exact reserved bucket/path against storage.objects;
-- creator-provided file metadata is never trusted as the source of truth.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_confirm_submission_upload(
  p_actor_user_id uuid,
  p_submission_version_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_version pci.submission_versions%rowtype;
  v_object record;
  v_size bigint;
  v_mimetype text;
  v_result jsonb;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, true);
  perform pci.lock_command_key(
    'creator:' || v_creator_id::text || ':creator_confirm_submission_upload',
    p_idempotency_key
  );

  select sv.* into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = p_submission_version_id
    and sv.creator_id = v_creator_id
  for update;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_not_found';
  end if;

  perform pci.require_active_workspace_creator(v_creator_id, v_version.workspace_id);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_creator_id
    and r.command_name = 'creator_confirm_submission_upload'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    v_version.workspace_id,
    'creator_confirm_submission_upload',
    p_request_hash,
    'processing'
  );

  if v_version.status <> 'uploading' then
    raise exception using errcode = 'P0001', message = 'submission_version_not_uploading';
  end if;

  select o.id, o.created_at, o.metadata
    into v_object
  from storage.objects o
  where o.bucket_id = v_version.storage_bucket
    and o.name = v_version.storage_path
  limit 1;

  if v_object.id is null then
    raise exception using errcode = 'P0001', message = 'uploaded_object_not_found';
  end if;

  if v_version.upload_token_expires_at is not null
     and v_object.created_at is not null
     and v_object.created_at > v_version.upload_token_expires_at then
    raise exception using errcode = 'P0001', message = 'upload_completed_after_authorization_expiry';
  end if;

  v_size := coalesce(
    nullif(v_object.metadata->>'size', '')::bigint,
    nullif(v_object.metadata->>'contentLength', '')::bigint
  );
  v_mimetype := lower(coalesce(v_object.metadata->>'mimetype', ''));

  if v_size is null or v_size <= 0 then
    raise exception using errcode = 'P0001', message = 'uploaded_object_invalid_size';
  end if;
  if v_mimetype = '' or v_mimetype <> lower(v_version.mime_type) then
    raise exception using errcode = 'P0001', message = 'uploaded_object_mime_mismatch';
  end if;

  update pci.submission_versions
  set status = 'processing',
      file_size_bytes = v_size,
      mime_type = v_mimetype,
      uploaded_at = coalesce(v_object.created_at, now())
  where submission_version_id = p_submission_version_id;

  insert into pci.outbox (
    workspace_id,
    job_type,
    aggregate_type,
    aggregate_id,
    payload
  ) values (
    v_version.workspace_id,
    'analyze_submission_version',
    'submission_version',
    p_submission_version_id,
    jsonb_build_object(
      'submission_version_id', p_submission_version_id,
      'storage_bucket', v_version.storage_bucket,
      'storage_path', v_version.storage_path
    )
  );

  perform pci.append_event(
    p_request_id,
    v_version.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    'submission_version',
    p_submission_version_id,
    'submission_version.upload_confirmed',
    'uploading',
    'processing',
    null,
    jsonb_build_object(
      'submission_id', v_version.submission_id,
      'file_size_bytes', v_size,
      'mime_type', v_mimetype
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_version_id', p_submission_version_id,
    'status', 'processing',
    'file_size_bytes', v_size,
    'mime_type', v_mimetype
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'submission_version',
      result_entity_id = p_submission_version_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator_id
    and command_name = 'creator_confirm_submission_upload'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- WORKER COMMAND: finish technical analysis. Hash and media metadata are
-- supplied only by trusted worker code, never by creator-facing clients.
-- --------------------------------------------------------------------------

create or replace function pci_api.worker_finalize_submission_version(
  p_submission_version_id uuid,
  p_request_id uuid,
  p_result_status text,
  p_sha256 text default null,
  p_duration_seconds numeric default null,
  p_width integer default null,
  p_height integer default null,
  p_invalid_reason text default null,
  p_worker_name text default 'pci-worker'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version pci.submission_versions%rowtype;
  v_result jsonb;
begin
  select sv.* into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = p_submission_version_id
  for update;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_not_found';
  end if;

  if v_version.status = p_result_status
     and p_result_status in ('ready', 'invalid') then
    return jsonb_build_object(
      'ok', true,
      'submission_version_id', p_submission_version_id,
      'status', v_version.status,
      'idempotent', true
    );
  end if;

  if v_version.status <> 'processing' then
    raise exception using errcode = 'P0001', message = 'submission_version_not_processing';
  end if;

  if p_result_status not in ('ready', 'invalid') then
    raise exception using errcode = 'P0001', message = 'invalid_worker_result_status';
  end if;

  if p_result_status = 'ready' then
    if p_sha256 is null or p_sha256 !~ '^[0-9a-fA-F]{64}$' then
      raise exception using errcode = 'P0001', message = 'valid_sha256_required';
    end if;
    if p_width is not null and p_width <= 0 then
      raise exception using errcode = 'P0001', message = 'invalid_media_width';
    end if;
    if p_height is not null and p_height <= 0 then
      raise exception using errcode = 'P0001', message = 'invalid_media_height';
    end if;

    update pci.submission_versions
    set status = 'ready',
        sha256 = lower(p_sha256),
        duration_seconds = p_duration_seconds,
        width = p_width,
        height = p_height,
        invalid_reason = null,
        finalized_at = now()
    where submission_version_id = p_submission_version_id;
  else
    update pci.submission_versions
    set status = 'invalid',
        invalid_reason = coalesce(nullif(btrim(p_invalid_reason), ''), 'technical_validation_failed'),
        finalized_at = now()
    where submission_version_id = p_submission_version_id;
  end if;

  perform pci.append_event(
    p_request_id,
    v_version.workspace_id,
    'worker',
    null,
    null,
    'submission_version',
    p_submission_version_id,
    case
      when p_result_status = 'ready' then 'submission_version.technical_validation_passed'
      else 'submission_version.technical_validation_failed'
    end,
    'processing',
    p_result_status,
    case when p_result_status = 'invalid' then coalesce(p_invalid_reason, 'technical_validation_failed') else null end,
    jsonb_build_object(
      'worker', p_worker_name,
      'sha256', case when p_result_status = 'ready' then lower(p_sha256) else null end,
      'duration_seconds', p_duration_seconds,
      'width', p_width,
      'height', p_height
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_version_id', p_submission_version_id,
    'status', p_result_status
  );

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- CREATOR COMMAND: formally present a submission for human review.
-- A valid READY version and completed rights declaration are prerequisites.
-- --------------------------------------------------------------------------

create or replace function pci_api.creator_submit_submission(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_submission pci.submissions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_consignment pci.consignments%rowtype;
  v_version pci.submission_versions%rowtype;
  v_result jsonb;
begin
  v_creator_id := pci.require_creator(p_actor_user_id, true);
  perform pci.lock_command_key(
    'creator:' || v_creator_id::text || ':creator_submit_submission',
    p_idempotency_key
  );

  select s.* into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator_id
  for update;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  perform pci.require_active_workspace_creator(v_creator_id, v_submission.workspace_id);

  select r.* into v_receipt
  from pci.command_receipts r
  where r.actor_type = 'creator'
    and r.actor_user_id = p_actor_user_id
    and r.actor_creator_id = v_creator_id
    and r.command_name = 'creator_submit_submission'
    and r.idempotency_key = p_idempotency_key
  limit 1;

  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status = 'succeeded' then
      return v_receipt.result_payload;
    end if;
    raise exception using errcode = 'P0001', message = 'idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    request_id,
    actor_type,
    actor_user_id,
    actor_creator_id,
    workspace_id,
    command_name,
    request_hash,
    status
  ) values (
    p_idempotency_key,
    p_request_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    v_submission.workspace_id,
    'creator_submit_submission',
    p_request_hash,
    'processing'
  );

  if v_submission.status not in ('draft', 'changes_requested') then
    raise exception using errcode = 'P0001', message = 'submission_cannot_be_presented_in_current_state';
  end if;

  select p.* into v_participation
  from pci.consignment_participations p
  where p.participation_id = v_submission.participation_id;

  if v_participation.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'participation_not_active';
  end if;

  select c.* into v_consignment
  from pci.consignments c
  where c.consignment_id = v_submission.consignment_id;

  if v_submission.status = 'draft' then
    if v_consignment.status <> 'open' then
      raise exception using errcode = 'P0001', message = 'consignment_not_accepting_submissions';
    end if;
    if v_consignment.deadline_at is not null and v_consignment.deadline_at <= now() then
      raise exception using errcode = 'P0001', message = 'consignment_deadline_passed';
    end if;
  end if;

  select sv.* into v_version
  from pci.submission_versions sv
  where sv.submission_id = p_submission_id
  order by sv.version_number desc
  limit 1;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_required';
  end if;
  if v_version.status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'submission_version_not_ready';
  end if;
  if v_version.rights_clearance_status <> 'complete' then
    raise exception using errcode = 'P0001', message = 'rights_declaration_incomplete';
  end if;

  update pci.submissions
  set status = 'submitted',
      submitted_at = now()
  where submission_id = p_submission_id;

  perform pci.append_event(
    p_request_id,
    v_submission.workspace_id,
    'creator',
    p_actor_user_id,
    v_creator_id,
    'submission',
    p_submission_id,
    'submission.presented_for_review',
    v_submission.status,
    'submitted',
    null,
    jsonb_build_object(
      'submission_version_id', v_version.submission_version_id,
      'version_number', v_version.version_number,
      'consignment_revision_id', v_participation.consignment_revision_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'submission_version_id', v_version.submission_version_id,
    'status', 'submitted'
  );

  update pci.command_receipts
  set status = 'succeeded',
      result_entity_type = 'submission',
      result_entity_id = p_submission_id,
      result_payload = v_result,
      completed_at = now()
  where actor_type = 'creator'
    and actor_user_id = p_actor_user_id
    and actor_creator_id = v_creator_id
    and command_name = 'creator_submit_submission'
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- API permissions.
-- --------------------------------------------------------------------------

revoke execute on all functions in schema pci_api from public, anon, authenticated;
grant execute on all functions in schema pci_api to service_role;

commit;
