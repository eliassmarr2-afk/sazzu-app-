-- PCI 2.1N.3 · Rights declaration request flow
-- This asks the Creator for factual information about the exact submitted version.
-- It does NOT transfer rights, create a creative review, consume a revision round,
-- change the Submission status, or change rights_clearance_status.

create table pci.rights_declaration_requests (
  rights_declaration_request_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  submission_version_id uuid not null references pci.submission_versions(submission_version_id) on delete restrict,
  message text not null,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint rights_declaration_requests_message_check
    check (
      nullif(btrim(coalesce(message, '')), '') is not null
      and char_length(btrim(message)) <= 1500
    )
);

create index rights_declaration_requests_version_created_idx
  on pci.rights_declaration_requests(submission_version_id, created_at desc);

revoke all on table pci.rights_declaration_requests from public, anon, authenticated;
grant select, insert on table pci.rights_declaration_requests to service_role;

create or replace function pci_api.admin_request_rights_declaration(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_version_id uuid,
  p_message text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_declaration_request_id uuid;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_version_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_request_context_required';
  end if;

  if v_message is null or char_length(v_message) > 1500 then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_request_message_invalid';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select sv, s
  into v_version, v_submission
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.workspace_id = p_workspace_id
  for update of sv, s;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_version_not_found';
  end if;

  if v_submission.current_version_id is distinct from v_version.submission_version_id then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_request_current_version_required';
  end if;

  if v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_ready';
  end if;

  if coalesce(v_version.rights_declaration, '{}'::jsonb) <> '{}'::jsonb then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_already_present';
  end if;

  if v_version.rights_clearance_status <> 'pending' then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_request_clearance_invalid';
  end if;

  if v_submission.status not in ('submitted', 'under_review') then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_request_not_allowed';
  end if;

  insert into pci.command_receipts (
    idempotency_key,
    actor_type,
    actor_user_id,
    workspace_id,
    command_name,
    request_id,
    status
  ) values (
    p_idempotency_key,
    'operator',
    p_actor_user_id,
    p_workspace_id,
    'admin_request_rights_declaration',
    p_request_id,
    'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'admin_request_rights_declaration'
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

  insert into pci.rights_declaration_requests (
    workspace_id,
    submission_version_id,
    message,
    requested_by
  ) values (
    p_workspace_id,
    v_version.submission_version_id,
    v_message,
    p_actor_user_id
  )
  returning rights_declaration_request_id into v_declaration_request_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'submission_version', v_version.submission_version_id,
    'rights.declaration_requested', null, null,
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'rights_declaration_request_id', v_declaration_request_id,
      'submission_id', v_submission.submission_id,
      'version_number', v_version.version_number,
      'message', v_message,
      'meaning', 'factual_declaration_only_no_rights_transfer'
    )
  );

  insert into pci.outbox (
    workspace_id,
    job_type,
    entity_type,
    entity_id,
    payload
  ) values (
    p_workspace_id,
    'notify_creator_rights_declaration_request',
    'rights_declaration_request',
    v_declaration_request_id,
    jsonb_build_object(
      'creator_id', v_submission.creator_id,
      'submission_id', v_submission.submission_id,
      'submission_version_id', v_version.submission_version_id,
      'version_number', v_version.version_number,
      'message', v_message
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'rights_declaration_request_id', v_declaration_request_id,
    'submission_id', v_submission.submission_id,
    'submission_version_id', v_version.submission_version_id,
    'version_number', v_version.version_number,
    'message', v_message,
    'submission_status', v_submission.status,
    'rights_clearance_status', v_version.rights_clearance_status
  );

  update pci.command_receipts
  set status = 'completed',
      result_entity_type = 'rights_declaration_request',
      result_entity_id = v_declaration_request_id,
      response_snapshot = v_result,
      completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$function$;

revoke all on function pci_api.admin_request_rights_declaration(uuid, text, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function pci_api.admin_request_rights_declaration(uuid, text, uuid, text, uuid, uuid) to service_role;

create or replace function pci_api.creator_submission_detail(
  p_actor_user_id uuid,
  p_submission_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_creator pci.creators%rowtype;
  v_workspace_id text;
  v_detail jsonb;
  v_requests jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);

  select s.workspace_id into v_workspace_id
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id;

  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'read');
  end if;

  v_detail := pci.creator_submission_detail_core_1o(p_actor_user_id, p_submission_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'rights_declaration_request_id', rdr.rights_declaration_request_id,
      'submission_version_id', rdr.submission_version_id,
      'version_number', sv.version_number,
      'message', rdr.message,
      'created_at', rdr.created_at
    ) order by rdr.created_at desc
  ), '[]'::jsonb)
  into v_requests
  from pci.rights_declaration_requests rdr
  join pci.submission_versions sv
    on sv.submission_version_id = rdr.submission_version_id
  where sv.submission_id = p_submission_id;

  return v_detail || jsonb_build_object(
    'rights_declaration_requests', v_requests
  );
end;
$function$;

revoke all on function pci_api.creator_submission_detail(uuid, uuid) from public, anon, authenticated;
grant execute on function pci_api.creator_submission_detail(uuid, uuid) to service_role;
