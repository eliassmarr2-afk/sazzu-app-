-- PCI 2.1N.3 · Rights declaration request flow
-- Runtime-safe contract:
-- - asks the Creator to complete the factual declaration for the exact submitted version
-- - does NOT transfer rights
-- - does NOT create a creative review / consume a revision round
-- - does NOT change submission status or rights_clearance_status

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

  select sv.*, s.*
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
      'note', 'Factual declaration request only; no rights transfer implied.'
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

create or replace function pci_api.admin_submission_review_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_submission pci.submissions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_version pci.submission_versions%rowtype;
  v_changes_used integer;
  v_remaining integer;
  v_latest_review jsonb;
  v_latest_declaration_request jsonb;
  v_allowed_actions jsonb;
begin
  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select * into v_submission
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.workspace_id = p_workspace_id;

  if v_submission.submission_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_not_found';
  end if;

  select * into v_participation
  from pci.consignment_participations p
  where p.participation_id = v_submission.participation_id;

  if v_participation.participation_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_participation_invalid';
  end if;

  select * into v_revision
  from pci.consignment_revisions r
  where r.consignment_revision_id = v_participation.consignment_revision_id;

  if v_revision.consignment_revision_id is null then
    raise exception using errcode = '23514', message = 'pci_submission_brief_revision_invalid';
  end if;

  if v_submission.current_version_id is not null then
    select * into v_version
    from pci.submission_versions sv
    where sv.submission_version_id = v_submission.current_version_id
      and sv.submission_id = v_submission.submission_id;
  end if;

  select count(*) into v_changes_used
  from pci.submission_reviews sr
  where sr.submission_id = v_submission.submission_id
    and sr.decision = 'changes_requested';

  if v_revision.pre_purchase_revision_limit is null then
    v_remaining := null;
  else
    v_remaining := greatest(v_revision.pre_purchase_revision_limit - v_changes_used, 0);
  end if;

  select jsonb_build_object(
    'review_id', sr.review_id,
    'submission_version_id', sr.submission_version_id,
    'version_number', sv.version_number,
    'decision', sr.decision,
    'rejection_reason_code', sr.rejection_reason_code,
    'internal_summary', sr.internal_summary,
    'creator_feedback', sr.creator_feedback,
    'reviewed_by', sr.reviewed_by,
    'created_at', sr.created_at
  )
  into v_latest_review
  from pci.submission_reviews sr
  join pci.submission_versions sv
    on sv.submission_version_id = sr.submission_version_id
  where sr.submission_id = v_submission.submission_id
  order by sr.created_at desc
  limit 1;

  if v_version.submission_version_id is not null then
    select jsonb_build_object(
      'rights_declaration_request_id', rdr.rights_declaration_request_id,
      'submission_version_id', rdr.submission_version_id,
      'message', rdr.message,
      'requested_by', rdr.requested_by,
      'created_at', rdr.created_at
    )
    into v_latest_declaration_request
    from pci.rights_declaration_requests rdr
    where rdr.submission_version_id = v_version.submission_version_id
    order by rdr.created_at desc
    limit 1;
  end if;

  v_allowed_actions := jsonb_build_object(
    'start_review', v_submission.status = 'submitted'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready',
    'request_changes', v_submission.status = 'under_review'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready'
      and (v_revision.pre_purchase_revision_limit is null or v_changes_used < v_revision.pre_purchase_revision_limit),
    'request_rights_declaration', v_submission.status in ('submitted', 'under_review')
      and v_version.submission_version_id is not null
      and v_version.status = 'ready'
      and v_version.rights_clearance_status = 'pending'
      and coalesce(v_version.rights_declaration, '{}'::jsonb) = '{}'::jsonb
      and v_latest_declaration_request is null,
    'preselect', v_submission.status = 'under_review'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready'
      and v_version.rights_clearance_status = 'complete',
    'reject', v_submission.status = 'under_review'
      and v_version.submission_version_id is not null
      and v_version.status = 'ready',
    'add_internal_note', true
  );

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'submission_id', v_submission.submission_id,
    'submission_status', v_submission.status,
    'current_version', case
      when v_version.submission_version_id is null then null
      else jsonb_build_object(
        'submission_version_id', v_version.submission_version_id,
        'version_number', v_version.version_number,
        'status', v_version.status,
        'rights_clearance_status', v_version.rights_clearance_status,
        'rights_declaration_present', coalesce(v_version.rights_declaration, '{}'::jsonb) <> '{}'::jsonb
      )
    end,
    'brief_revision', jsonb_build_object(
      'consignment_revision_id', v_revision.consignment_revision_id,
      'revision_number', v_revision.revision_number,
      'pre_purchase_revision_limit', v_revision.pre_purchase_revision_limit
    ),
    'revision_policy', jsonb_build_object(
      'changes_requested_used', v_changes_used,
      'changes_requested_remaining', v_remaining,
      'unlimited', v_revision.pre_purchase_revision_limit is null
    ),
    'latest_review', v_latest_review,
    'latest_rights_declaration_request', v_latest_declaration_request,
    'allowed_actions', v_allowed_actions
  );
end;
$function$;

revoke all on function pci_api.admin_submission_review_context(uuid, text, uuid) from public, anon, authenticated;
grant execute on function pci_api.admin_submission_review_context(uuid, text, uuid) to service_role;

create or replace function pci.creator_submission_detail_core_1o(
  p_actor_user_id uuid,
  p_submission_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_creator pci.creators%rowtype;
  v_submission pci.submissions%rowtype;
  v_participation pci.consignment_participations%rowtype;
  v_revision pci.consignment_revisions%rowtype;
  v_versions jsonb;
  v_reviews jsonb;
  v_clearance_reviews jsonb;
  v_declaration_requests jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'rights_declaration_request_id', rdr.rights_declaration_request_id,
      'submission_version_id', rdr.submission_version_id,
      'version_number', sv.version_number,
      'message', rdr.message,
      'created_at', rdr.created_at
    ) order by rdr.created_at desc
  ), '[]'::jsonb)
  into v_declaration_requests
  from pci.rights_declaration_requests rdr
  join pci.submission_versions sv
    on sv.submission_version_id = rdr.submission_version_id
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
    'rights_clearance_reviews', v_clearance_reviews,
    'rights_declaration_requests', v_declaration_requests
  );
end;
$function$;

revoke all on function pci.creator_submission_detail_core_1o(uuid, uuid) from public, anon, authenticated;
grant execute on function pci.creator_submission_detail_core_1o(uuid, uuid) to service_role;
