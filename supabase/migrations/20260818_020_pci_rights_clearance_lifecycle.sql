-- Protocol Creative Insights (PCI)
-- Phase 1I prerequisite: keep creative bytes immutable while allowing rights clearance to evolve.
-- Intentionally stored in Git only; not applied to production yet.

create table pci.rights_clearance_reviews (
  rights_clearance_review_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  submission_version_id uuid not null references pci.submission_versions(submission_version_id) on delete restrict,
  clearance_status text not null check (clearance_status in ('complete','flagged')),
  reason text null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (clearance_status <> 'flagged' or nullif(btrim(coalesce(reason, '')), '') is not null)
);

create index pci_rights_clearance_reviews_version_idx
  on pci.rights_clearance_reviews (submission_version_id, created_at desc);

alter table pci.rights_clearance_reviews enable row level security;
grant all privileges on table pci.rights_clearance_reviews to service_role;

create trigger pci_rights_clearance_reviews_append_only
before update or delete on pci.rights_clearance_reviews
for each row execute function pci.guard_append_only();

-- Replace the overly broad ready-version guard. Byte-identifying fields remain immutable;
-- only rights_declaration and rights_clearance_status may evolve after media finalization.
create or replace function pci.guard_submission_version_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'ready' then
    if new.submission_version_id is distinct from old.submission_version_id
       or new.submission_id is distinct from old.submission_id
       or new.version_number is distinct from old.version_number
       or new.status is distinct from old.status
       or new.storage_bucket is distinct from old.storage_bucket
       or new.storage_path is distinct from old.storage_path
       or new.original_filename is distinct from old.original_filename
       or new.mime_type is distinct from old.mime_type
       or new.file_size_bytes is distinct from old.file_size_bytes
       or new.duration_seconds is distinct from old.duration_seconds
       or new.width is distinct from old.width
       or new.height is distinct from old.height
       or new.sha256 is distinct from old.sha256
       or new.technical_validation is distinct from old.technical_validation
       or new.uploaded_at is distinct from old.uploaded_at
       or new.finalized_at is distinct from old.finalized_at
       or new.invalid_reason is distinct from old.invalid_reason
       or new.created_at is distinct from old.created_at
    then
      raise exception using errcode = '23514', message = 'pci_ready_submission_version_bytes_immutable';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_submission_version_immutability() from public, anon, authenticated;
grant execute on function pci.guard_submission_version_immutability() to service_role;

create or replace function pci_api.creator_submit_rights_declaration(
  p_actor_user_id uuid,
  p_submission_version_id uuid,
  p_declaration jsonb,
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
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_version_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_context_required';
  end if;
  if p_declaration is null or jsonb_typeof(p_declaration) <> 'object' or p_declaration = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
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
  if v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_ready';
  end if;

  select * into v_submission
  from pci.submissions s
  where s.submission_id = v_version.submission_id;

  if exists (
    select 1 from pci.rights_grants rg
    where rg.submission_version_id = v_version.submission_version_id
      and rg.status in ('active','suspended','expired','revoked')
  ) then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_locked_after_grant';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_submission.workspace_id,
    'creator_submit_rights_declaration', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_submit_rights_declaration'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  update pci.submission_versions
  set rights_declaration = p_declaration,
      rights_clearance_status = 'pending'
  where submission_version_id = v_version.submission_version_id;

  perform pci.append_event(
    v_submission.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'submission_version', v_version.submission_version_id,
    'rights.declaration_submitted', v_version.rights_clearance_status, 'pending',
    p_request_id, v_receipt_id,
    jsonb_build_object('submission_id', v_submission.submission_id)
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_submission.workspace_id,
    'notify_protocol_rights_declaration',
    'submission_version', v_version.submission_version_id,
    jsonb_build_object('creator_id', v_creator.creator_id, 'submission_id', v_submission.submission_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'submission_version_id', v_version.submission_version_id,
    'rights_clearance_status', 'pending'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'submission_version',
      result_entity_id = v_version.submission_version_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.admin_set_rights_clearance(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_submission_version_id uuid,
  p_clearance_status text,
  p_reason text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_status text := lower(btrim(coalesce(p_clearance_status, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_review_id uuid;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_submission_version_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_rights_clearance_context_required';
  end if;
  if v_status not in ('complete','flagged') then
    raise exception using errcode = '22023', message = 'pci_rights_clearance_status_invalid';
  end if;
  if v_status = 'flagged' and v_reason is null then
    raise exception using errcode = '22023', message = 'pci_rights_clearance_reason_required';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id, p_workspace_id);

  select sv.* into v_version
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.workspace_id = p_workspace_id
  for update of sv;

  if v_version.submission_version_id is null then
    raise exception using errcode = 'P0002', message = 'pci_submission_version_not_found';
  end if;
  if v_version.status <> 'ready' then
    raise exception using errcode = '23514', message = 'pci_submission_version_not_ready';
  end if;
  if coalesce(v_version.rights_declaration, '{}'::jsonb) = '{}'::jsonb then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_required';
  end if;

  select * into v_submission from pci.submissions s where s.submission_id = v_version.submission_id;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'operator', p_actor_user_id, p_workspace_id,
    'admin_set_rights_clearance', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'operator'
      and cr.actor_user_id = p_actor_user_id
      and cr.command_name = 'admin_set_rights_clearance'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  insert into pci.rights_clearance_reviews (
    workspace_id, submission_version_id, clearance_status, reason, reviewed_by
  ) values (
    p_workspace_id, v_version.submission_version_id, v_status, v_reason, p_actor_user_id
  ) returning rights_clearance_review_id into v_review_id;

  update pci.submission_versions
  set rights_clearance_status = v_status
  where submission_version_id = v_version.submission_version_id;

  perform pci.append_event(
    p_workspace_id,
    'operator', p_actor_user_id, null,
    'submission_version', v_version.submission_version_id,
    'rights.clearance_reviewed', v_version.rights_clearance_status, v_status,
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'rights_clearance_review_id', v_review_id,
      'submission_id', v_submission.submission_id,
      'reason', v_reason
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    p_workspace_id,
    'notify_creator_rights_clearance',
    'rights_clearance_review', v_review_id,
    jsonb_build_object(
      'creator_id', v_submission.creator_id,
      'submission_version_id', v_version.submission_version_id,
      'clearance_status', v_status
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'rights_clearance_review_id', v_review_id,
    'submission_version_id', v_version.submission_version_id,
    'rights_clearance_status', v_status,
    'reason', v_reason
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'rights_clearance_review',
      result_entity_id = v_review_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

revoke all on function pci_api.creator_submit_rights_declaration(uuid,uuid,jsonb,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.admin_set_rights_clearance(uuid,text,uuid,text,text,uuid,uuid) from public, anon, authenticated;

grant execute on function pci_api.creator_submit_rights_declaration(uuid,uuid,jsonb,uuid,uuid) to service_role;
grant execute on function pci_api.admin_set_rights_clearance(uuid,text,uuid,text,text,uuid,uuid) to service_role;

comment on table pci.rights_clearance_reviews is
  'Append-only Protocol review history for creator rights declarations on an exact immutable creative version.';
comment on function pci.guard_submission_version_immutability() is
  'Ready creative bytes are immutable; only rights declaration/clearance metadata may evolve before/around commercial rights processing.';