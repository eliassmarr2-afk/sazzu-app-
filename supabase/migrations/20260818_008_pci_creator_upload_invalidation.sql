-- Protocol Creative Insights (PCI)
-- Audited technical invalidation for creator upload versions.
-- Missing/incomplete uploads are not invalidated: they remain resumable.

create or replace function pci_api.invalidate_submission_version(
  p_actor_user_id uuid,
  p_submission_version_id uuid,
  p_idempotency_key uuid,
  p_request_id uuid,
  p_reason_code text,
  p_validation_metadata jsonb default '{}'::jsonb
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
  v_reason text;
  v_result jsonb;
begin
  if p_submission_version_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_invalidation_context_required';
  end if;

  v_reason := btrim(coalesce(p_reason_code, ''));
  if v_reason not in ('file_too_large','mime_mismatch','invalid_media','storage_metadata_invalid') then
    raise exception using errcode = '22023', message = 'pci_invalidation_reason_invalid';
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
    'invalidate_submission_version', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'invalidate_submission_version'
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

  if v_version.status = 'ready' then
    raise exception using errcode = '23514', message = 'pci_ready_submission_version_immutable';
  end if;

  if v_version.status not in ('uploading','processing','invalid') then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_invalidatable';
  end if;

  if v_version.status <> 'invalid' then
    update pci.submission_versions
    set status = 'invalid',
        invalid_reason = v_reason,
        technical_validation = coalesce(p_validation_metadata, '{}'::jsonb)
          || jsonb_build_object('invalidated_by_backend', true, 'invalidated_at', now())
    where submission_version_id = v_version.submission_version_id;

    perform pci.append_event(
      v_submission.workspace_id,
      'system', p_actor_user_id, v_creator.creator_id,
      'submission_version', v_version.submission_version_id,
      'submission.version_invalid', v_version.status, 'invalid',
      p_request_id, v_receipt_id,
      jsonb_build_object(
        'submission_id', v_submission.submission_id,
        'reason_code', v_reason,
        'validation', coalesce(p_validation_metadata, '{}'::jsonb)
      )
    );
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'version_status', 'invalid',
    'reason_code', v_reason
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

revoke all on function pci_api.invalidate_submission_version(uuid,uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function pci_api.invalidate_submission_version(uuid,uuid,uuid,uuid,text,jsonb) to service_role;

comment on function pci_api.invalidate_submission_version(uuid,uuid,uuid,uuid,text,jsonb) is
  'Marks an uploaded creator version technically invalid only when the backend has evidence of a real invalid object; incomplete uploads remain resumable.';
