-- Protocol Creative Insights (PCI)
-- Phase 1O runtime hardening: workspace relationship authorization for Creator RPCs.
--
-- Global Creator status is not sufficient authorization for workspace-scoped resources.
-- A Creator may be active globally because of workspace A while being invited,
-- restricted, suspended or closed in workspace B.
--
-- Read rule:  workspace_creators.status in ('active','restricted').
-- Write rule: workspace_creators.status = 'active'.
--
-- Existing mature implementations are moved out of the PostgREST-exposed pci_api
-- schema into private pci as *_core_1o functions. Public pci_api names become thin
-- authorization wrappers, preserving the existing commercial behavior and response
-- shapes while adding the missing relationship gate.
--
-- Intentionally applied only to the disposable Phase 1O runtime for validation.
-- Production remains untouched.

create or replace function pci.require_creator_workspace_access(
  p_creator_id uuid,
  p_workspace_id text,
  p_mode text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_mode text := lower(btrim(coalesce(p_mode, '')));
begin
  if p_creator_id is null or p_workspace_id is null or v_mode not in ('read','write') then
    raise exception using errcode = '42501', message = 'pci_creator_workspace_access_denied';
  end if;

  select wc.status
  into v_status
  from pci.workspace_creators wc
  where wc.creator_id = p_creator_id
    and wc.workspace_id = p_workspace_id
  limit 1;

  if v_mode = 'read' then
    if v_status is null or v_status not in ('active','restricted') then
      raise exception using errcode = '42501', message = 'pci_creator_workspace_access_denied';
    end if;
  elsif v_status is distinct from 'active' then
    raise exception using errcode = '42501', message = 'pci_creator_workspace_access_denied';
  end if;
end;
$$;

revoke all on function pci.require_creator_workspace_access(uuid,text,text)
  from public, anon, authenticated;
grant execute on function pci.require_creator_workspace_access(uuid,text,text)
  to service_role;

comment on function pci.require_creator_workspace_access(uuid,text,text) is
  'Workspace-specific Creator authorization. read allows active/restricted; write requires active. Global Creator status alone never authorizes a workspace resource.';

-- Move the previously exposed service-role implementations into the private schema.
alter function pci_api.creator_acquired_assets(uuid) set schema pci;
alter function pci.creator_acquired_assets(uuid) rename to creator_acquired_assets_core_1o;

alter function pci_api.creator_confirm_payable_payment_account(uuid,uuid,uuid,uuid,uuid) set schema pci;
alter function pci.creator_confirm_payable_payment_account(uuid,uuid,uuid,uuid,uuid) rename to creator_confirm_payable_payment_account_core_1o;

alter function pci_api.creator_counter_offer(uuid,uuid,numeric,text,uuid,uuid) set schema pci;
alter function pci.creator_counter_offer(uuid,uuid,numeric,text,uuid,uuid) rename to creator_counter_offer_core_1o;

alter function pci_api.creator_negotiation_detail(uuid,uuid) set schema pci;
alter function pci.creator_negotiation_detail(uuid,uuid) rename to creator_negotiation_detail_core_1o;

alter function pci_api.creator_negotiations(uuid) set schema pci;
alter function pci.creator_negotiations(uuid) rename to creator_negotiations_core_1o;

alter function pci_api.creator_payables(uuid) set schema pci;
alter function pci.creator_payables(uuid) rename to creator_payables_core_1o;

alter function pci_api.creator_payout_proof_context(uuid,uuid) set schema pci;
alter function pci.creator_payout_proof_context(uuid,uuid) rename to creator_payout_proof_context_core_1o;

alter function pci_api.creator_payouts(uuid) set schema pci;
alter function pci.creator_payouts(uuid) rename to creator_payouts_core_1o;

alter function pci_api.creator_purchases(uuid) set schema pci;
alter function pci.creator_purchases(uuid) rename to creator_purchases_core_1o;

alter function pci_api.creator_reject_offer(uuid,uuid,uuid,uuid) set schema pci;
alter function pci.creator_reject_offer(uuid,uuid,uuid,uuid) rename to creator_reject_offer_core_1o;

alter function pci_api.creator_send_negotiation_message(uuid,uuid,text,uuid,uuid) set schema pci;
alter function pci.creator_send_negotiation_message(uuid,uuid,text,uuid,uuid) rename to creator_send_negotiation_message_core_1o;

alter function pci_api.creator_submission_detail(uuid,uuid) set schema pci;
alter function pci.creator_submission_detail(uuid,uuid) rename to creator_submission_detail_core_1o;

alter function pci_api.creator_submission_review_history(uuid,uuid) set schema pci;
alter function pci.creator_submission_review_history(uuid,uuid) rename to creator_submission_review_history_core_1o;

alter function pci_api.creator_submissions(uuid) set schema pci;
alter function pci.creator_submissions(uuid) rename to creator_submissions_core_1o;

alter function pci_api.creator_submit_rights_declaration(uuid,uuid,jsonb,uuid,uuid) set schema pci;
alter function pci.creator_submit_rights_declaration(uuid,uuid,jsonb,uuid,uuid) rename to creator_submit_rights_declaration_core_1o;

alter function pci_api.creator_version_upload_context(uuid,uuid) set schema pci;
alter function pci.creator_version_upload_context(uuid,uuid) rename to creator_version_upload_context_core_1o;

alter function pci_api.create_submission(uuid,uuid,uuid,uuid,text,jsonb) set schema pci;
alter function pci.create_submission(uuid,uuid,uuid,uuid,text,jsonb) rename to create_submission_core_1o;

alter function pci_api.reserve_submission_version(uuid,uuid,uuid,uuid,text,text) set schema pci;
alter function pci.reserve_submission_version(uuid,uuid,uuid,uuid,text,text) rename to reserve_submission_version_core_1o;

alter function pci_api.finalize_submission_version(uuid,uuid,uuid,uuid,bigint,text,text,numeric,integer,integer,jsonb) set schema pci;
alter function pci.finalize_submission_version(uuid,uuid,uuid,uuid,bigint,text,text,numeric,integer,integer,jsonb) rename to finalize_submission_version_core_1o;

alter function pci_api.invalidate_submission_version(uuid,uuid,uuid,uuid,text,jsonb) set schema pci;
alter function pci.invalidate_submission_version(uuid,uuid,uuid,uuid,text,jsonb) rename to invalidate_submission_version_core_1o;

-- Read-list wrappers -------------------------------------------------------

create or replace function pci_api.creator_acquired_assets(p_actor_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  v_result := pci.creator_acquired_assets_core_1o(p_actor_user_id);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(v_result->'items','[]'::jsonb)) with ordinality as x(item,ord)
  where exists (
    select 1
    from pci.creative_assets ca
    join pci.workspace_creators wc
      on wc.workspace_id = ca.workspace_id
     and wc.creator_id = ca.creator_id
    where ca.creative_asset_id = (x.item->>'creative_asset_id')::uuid
      and ca.creator_id = v_creator.creator_id
      and wc.status in ('active','restricted')
  );

  return v_result || jsonb_build_object('items', v_items);
end;
$$;

create or replace function pci_api.creator_negotiations(p_actor_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  v_result := pci.creator_negotiations_core_1o(p_actor_user_id);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(v_result->'items','[]'::jsonb)) with ordinality as x(item,ord)
  where exists (
    select 1 from pci.workspace_creators wc
    where wc.creator_id = v_creator.creator_id
      and wc.workspace_id = x.item->>'workspace_id'
      and wc.status in ('active','restricted')
  );

  return v_result || jsonb_build_object('items', v_items);
end;
$$;

create or replace function pci_api.creator_payables(p_actor_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  v_result := pci.creator_payables_core_1o(p_actor_user_id);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(v_result->'items','[]'::jsonb)) with ordinality as x(item,ord)
  where exists (
    select 1
    from pci.payables py
    join pci.workspace_creators wc
      on wc.workspace_id = py.workspace_id
     and wc.creator_id = py.creator_id
    where py.payable_id = (x.item->>'payable_id')::uuid
      and py.creator_id = v_creator.creator_id
      and wc.status in ('active','restricted')
  );

  return v_result || jsonb_build_object('items', v_items);
end;
$$;

create or replace function pci_api.creator_payouts(p_actor_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  v_result := pci.creator_payouts_core_1o(p_actor_user_id);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(v_result->'items','[]'::jsonb)) with ordinality as x(item,ord)
  where exists (
    select 1
    from pci.payouts po
    join pci.workspace_creators wc
      on wc.workspace_id = po.workspace_id
     and wc.creator_id = po.creator_id
    where po.payout_id = (x.item->>'payout_id')::uuid
      and po.creator_id = v_creator.creator_id
      and wc.status in ('active','restricted')
  );

  return v_result || jsonb_build_object('items', v_items);
end;
$$;

create or replace function pci_api.creator_purchases(p_actor_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  v_result := pci.creator_purchases_core_1o(p_actor_user_id);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(v_result->'items','[]'::jsonb)) with ordinality as x(item,ord)
  where exists (
    select 1
    from pci.purchases p
    join pci.workspace_creators wc
      on wc.workspace_id = p.workspace_id
     and wc.creator_id = p.creator_id
    where p.purchase_id = (x.item->>'purchase_id')::uuid
      and p.creator_id = v_creator.creator_id
      and wc.status in ('active','restricted')
  );

  return v_result || jsonb_build_object('items', v_items);
end;
$$;

create or replace function pci_api.creator_submissions(p_actor_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  v_result := pci.creator_submissions_core_1o(p_actor_user_id);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(v_result->'items','[]'::jsonb)) with ordinality as x(item,ord)
  where exists (
    select 1 from pci.workspace_creators wc
    where wc.creator_id = v_creator.creator_id
      and wc.workspace_id = x.item->>'workspace_id'
      and wc.status in ('active','restricted')
  );

  return v_result || jsonb_build_object('items', v_items);
end;
$$;

-- Read-detail wrappers -----------------------------------------------------

create or replace function pci_api.creator_negotiation_detail(
  p_actor_user_id uuid,
  p_negotiation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select n.workspace_id into v_workspace_id
  from pci.negotiations n
  where n.negotiation_id = p_negotiation_id
    and n.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'read');
  end if;
  return pci.creator_negotiation_detail_core_1o(p_actor_user_id, p_negotiation_id);
end;
$$;

create or replace function pci_api.creator_payout_proof_context(
  p_actor_user_id uuid,
  p_payout_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select po.workspace_id into v_workspace_id
  from pci.payouts po
  where po.payout_id = p_payout_id
    and po.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'read');
  end if;
  return pci.creator_payout_proof_context_core_1o(p_actor_user_id, p_payout_id);
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'read');
  end if;
  return pci.creator_submission_detail_core_1o(p_actor_user_id, p_submission_id);
