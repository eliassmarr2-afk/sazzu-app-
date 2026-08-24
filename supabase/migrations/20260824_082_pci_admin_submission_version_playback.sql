-- Protocol Creative Insights (PCI)
-- 2.1N.1 · Private operator playback context for Creator submission versions.
-- Runtime-test first. No production deployment in this phase.

create or replace function pci_api.admin_submission_version_playback_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_version_id uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select sv.*
  into v_version
  from pci.submission_versions sv
  join pci.submissions s
    on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.workspace_id = p_workspace_id;

  if v_version.submission_version_id is null then
    raise exception
      using errcode = 'P0002',
      message = 'pci_submission_version_not_found';
  end if;

  select *
  into v_submission
  from pci.submissions s
  where s.submission_id = v_version.submission_id
    and s.workspace_id = p_workspace_id;

  if v_submission.submission_id is null then
    raise exception
      using errcode = 'P0002',
      message = 'pci_submission_not_found';
  end if;

  if v_version.status <> 'ready' then
    raise exception
      using errcode = '23514',
      message = 'pci_submission_version_not_ready';
  end if;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'submission_id', v_submission.submission_id,
    'submission_status', v_submission.status,
    'submission_version_id', v_version.submission_version_id,
    'version_number', v_version.version_number,
    'version_status', v_version.status,
    'rights_clearance_status', v_version.rights_clearance_status,
    'storage_bucket', v_version.storage_bucket,
    'storage_path', v_version.storage_path,
    'original_filename', v_version.original_filename,
    'mime_type', v_version.mime_type,
    'file_size_bytes', v_version.file_size_bytes,
    'duration_seconds', v_version.duration_seconds,
    'width', v_version.width,
    'height', v_version.height,
    'sha256', v_version.sha256
  );
end;
$$;

revoke all on function pci_api.admin_submission_version_playback_context(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function pci_api.admin_submission_version_playback_context(
  uuid,
  text,
  uuid
) to service_role;

comment on function pci_api.admin_submission_version_playback_context(
  uuid,
  text,
  uuid
) is
  'Authorized operator playback context for a ready Creator submission version. Storage path is intended for server-side signing only.';
