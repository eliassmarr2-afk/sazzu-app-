-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Worker replay hardening
--
-- A second worker delivery for an already-finalized version is idempotent only
-- when it describes the exact same technical result. Different hash/metadata is
-- an integrity conflict and must never be silently accepted.
-- ============================================================================

begin;

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
  v_normalized_hash text;
  v_normalized_reason text;
  v_result jsonb;
begin
  select sv.* into v_version
  from pci.submission_versions sv
  where sv.submission_version_id = p_submission_version_id
  for update;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0001', message = 'submission_version_not_found';
  end if;

  if p_result_status not in ('ready', 'invalid') then
    raise exception using errcode = 'P0001', message = 'invalid_worker_result_status';
  end if;

  v_normalized_hash := case when p_sha256 is null then null else lower(p_sha256) end;
  v_normalized_reason := coalesce(nullif(btrim(p_invalid_reason), ''), 'technical_validation_failed');

  if v_version.status in ('ready', 'invalid') then
    if v_version.status <> p_result_status then
      raise exception using errcode = 'P0001', message = 'worker_replay_result_conflict';
    end if;

    if p_result_status = 'ready' and (
      v_version.sha256 is distinct from v_normalized_hash
      or v_version.duration_seconds is distinct from p_duration_seconds
      or v_version.width is distinct from p_width
      or v_version.height is distinct from p_height
    ) then
      raise exception using errcode = 'P0001', message = 'worker_replay_metadata_conflict';
    end if;

    if p_result_status = 'invalid'
       and v_version.invalid_reason is distinct from v_normalized_reason then
      raise exception using errcode = 'P0001', message = 'worker_replay_metadata_conflict';
    end if;

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

  if p_result_status = 'ready' then
    if v_normalized_hash is null or v_normalized_hash !~ '^[0-9a-f]{64}$' then
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
        sha256 = v_normalized_hash,
        duration_seconds = p_duration_seconds,
        width = p_width,
        height = p_height,
        invalid_reason = null,
        finalized_at = now()
    where submission_version_id = p_submission_version_id;
  else
    update pci.submission_versions
    set status = 'invalid',
        invalid_reason = v_normalized_reason,
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
    case when p_result_status = 'invalid' then v_normalized_reason else null end,
    jsonb_build_object(
      'worker', p_worker_name,
      'sha256', case when p_result_status = 'ready' then v_normalized_hash else null end,
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

revoke execute on function pci_api.worker_finalize_submission_version(
  uuid, uuid, text, text, numeric, integer, integer, text, text
) from public, anon, authenticated;

grant execute on function pci_api.worker_finalize_submission_version(
  uuid, uuid, text, text, numeric, integer, integer, text, text
) to service_role;

commit;
