-- Protocol Creative Insights (PCI)
-- Phase 1J: Creator payment accounts + immutable per-payable confirmation history.
-- Sensitive account identifiers arrive already encrypted by pci-creator-api.
-- Intentionally stored in Git only; not applied to production yet.

create table pci.payable_payment_confirmations (
  confirmation_id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references pci.payables(payable_id) on delete restrict,
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  payment_account_id uuid not null references pci.creator_payment_accounts(payment_account_id) on delete restrict,
  payment_account_snapshot jsonb not null,
  confirmed_by_user_id uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  request_id uuid null,
  command_receipt_id uuid null references pci.command_receipts(command_receipt_id) on delete restrict
);

create index pci_payable_payment_confirmations_payable_idx
  on pci.payable_payment_confirmations (payable_id, confirmed_at desc);
create index pci_payable_payment_confirmations_creator_idx
  on pci.payable_payment_confirmations (creator_id, confirmed_at desc);

alter table pci.payable_payment_confirmations enable row level security;
grant all privileges on pci.payable_payment_confirmations to service_role;

create trigger pci_payable_payment_confirmations_append_only
before update or delete on pci.payable_payment_confirmations
for each row execute function pci.guard_append_only();

create or replace function pci_api.creator_create_payment_account(
  p_actor_user_id uuid,
  p_provider text,
  p_account_type text,
  p_holder_name text,
  p_holder_document_masked text,
  p_alias text,
  p_account_identifier_ciphertext text,
  p_account_identifier_last4 text,
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
  v_provider text;
  v_account_type text;
  v_holder_name text;
  v_alias text;
  v_ciphertext text;
  v_last4 text;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_account_id uuid;
  v_result jsonb;
begin
  if p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_payment_account_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);
  v_provider := lower(btrim(coalesce(p_provider, '')));
  v_account_type := lower(btrim(coalesce(p_account_type, 'transfer')));
  v_holder_name := btrim(coalesce(p_holder_name, ''));
  v_alias := nullif(btrim(coalesce(p_alias, '')), '');
  v_ciphertext := nullif(btrim(coalesce(p_account_identifier_ciphertext, '')), '');
  v_last4 := nullif(btrim(coalesce(p_account_identifier_last4, '')), '');

  if v_provider = '' or length(v_provider) > 80 or v_provider !~ '^[a-z0-9_:-]+$' then
    raise exception using errcode = '22023', message = 'pci_payment_provider_invalid';
  end if;
  if v_account_type = '' or length(v_account_type) > 80 or v_account_type !~ '^[a-z0-9_:-]+$' then
    raise exception using errcode = '22023', message = 'pci_payment_account_type_invalid';
  end if;
  if v_holder_name = '' or length(v_holder_name) > 200 then
    raise exception using errcode = '22023', message = 'pci_payment_holder_name_invalid';
  end if;
  if v_alias is null and v_ciphertext is null then
    raise exception using errcode = '22023', message = 'pci_payment_destination_required';
  end if;
  if v_alias is not null and length(v_alias) > 160 then
    raise exception using errcode = '22023', message = 'pci_payment_alias_invalid';
  end if;
  if v_ciphertext is not null and length(v_ciphertext) > 4096 then
    raise exception using errcode = '22023', message = 'pci_payment_identifier_ciphertext_invalid';
  end if;
  if v_last4 is not null and v_last4 !~ '^[A-Za-z0-9]{1,4}$' then
    raise exception using errcode = '22023', message = 'pci_payment_identifier_last4_invalid';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id,
    'creator_create_payment_account', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_create_payment_account'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;

    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  insert into pci.creator_payment_accounts (
    creator_id, provider, account_type, holder_name,
    holder_document_masked, alias, account_identifier_ciphertext,
    account_identifier_last4, status
  ) values (
    v_creator.creator_id, v_provider, v_account_type, v_holder_name,
    nullif(btrim(coalesce(p_holder_document_masked, '')), ''), v_alias,
    v_ciphertext, v_last4, 'active'
  ) returning payment_account_id into v_account_id;

  perform pci.append_event(
    null,
    'creator', p_actor_user_id, v_creator.creator_id,
    'creator_payment_account', v_account_id,
    'payment_account.created', null, 'active',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'provider', v_provider,
      'account_type', v_account_type,
      'has_alias', v_alias is not null,
      'identifier_last4', v_last4
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'payment_account_id', v_account_id,
    'provider', v_provider,
    'account_type', v_account_type,
    'holder_name', v_holder_name,
    'holder_document_masked', nullif(btrim(coalesce(p_holder_document_masked, '')), ''),
    'alias', v_alias,
    'account_identifier_last4', v_last4,
    'status', 'active'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'creator_payment_account',
      result_entity_id = v_account_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.creator_deactivate_payment_account(
  p_actor_user_id uuid,
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
  v_account pci.creator_payment_accounts%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_payment_account_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_payment_account_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_account
  from pci.creator_payment_accounts a
  where a.payment_account_id = p_payment_account_id
    and a.creator_id = v_creator.creator_id
  for update;

  if v_account.payment_account_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payment_account_not_found';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id,
    'creator_deactivate_payment_account', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_deactivate_payment_account'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  if v_account.status = 'active' then
    update pci.creator_payment_accounts
    set status = 'inactive', deactivated_at = now()
    where payment_account_id = v_account.payment_account_id;

    perform pci.append_event(
      null,
      'creator', p_actor_user_id, v_creator.creator_id,
      'creator_payment_account', v_account.payment_account_id,
      'payment_account.deactivated', 'active', 'inactive',
      p_request_id, v_receipt_id, '{}'::jsonb
    );
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'payment_account_id', v_account.payment_account_id,
    'status', 'inactive'
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'creator_payment_account',
      result_entity_id = v_account.payment_account_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

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
  v_payable pci.payables%rowtype;
  v_purchase pci.purchases%rowtype;
  v_account pci.creator_payment_accounts%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_confirmation_id uuid;
  v_snapshot jsonb;
  v_old_status text;
  v_result jsonb;
begin
  if p_payable_id is null or p_payment_account_id is null
     or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'pci_payable_confirmation_context_required';
  end if;

  v_creator := pci.require_active_creator(p_actor_user_id);

  select * into v_payable
  from pci.payables p
  where p.payable_id = p_payable_id
    and p.creator_id = v_creator.creator_id
  for update;

  if v_payable.payable_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payable_not_found';
  end if;

  if v_payable.concept_type <> 'base_purchase' then
    raise exception using errcode = '23514', message = 'pci_payable_confirmation_not_supported';
  end if;

  if v_payable.status not in ('awaiting_confirmation','ready_to_pay') then
    raise exception using errcode = '23514', message = 'pci_payable_not_confirmable';
  end if;

  select * into v_purchase
  from pci.purchases p
  where p.purchase_id = v_payable.purchase_id
    and p.creator_id = v_creator.creator_id
  for update;

  if v_purchase.purchase_id is null or v_purchase.status <> 'agreed' then
    raise exception using errcode = '23514', message = 'pci_purchase_not_payable';
  end if;

  select * into v_account
  from pci.creator_payment_accounts a
  where a.payment_account_id = p_payment_account_id
    and a.creator_id = v_creator.creator_id
  for update;

  if v_account.payment_account_id is null then
    raise exception using errcode = 'P0002', message = 'pci_payment_account_not_found';
  end if;

  if v_account.status <> 'active' then
    raise exception using errcode = '23514', message = 'pci_payment_account_not_active';
  end if;

  insert into pci.command_receipts (
    idempotency_key, actor_type, actor_user_id, actor_creator_id, workspace_id,
    command_name, request_id, status
  ) values (
    p_idempotency_key, 'creator', p_actor_user_id, v_creator.creator_id, v_payable.workspace_id,
    'creator_confirm_payable_payment_account', p_request_id, 'processing'
  )
  on conflict do nothing
  returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing
    from pci.command_receipts cr
    where cr.actor_type = 'creator'
      and cr.actor_user_id = p_actor_user_id
      and cr.actor_creator_id = v_creator.creator_id
      and cr.command_name = 'creator_confirm_payable_payment_account'
      and cr.idempotency_key = p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then
      raise exception using errcode = '23505', message = 'pci_idempotency_conflict';
    end if;
    if v_existing.status = 'completed' then
      return v_existing.response_snapshot;
    end if;
    raise exception using errcode = '40001', message = 'pci_command_already_processing';
  end if;

  -- This snapshot is the payment destination Protocol must use for this obligation.
  -- It intentionally preserves the encrypted exact identifier while read models expose only masked fields.
  v_snapshot := jsonb_build_object(
    'payment_account_id', v_account.payment_account_id,
    'provider', v_account.provider,
    'account_type', v_account.account_type,
    'holder_name', v_account.holder_name,
    'holder_document_masked', v_account.holder_document_masked,
    'alias', v_account.alias,
    'account_identifier_ciphertext', v_account.account_identifier_ciphertext,
    'account_identifier_last4', v_account.account_identifier_last4,
    'account_created_at', v_account.created_at
  );

  insert into pci.payable_payment_confirmations (
    payable_id, workspace_id, creator_id, payment_account_id,
    payment_account_snapshot, confirmed_by_user_id, confirmed_at,
    request_id, command_receipt_id
  ) values (
    v_payable.payable_id, v_payable.workspace_id, v_creator.creator_id,
    v_account.payment_account_id, v_snapshot, p_actor_user_id, now(),
    p_request_id, v_receipt_id
  ) returning confirmation_id into v_confirmation_id;

  v_old_status := v_payable.status;

  update pci.payables
  set payment_account_id = v_account.payment_account_id,
      payment_account_snapshot = v_snapshot,
      payment_account_confirmed_at = now(),
      status = 'ready_to_pay'
  where payable_id = v_payable.payable_id;

  perform pci.append_event(
    v_payable.workspace_id,
    'creator', p_actor_user_id, v_creator.creator_id,
    'payable', v_payable.payable_id,
    'payable.payment_destination_confirmed', v_old_status, 'ready_to_pay',
    p_request_id, v_receipt_id,
    jsonb_build_object(
      'confirmation_id', v_confirmation_id,
      'payment_account_id', v_account.payment_account_id,
      'provider', v_account.provider,
      'account_type', v_account.account_type,
      'identifier_last4', v_account.account_identifier_last4
    )
  );

  insert into pci.outbox (
    workspace_id, job_type, entity_type, entity_id, payload
  ) values (
    v_payable.workspace_id,
    'notify_protocol_payable_ready',
    'payable', v_payable.payable_id,
    jsonb_build_object(
      'creator_id', v_creator.creator_id,
      'purchase_id', v_purchase.purchase_id,
      'confirmation_id', v_confirmation_id,
      'amount_due', v_payable.amount_due,
      'currency', v_payable.currency
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'confirmation_id', v_confirmation_id,
    'payable_id', v_payable.payable_id,
    'purchase_id', v_purchase.purchase_id,
    'status', 'ready_to_pay',
    'payment_account', jsonb_build_object(
      'payment_account_id', v_account.payment_account_id,
      'provider', v_account.provider,
      'account_type', v_account.account_type,
      'holder_name', v_account.holder_name,
      'holder_document_masked', v_account.holder_document_masked,
      'alias', v_account.alias,
      'account_identifier_last4', v_account.account_identifier_last4
    ),
    'amount_due', v_payable.amount_due,
    'currency', v_payable.currency
  );

  update pci.command_receipts
  set status = 'completed', result_entity_type = 'payable_payment_confirmation',
      result_entity_id = v_confirmation_id, response_snapshot = v_result, completed_at = now()
  where command_receipt_id = v_receipt_id;

  return v_result;
end;
$$;

create or replace function pci_api.creator_payment_accounts(
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'payment_account_id', a.payment_account_id,
      'provider', a.provider,
      'account_type', a.account_type,
      'holder_name', a.holder_name,
      'holder_document_masked', a.holder_document_masked,
      'alias', a.alias,
      'account_identifier_last4', a.account_identifier_last4,
      'status', a.status,
      'created_at', a.created_at,
      'deactivated_at', a.deactivated_at
    ) order by a.created_at desc
  ), '[]'::jsonb)
  into v_items
  from pci.creator_payment_accounts a
  where a.creator_id = v_creator.creator_id;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

create or replace function pci_api.creator_payables(
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
      'payable_id', p.payable_id,
      'purchase_id', p.purchase_id,
      'concept_type', p.concept_type,
      'currency', p.currency,
      'amount_due', p.amount_due,
      'status', p.status,
      'payment_account_confirmed_at', p.payment_account_confirmed_at,
      'payment_account', case when p.payment_account_id is null then null else jsonb_build_object(
        'payment_account_id', p.payment_account_id,
        'provider', p.payment_account_snapshot->>'provider',
        'account_type', p.payment_account_snapshot->>'account_type',
        'holder_name', p.payment_account_snapshot->>'holder_name',
        'holder_document_masked', p.payment_account_snapshot->>'holder_document_masked',
        'alias', p.payment_account_snapshot->>'alias',
        'account_identifier_last4', p.payment_account_snapshot->>'account_identifier_last4'
      ) end,
      'due_at', p.due_at,
      'paid_at', p.paid_at,
      'created_at', p.created_at
    ) as item
    from pci.payables p
    where p.creator_id = v_creator.creator_id
  ) q;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

revoke all on function pci_api.creator_create_payment_account(uuid,text,text,text,text,text,text,text,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_deactivate_payment_account(uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_confirm_payable_payment_account(uuid,uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_payment_accounts(uuid) from public, anon, authenticated;
revoke all on function pci_api.creator_payables(uuid) from public, anon, authenticated;

grant execute on function pci_api.creator_create_payment_account(uuid,text,text,text,text,text,text,text,uuid,uuid) to service_role;
grant execute on function pci_api.creator_deactivate_payment_account(uuid,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.creator_confirm_payable_payment_account(uuid,uuid,uuid,uuid,uuid) to service_role;
grant execute on function pci_api.creator_payment_accounts(uuid) to service_role;
grant execute on function pci_api.creator_payables(uuid) to service_role;

comment on table pci.payable_payment_confirmations is
  'Append-only confirmation history. Each row freezes the exact payment destination selected by the Creator for one obligation.';