end;
$$;

create or replace function pci_api.creator_submission_review_history(
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'read');
  end if;
  return pci.creator_submission_review_history_core_1o(p_actor_user_id, p_submission_id);
end;
$$;

-- Write wrappers -----------------------------------------------------------

create or replace function pci_api.creator_confirm_payable_payment_account(
  p_actor_user_id uuid,
  p_payable_id uuid,
  p_payment_account_id uuid,
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select py.workspace_id into v_workspace_id
  from pci.payables py
  where py.payable_id = p_payable_id
    and py.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.creator_confirm_payable_payment_account_core_1o(
    p_actor_user_id,p_payable_id,p_payment_account_id,p_idempotency_key,p_request_id
  );
end;
$$;

create or replace function pci_api.creator_counter_offer(
  p_actor_user_id uuid,
  p_parent_offer_id uuid,
  p_total_amount numeric,
  p_counter_note text,
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select po.workspace_id into v_workspace_id
  from pci.purchase_offers po
  where po.offer_id = p_parent_offer_id
    and po.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.creator_counter_offer_core_1o(
    p_actor_user_id,p_parent_offer_id,p_total_amount,p_counter_note,p_idempotency_key,p_request_id
  );
end;
$$;

create or replace function pci_api.creator_reject_offer(
  p_actor_user_id uuid,
  p_offer_id uuid,
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select po.workspace_id into v_workspace_id
  from pci.purchase_offers po
  where po.offer_id = p_offer_id
    and po.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.creator_reject_offer_core_1o(
    p_actor_user_id,p_offer_id,p_idempotency_key,p_request_id
  );
end;
$$;

create or replace function pci_api.creator_send_negotiation_message(
  p_actor_user_id uuid,
  p_negotiation_id uuid,
  p_body text,
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select n.workspace_id into v_workspace_id
  from pci.negotiations n
  where n.negotiation_id = p_negotiation_id
    and n.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.creator_send_negotiation_message_core_1o(
    p_actor_user_id,p_negotiation_id,p_body,p_idempotency_key,p_request_id
  );
end;
$$;

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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.creator_submit_rights_declaration_core_1o(
    p_actor_user_id,p_submission_version_id,p_declaration,p_idempotency_key,p_request_id
  );
end;
$$;

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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.creator_version_upload_context_core_1o(p_actor_user_id,p_submission_version_id);
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select c.workspace_id into v_workspace_id
  from pci.consignments c
  where c.consignment_id = p_consignment_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.create_submission_core_1o(
    p_actor_user_id,p_consignment_id,p_idempotency_key,p_request_id,p_concept_label,p_concept_metadata
  );
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submissions s
  where s.submission_id = p_submission_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.reserve_submission_version_core_1o(
    p_actor_user_id,p_submission_id,p_idempotency_key,p_request_id,p_original_filename,p_mime_type
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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.finalize_submission_version_core_1o(
    p_actor_user_id,p_submission_version_id,p_idempotency_key,p_request_id,
    p_file_size_bytes,p_mime_type,p_sha256,p_duration_seconds,p_width,p_height,p_storage_validation
  );
end;
$$;

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
  v_workspace_id text;
begin
  v_creator := pci.require_active_creator(p_actor_user_id);
  select s.workspace_id into v_workspace_id
  from pci.submission_versions sv
  join pci.submissions s on s.submission_id = sv.submission_id
  where sv.submission_version_id = p_submission_version_id
    and s.creator_id = v_creator.creator_id;
  if v_workspace_id is not null then
    perform pci.require_creator_workspace_access(v_creator.creator_id, v_workspace_id, 'write');
  end if;
  return pci.invalidate_submission_version_core_1o(
    p_actor_user_id,p_submission_version_id,p_idempotency_key,p_request_id,p_reason_code,p_validation_metadata
  );
end;
$$;

-- Preserve the service-role-only API surface. The private core functions remain
-- inaccessible to anon/authenticated and are not in a PostgREST-exposed schema.
revoke all on all functions in schema pci_api from public, anon, authenticated;
grant execute on all functions in schema pci_api to service_role;

notify pgrst, 'reload schema';
