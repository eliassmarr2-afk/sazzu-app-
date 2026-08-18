-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Negotiation, messaging and formal offers
--
-- Chat is contextual only. Formal commercial terms live in immutable offers
-- tied to exact submission versions.
-- ============================================================================

begin;

-- One durable negotiation room per submission. It can close and reopen while
-- preserving the same message/offer history.
create unique index pci_negotiations_submission_uq
  on pci.negotiations (submission_id);

create table pci.negotiation_messages (
  negotiation_message_id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references pci.negotiations(negotiation_id) on delete restrict,
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,

  sender_type text not null check (sender_type in ('operator', 'creator')),
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  message_body text not null check (char_length(btrim(message_body)) between 1 and 10000),

  created_at timestamptz not null default now(),

  constraint pci_negotiation_messages_context_fk
    foreign key (negotiation_id, workspace_id, creator_id)
    references pci.negotiations(negotiation_id, workspace_id, creator_id)
    on delete restrict
);

-- Required for the composite contextual FK above.
alter table pci.negotiations
  add constraint pci_negotiations_context_uq
  unique (negotiation_id, workspace_id, creator_id);

create index pci_negotiation_messages_history_idx
  on pci.negotiation_messages (negotiation_id, created_at, negotiation_message_id);

alter table pci.negotiation_messages enable row level security;
revoke all on table pci.negotiation_messages from public, anon, authenticated;
grant select, insert on table pci.negotiation_messages to service_role;

create trigger trg_pci_negotiation_messages_immutable
before update or delete on pci.negotiation_messages
for each row execute function pci.reject_review_mutation();

create table pci.negotiation_message_attachments (
  attachment_id uuid primary key default gen_random_uuid(),
  negotiation_message_id uuid not null
    references pci.negotiation_messages(negotiation_message_id) on delete restrict,
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,

  storage_bucket text not null default 'pci-message-attachments',
  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  sha256 text,

  created_at timestamptz not null default now(),

  constraint pci_negotiation_attachment_storage_uq unique (storage_bucket, storage_path)
);

create index pci_negotiation_message_attachments_message_idx
  on pci.negotiation_message_attachments (negotiation_message_id, created_at);

alter table pci.negotiation_message_attachments enable row level security;
revoke all on table pci.negotiation_message_attachments from public, anon, authenticated;
grant select, insert on table pci.negotiation_message_attachments to service_role;

create trigger trg_pci_negotiation_message_attachments_immutable
before update or delete on pci.negotiation_message_attachments
for each row execute function pci.reject_review_mutation();

create table pci.purchase_offers (
  purchase_offer_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  creator_id uuid not null references pci.creators(creator_id) on delete restrict,
  negotiation_id uuid not null,

  proposer_type text not null check (proposer_type in ('operator', 'creator')),
  proposer_user_id uuid not null references auth.users(id) on delete restrict,

  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'superseded', 'withdrawn', 'expired')),

  supersedes_offer_id uuid references pci.purchase_offers(purchase_offer_id) on delete restrict,

  currency text not null check (char_length(currency) = 3),
  total_amount numeric(14,2) not null check (total_amount >= 0),

  rights_package_snapshot jsonb not null default '{}'::jsonb,
  payment_terms jsonb not null default '{}'::jsonb,
  performance_bonus_terms jsonb not null default '{}'::jsonb,
  commercial_terms jsonb not null default '{}'::jsonb,

  expires_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  expired_at timestamptz,
  superseded_at timestamptz,
  status_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pci_purchase_offers_negotiation_fk
    foreign key (negotiation_id, workspace_id, creator_id)
    references pci.negotiations(negotiation_id, workspace_id, creator_id)
    on delete restrict,
  constraint pci_purchase_offers_identity_uq
    unique (purchase_offer_id, workspace_id, creator_id)
);

create index pci_purchase_offers_negotiation_history_idx
  on pci.purchase_offers (negotiation_id, created_at, purchase_offer_id);
create index pci_purchase_offers_creator_pending_idx
  on pci.purchase_offers (creator_id, status, expires_at)
  where status = 'sent';
create index pci_purchase_offers_workspace_status_idx
  on pci.purchase_offers (workspace_id, status, created_at desc);

create trigger trg_pci_purchase_offers_touch
before update on pci.purchase_offers
for each row execute function pci.touch_updated_at();

alter table pci.purchase_offers enable row level security;
revoke all on table pci.purchase_offers from public, anon, authenticated;
grant select, insert, update on table pci.purchase_offers to service_role;

create table pci.purchase_offer_items (
  purchase_offer_item_id uuid primary key default gen_random_uuid(),
  purchase_offer_id uuid not null,
  workspace_id text not null,
  creator_id uuid not null,
  submission_id uuid not null,
  submission_version_id uuid not null,

  amount numeric(14,2) not null check (amount >= 0),
  item_terms jsonb not null default '{}'::jsonb,
  version_sha256_snapshot text not null,
  created_at timestamptz not null default now(),

  constraint pci_purchase_offer_items_offer_fk
    foreign key (purchase_offer_id, workspace_id, creator_id)
    references pci.purchase_offers(purchase_offer_id, workspace_id, creator_id)
    on delete restrict,
  constraint pci_purchase_offer_items_submission_fk
    foreign key (submission_id, creator_id)
    references pci.submissions(submission_id, creator_id)
    on delete restrict,
  constraint pci_purchase_offer_items_version_fk
    foreign key (submission_id, submission_version_id)
    references pci.submission_versions(submission_id, submission_version_id)
    on delete restrict,
  constraint pci_purchase_offer_items_version_uq
    unique (purchase_offer_id, submission_version_id)
);

create index pci_purchase_offer_items_offer_idx
  on pci.purchase_offer_items (purchase_offer_id, created_at);
create index pci_purchase_offer_items_version_idx
  on pci.purchase_offer_items (submission_version_id);

alter table pci.purchase_offer_items enable row level security;
revoke all on table pci.purchase_offer_items from public, anon, authenticated;
grant select, insert on table pci.purchase_offer_items to service_role;

-- --------------------------------------------------------------------------
-- Sent commercial terms and offer items are immutable. Only lifecycle status,
-- timestamps and reason fields may change afterward.
-- --------------------------------------------------------------------------

create or replace function pci.guard_sent_purchase_offer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    if new.workspace_id is distinct from old.workspace_id
      or new.creator_id is distinct from old.creator_id
      or new.negotiation_id is distinct from old.negotiation_id
      or new.proposer_type is distinct from old.proposer_type
      or new.proposer_user_id is distinct from old.proposer_user_id
      or new.supersedes_offer_id is distinct from old.supersedes_offer_id
      or new.currency is distinct from old.currency
      or new.total_amount is distinct from old.total_amount
      or new.rights_package_snapshot is distinct from old.rights_package_snapshot
      or new.payment_terms is distinct from old.payment_terms
      or new.performance_bonus_terms is distinct from old.performance_bonus_terms
      or new.commercial_terms is distinct from old.commercial_terms
      or new.expires_at is distinct from old.expires_at then
      raise exception using errcode = 'P0001', message = 'sent_purchase_offer_is_immutable';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_pci_purchase_offer_immutable
before update on pci.purchase_offers
for each row execute function pci.guard_sent_purchase_offer();

create or replace function pci.guard_purchase_offer_item_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_offer_status text;
begin
  select o.status into v_offer_status
  from pci.purchase_offers o
  where o.purchase_offer_id = coalesce(new.purchase_offer_id, old.purchase_offer_id);

  if tg_op = 'DELETE' and v_offer_status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'sent_purchase_offer_items_are_immutable';
  end if;

  if tg_op = 'UPDATE' and v_offer_status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'sent_purchase_offer_items_are_immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_pci_purchase_offer_items_immutable
before update or delete on pci.purchase_offer_items
for each row execute function pci.guard_purchase_offer_item_mutation();

-- --------------------------------------------------------------------------
-- Negotiation commands.
-- --------------------------------------------------------------------------

create or replace function pci_api.admin_open_negotiation(
  p_actor_user_id uuid,
  p_workspace_id text,
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
  v_submission pci.submissions%rowtype;
  v_negotiation pci.negotiations%rowtype;
  v_receipt pci.command_receipts%rowtype;
  v_previous text;
  v_result jsonb;
begin
  perform pci.require_operator(p_actor_user_id, p_workspace_id, true);
  perform pci.lock_command_key('operator:' || p_actor_user_id::text || ':admin_open_negotiation', p_idempotency_key);

  select r.* into v_receipt from pci.command_receipts r
  where r.actor_type='operator' and r.actor_user_id=p_actor_user_id
    and r.command_name='admin_open_negotiation' and r.idempotency_key=p_idempotency_key limit 1;
  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode='P0001', message='idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status='succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode='P0001', message='idempotent_command_not_replayable';
  end if;

  select s.* into v_submission from pci.submissions s
  where s.workspace_id=p_workspace_id and s.submission_id=p_submission_id for update;
  if v_submission.submission_id is null then
    raise exception using errcode='P0001', message='submission_not_found';
  end if;
  if v_submission.status <> 'preselected' then
    raise exception using errcode='P0001', message='submission_not_preselected';
  end if;

  insert into pci.command_receipts (
    idempotency_key,request_id,actor_type,actor_user_id,workspace_id,command_name,request_hash,status
  ) values (
    p_idempotency_key,p_request_id,'operator',p_actor_user_id,p_workspace_id,
    'admin_open_negotiation',p_request_hash,'processing'
  );

  select n.* into v_negotiation from pci.negotiations n
  where n.submission_id=p_submission_id for update;

  if v_negotiation.negotiation_id is null then
    insert into pci.negotiations (
      workspace_id,creator_id,submission_id,status,opened_by_user_id,opened_at
    ) values (
      p_workspace_id,v_submission.creator_id,p_submission_id,'open',p_actor_user_id,now()
    ) returning * into v_negotiation;
    v_previous := null;
  elsif v_negotiation.status='closed' then
    update pci.negotiations
    set status='open', close_reason=null, reopened_at=now()
    where negotiation_id=v_negotiation.negotiation_id
    returning * into v_negotiation;
    v_previous := 'closed';
  else
    v_previous := 'open';
  end if;

  perform pci.append_event(
    p_request_id,p_workspace_id,'operator',p_actor_user_id,null,
    'negotiation',v_negotiation.negotiation_id,
    case when v_previous='closed' then 'negotiation.reopened' else 'negotiation.opened' end,
    v_previous,'open',null,jsonb_build_object('submission_id',p_submission_id)
  );

  v_result := jsonb_build_object(
    'ok',true,'negotiation_id',v_negotiation.negotiation_id,
    'submission_id',p_submission_id,'status','open'
  );

  update pci.command_receipts set status='succeeded',result_entity_type='negotiation',
    result_entity_id=v_negotiation.negotiation_id,result_payload=v_result,completed_at=now()
  where actor_type='operator' and actor_user_id=p_actor_user_id
    and command_name='admin_open_negotiation' and idempotency_key=p_idempotency_key;

  return v_result;
end;
$$;

create or replace function pci_api.send_negotiation_message(
  p_actor_user_id uuid,
  p_negotiation_id uuid,
  p_message_body text,
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
  v_negotiation pci.negotiations%rowtype;
  v_creator_id uuid;
  v_sender_type text;
  v_operator_role text;
  v_receipt pci.command_receipts%rowtype;
  v_message_id uuid;
  v_result jsonb;
begin
  select n.* into v_negotiation from pci.negotiations n
  where n.negotiation_id=p_negotiation_id for update;
  if v_negotiation.negotiation_id is null then
    raise exception using errcode='P0001', message='negotiation_not_found';
  end if;
  if v_negotiation.status <> 'open' then
    raise exception using errcode='P0001', message='negotiation_not_open';
  end if;

  -- Resolve actor without trusting a client-provided role.
  begin
    v_operator_role := pci.require_operator(p_actor_user_id,v_negotiation.workspace_id,false);
    v_sender_type := 'operator';
  exception when others then
    v_operator_role := null;
  end;

  if v_sender_type is null then
    v_creator_id := pci.require_creator(p_actor_user_id,false);
    if v_creator_id <> v_negotiation.creator_id then
      raise exception using errcode='P0001', message='negotiation_actor_forbidden';
    end if;
    v_sender_type := 'creator';
  end if;

  if nullif(btrim(p_message_body),'') is null or char_length(btrim(p_message_body)) > 10000 then
    raise exception using errcode='P0001', message='invalid_negotiation_message';
  end if;

  perform pci.lock_command_key(v_sender_type || ':' || p_actor_user_id::text || ':send_negotiation_message',p_idempotency_key);

  select r.* into v_receipt from pci.command_receipts r
  where r.actor_type=v_sender_type and r.actor_user_id=p_actor_user_id
    and r.command_name='send_negotiation_message' and r.idempotency_key=p_idempotency_key limit 1;
  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then
      raise exception using errcode='P0001', message='idempotency_key_reused_with_different_payload';
    end if;
    if v_receipt.status='succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode='P0001', message='idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,request_id,actor_type,actor_user_id,actor_creator_id,workspace_id,
    command_name,request_hash,status
  ) values (
    p_idempotency_key,p_request_id,v_sender_type,p_actor_user_id,
    case when v_sender_type='creator' then v_negotiation.creator_id else null end,
    v_negotiation.workspace_id,'send_negotiation_message',p_request_hash,'processing'
  );

  insert into pci.negotiation_messages (
    negotiation_id,workspace_id,creator_id,sender_type,sender_user_id,message_body
  ) values (
    p_negotiation_id,v_negotiation.workspace_id,v_negotiation.creator_id,
    v_sender_type,p_actor_user_id,btrim(p_message_body)
  ) returning negotiation_message_id into v_message_id;

  perform pci.append_event(
    p_request_id,v_negotiation.workspace_id,v_sender_type,p_actor_user_id,
    case when v_sender_type='creator' then v_negotiation.creator_id else null end,
    'negotiation_message',v_message_id,'negotiation.message_sent',null,null,null,
    jsonb_build_object('negotiation_id',p_negotiation_id)
  );

  v_result := jsonb_build_object(
    'ok',true,'negotiation_id',p_negotiation_id,'message_id',v_message_id,
    'sender_type',v_sender_type
  );

  update pci.command_receipts set status='succeeded',result_entity_type='negotiation_message',
    result_entity_id=v_message_id,result_payload=v_result,completed_at=now()
  where actor_type=v_sender_type and actor_user_id=p_actor_user_id
    and command_name='send_negotiation_message' and idempotency_key=p_idempotency_key;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------------
-- Offer creation helper. The caller supplies item JSON:
-- [{submission_version_id, amount, item_terms?}, ...]
-- --------------------------------------------------------------------------

create or replace function pci.create_sent_offer(
  p_actor_user_id uuid,
  p_actor_type text,
  p_negotiation_id uuid,
  p_supersedes_offer_id uuid,
  p_currency text,
  p_items jsonb,
  p_rights_package_snapshot jsonb,
  p_payment_terms jsonb,
  p_performance_bonus_terms jsonb,
  p_commercial_terms jsonb,
  p_expires_at timestamptz,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_negotiation pci.negotiations%rowtype;
  v_offer_id uuid;
  v_item jsonb;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_amount numeric(14,2);
  v_total numeric(14,2) := 0;
  v_item_count integer := 0;
  v_previous pci.purchase_offers%rowtype;
begin
  select n.* into v_negotiation from pci.negotiations n
  where n.negotiation_id=p_negotiation_id for update;
  if v_negotiation.negotiation_id is null then
    raise exception using errcode='P0001', message='negotiation_not_found';
  end if;
  if v_negotiation.status <> 'open' then
    raise exception using errcode='P0001', message='negotiation_not_open';
  end if;

  if p_actor_type='operator' then
    perform pci.require_operator(p_actor_user_id,v_negotiation.workspace_id,true);
  elsif p_actor_type='creator' then
    if pci.require_creator(p_actor_user_id,true) <> v_negotiation.creator_id then
      raise exception using errcode='P0001', message='negotiation_actor_forbidden';
    end if;
  else
    raise exception using errcode='P0001', message='invalid_offer_proposer';
  end if;

  if upper(p_currency) !~ '^[A-Z]{3}$' then
    raise exception using errcode='P0001', message='invalid_currency';
  end if;
  if p_expires_at <= now() then
    raise exception using errcode='P0001', message='offer_expiry_must_be_future';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception using errcode='P0001', message='offer_items_required';
  end if;

  -- A counteroffer must supersede a currently sent offer from the other side.
  if p_supersedes_offer_id is not null then
    select o.* into v_previous from pci.purchase_offers o
    where o.purchase_offer_id=p_supersedes_offer_id for update;
    if v_previous.purchase_offer_id is null or v_previous.negotiation_id<>p_negotiation_id then
      raise exception using errcode='P0001', message='superseded_offer_not_found';
    end if;
    if v_previous.status <> 'sent' then
      raise exception using errcode='P0001', message='superseded_offer_not_pending';
    end if;
    if v_previous.proposer_type = p_actor_type then
      raise exception using errcode='P0001', message='counteroffer_must_respond_to_other_party';
    end if;
  end if;

  -- Validate each exact version before creating the formal offer snapshot.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_count := v_item_count + 1;
    if nullif(v_item->>'submission_version_id','') is null then
      raise exception using errcode='P0001', message='offer_item_version_required';
    end if;
    v_amount := (v_item->>'amount')::numeric;
    if v_amount is null or v_amount < 0 then
      raise exception using errcode='P0001', message='invalid_offer_item_amount';
    end if;

    select sv.* into v_version from pci.submission_versions sv
    where sv.submission_version_id=(v_item->>'submission_version_id')::uuid;
    if v_version.submission_version_id is null then
      raise exception using errcode='P0001', message='submission_version_not_found';
    end if;
    if v_version.creator_id<>v_negotiation.creator_id or v_version.workspace_id<>v_negotiation.workspace_id then
      raise exception using errcode='P0001', message='offer_item_context_mismatch';
    end if;
    if v_version.status<>'ready' or v_version.rights_clearance_status<>'complete' then
      raise exception using errcode='P0001', message='offer_item_not_commercially_eligible';
    end if;

    select s.* into v_submission from pci.submissions s where s.submission_id=v_version.submission_id;
    if v_submission.status<>'preselected' then
      raise exception using errcode='P0001', message='offer_item_submission_not_preselected';
    end if;

    v_total := v_total + v_amount;
  end loop;

  insert into pci.purchase_offers (
    workspace_id,creator_id,negotiation_id,proposer_type,proposer_user_id,status,
    supersedes_offer_id,currency,total_amount,rights_package_snapshot,payment_terms,
    performance_bonus_terms,commercial_terms,expires_at,sent_at
  ) values (
    v_negotiation.workspace_id,v_negotiation.creator_id,p_negotiation_id,p_actor_type,p_actor_user_id,'sent',
    p_supersedes_offer_id,upper(p_currency),v_total,coalesce(p_rights_package_snapshot,'{}'::jsonb),
    coalesce(p_payment_terms,'{}'::jsonb),coalesce(p_performance_bonus_terms,'{}'::jsonb),
    coalesce(p_commercial_terms,'{}'::jsonb),p_expires_at,now()
  ) returning purchase_offer_id into v_offer_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select sv.* into v_version from pci.submission_versions sv
    where sv.submission_version_id=(v_item->>'submission_version_id')::uuid;
    insert into pci.purchase_offer_items (
      purchase_offer_id,workspace_id,creator_id,submission_id,submission_version_id,
      amount,item_terms,version_sha256_snapshot
    ) values (
      v_offer_id,v_negotiation.workspace_id,v_negotiation.creator_id,v_version.submission_id,
      v_version.submission_version_id,(v_item->>'amount')::numeric,
      coalesce(v_item->'item_terms','{}'::jsonb),v_version.sha256
    );
  end loop;

  if p_supersedes_offer_id is not null then
    update pci.purchase_offers
    set status='superseded',superseded_at=now(),status_reason='counteroffer_received'
    where purchase_offer_id=p_supersedes_offer_id;
    perform pci.append_event(
      p_request_id,v_negotiation.workspace_id,p_actor_type,p_actor_user_id,
      case when p_actor_type='creator' then v_negotiation.creator_id else null end,
      'purchase_offer',p_supersedes_offer_id,'offer.superseded','sent','superseded','counteroffer_received',
      jsonb_build_object('superseded_by_offer_id',v_offer_id)
    );
  end if;

  perform pci.append_event(
    p_request_id,v_negotiation.workspace_id,p_actor_type,p_actor_user_id,
    case when p_actor_type='creator' then v_negotiation.creator_id else null end,
    'purchase_offer',v_offer_id,
    case when p_supersedes_offer_id is null then 'offer.sent' else 'offer.countered' end,
    null,'sent',null,jsonb_build_object(
      'negotiation_id',p_negotiation_id,'total_amount',v_total,'currency',upper(p_currency),
      'item_count',v_item_count,'supersedes_offer_id',p_supersedes_offer_id
    )
  );

  return v_offer_id;
end;
$$;

create or replace function pci_api.send_purchase_offer(
  p_actor_user_id uuid,
  p_actor_type text,
  p_negotiation_id uuid,
  p_supersedes_offer_id uuid,
  p_currency text,
  p_items jsonb,
  p_rights_package_snapshot jsonb,
  p_payment_terms jsonb,
  p_performance_bonus_terms jsonb,
  p_commercial_terms jsonb,
  p_expires_at timestamptz,
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
  v_negotiation pci.negotiations%rowtype;
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_offer_id uuid;
  v_offer pci.purchase_offers%rowtype;
  v_result jsonb;
begin
  select n.* into v_negotiation from pci.negotiations n where n.negotiation_id=p_negotiation_id;
  if v_negotiation.negotiation_id is null then raise exception using errcode='P0001',message='negotiation_not_found'; end if;

  if p_actor_type='operator' then
    perform pci.require_operator(p_actor_user_id,v_negotiation.workspace_id,true);
  elsif p_actor_type='creator' then
    v_creator_id:=pci.require_creator(p_actor_user_id,true);
    if v_creator_id<>v_negotiation.creator_id then raise exception using errcode='P0001',message='negotiation_actor_forbidden'; end if;
  else
    raise exception using errcode='P0001',message='invalid_offer_proposer';
  end if;

  perform pci.lock_command_key(p_actor_type || ':' || p_actor_user_id::text || ':send_purchase_offer',p_idempotency_key);

  select r.* into v_receipt from pci.command_receipts r
  where r.actor_type=p_actor_type and r.actor_user_id=p_actor_user_id
    and r.command_name='send_purchase_offer' and r.idempotency_key=p_idempotency_key limit 1;
  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then raise exception using errcode='P0001',message='idempotency_key_reused_with_different_payload'; end if;
    if v_receipt.status='succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode='P0001',message='idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,request_id,actor_type,actor_user_id,actor_creator_id,workspace_id,
    command_name,request_hash,status
  ) values (
    p_idempotency_key,p_request_id,p_actor_type,p_actor_user_id,
    case when p_actor_type='creator' then v_negotiation.creator_id else null end,
    v_negotiation.workspace_id,'send_purchase_offer',p_request_hash,'processing'
  );

  v_offer_id:=pci.create_sent_offer(
    p_actor_user_id,p_actor_type,p_negotiation_id,p_supersedes_offer_id,p_currency,p_items,
    p_rights_package_snapshot,p_payment_terms,p_performance_bonus_terms,p_commercial_terms,
    p_expires_at,p_request_id
  );

  select o.* into v_offer from pci.purchase_offers o where o.purchase_offer_id=v_offer_id;
  v_result:=jsonb_build_object(
    'ok',true,'purchase_offer_id',v_offer_id,'negotiation_id',p_negotiation_id,
    'status','sent','proposer_type',p_actor_type,'total_amount',v_offer.total_amount,
    'currency',v_offer.currency,'expires_at',v_offer.expires_at
  );

  update pci.command_receipts set status='succeeded',result_entity_type='purchase_offer',
    result_entity_id=v_offer_id,result_payload=v_result,completed_at=now()
  where actor_type=p_actor_type and actor_user_id=p_actor_user_id
    and command_name='send_purchase_offer' and idempotency_key=p_idempotency_key;

  return v_result;
end;
$$;

-- Recipient can reject a currently-sent formal offer. Acceptance is added in
-- the purchase-ledger slice because it must atomically create buyer debt.
create or replace function pci_api.reject_purchase_offer(
  p_actor_user_id uuid,
  p_purchase_offer_id uuid,
  p_reason text,
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
  v_offer pci.purchase_offers%rowtype;
  v_actor_type text;
  v_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  select o.* into v_offer from pci.purchase_offers o
  where o.purchase_offer_id=p_purchase_offer_id for update;
  if v_offer.purchase_offer_id is null then raise exception using errcode='P0001',message='purchase_offer_not_found'; end if;
  if v_offer.status<>'sent' then raise exception using errcode='P0001',message='purchase_offer_not_pending'; end if;

  if v_offer.proposer_type='operator' then
    v_creator_id:=pci.require_creator(p_actor_user_id,true);
    if v_creator_id<>v_offer.creator_id then raise exception using errcode='P0001',message='offer_recipient_forbidden'; end if;
    v_actor_type:='creator';
  else
    perform pci.require_operator(p_actor_user_id,v_offer.workspace_id,true);
    v_actor_type:='operator';
  end if;

  perform pci.lock_command_key(v_actor_type || ':' || p_actor_user_id::text || ':reject_purchase_offer',p_idempotency_key);
  select r.* into v_receipt from pci.command_receipts r
  where r.actor_type=v_actor_type and r.actor_user_id=p_actor_user_id
    and r.command_name='reject_purchase_offer' and r.idempotency_key=p_idempotency_key limit 1;
  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then raise exception using errcode='P0001',message='idempotency_key_reused_with_different_payload'; end if;
    if v_receipt.status='succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode='P0001',message='idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,request_id,actor_type,actor_user_id,actor_creator_id,workspace_id,
    command_name,request_hash,status
  ) values (
    p_idempotency_key,p_request_id,v_actor_type,p_actor_user_id,
    case when v_actor_type='creator' then v_offer.creator_id else null end,
    v_offer.workspace_id,'reject_purchase_offer',p_request_hash,'processing'
  );

  update pci.purchase_offers set status='rejected',rejected_at=now(),status_reason=nullif(btrim(p_reason),'')
  where purchase_offer_id=p_purchase_offer_id;

  perform pci.append_event(
    p_request_id,v_offer.workspace_id,v_actor_type,p_actor_user_id,
    case when v_actor_type='creator' then v_offer.creator_id else null end,
    'purchase_offer',p_purchase_offer_id,'offer.rejected','sent','rejected',nullif(btrim(p_reason),''),
    jsonb_build_object('negotiation_id',v_offer.negotiation_id)
  );

  v_result:=jsonb_build_object('ok',true,'purchase_offer_id',p_purchase_offer_id,'status','rejected');
  update pci.command_receipts set status='succeeded',result_entity_type='purchase_offer',
    result_entity_id=p_purchase_offer_id,result_payload=v_result,completed_at=now()
  where actor_type=v_actor_type and actor_user_id=p_actor_user_id
    and command_name='reject_purchase_offer' and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

-- Formal sent offer can be withdrawn only by proposer and only before acceptance.
create or replace function pci_api.withdraw_purchase_offer(
  p_actor_user_id uuid,
  p_purchase_offer_id uuid,
  p_reason text,
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
  v_offer pci.purchase_offers%rowtype;
  v_actor_creator_id uuid;
  v_receipt pci.command_receipts%rowtype;
  v_result jsonb;
begin
  select o.* into v_offer from pci.purchase_offers o where o.purchase_offer_id=p_purchase_offer_id for update;
  if v_offer.purchase_offer_id is null then raise exception using errcode='P0001',message='purchase_offer_not_found'; end if;
  if v_offer.status<>'sent' then raise exception using errcode='P0001',message='purchase_offer_not_pending'; end if;

  if v_offer.proposer_type='operator' then
    perform pci.require_operator(p_actor_user_id,v_offer.workspace_id,true);
  else
    v_actor_creator_id:=pci.require_creator(p_actor_user_id,true);
    if v_actor_creator_id<>v_offer.creator_id then raise exception using errcode='P0001',message='offer_proposer_forbidden'; end if;
  end if;

  -- Enforce the exact proposer identity, not merely same party type.
  if v_offer.proposer_user_id<>p_actor_user_id then
    raise exception using errcode='P0001',message='offer_proposer_forbidden';
  end if;

  perform pci.lock_command_key(v_offer.proposer_type || ':' || p_actor_user_id::text || ':withdraw_purchase_offer',p_idempotency_key);
  select r.* into v_receipt from pci.command_receipts r
  where r.actor_type=v_offer.proposer_type and r.actor_user_id=p_actor_user_id
    and r.command_name='withdraw_purchase_offer' and r.idempotency_key=p_idempotency_key limit 1;
  if v_receipt.command_receipt_id is not null then
    if v_receipt.request_hash is distinct from p_request_hash then raise exception using errcode='P0001',message='idempotency_key_reused_with_different_payload'; end if;
    if v_receipt.status='succeeded' then return v_receipt.result_payload; end if;
    raise exception using errcode='P0001',message='idempotent_command_not_replayable';
  end if;

  insert into pci.command_receipts (
    idempotency_key,request_id,actor_type,actor_user_id,actor_creator_id,workspace_id,
    command_name,request_hash,status
  ) values (
    p_idempotency_key,p_request_id,v_offer.proposer_type,p_actor_user_id,
    case when v_offer.proposer_type='creator' then v_offer.creator_id else null end,
    v_offer.workspace_id,'withdraw_purchase_offer',p_request_hash,'processing'
  );

  update pci.purchase_offers set status='withdrawn',withdrawn_at=now(),status_reason=nullif(btrim(p_reason),'')
  where purchase_offer_id=p_purchase_offer_id;

  perform pci.append_event(
    p_request_id,v_offer.workspace_id,v_offer.proposer_type,p_actor_user_id,
    case when v_offer.proposer_type='creator' then v_offer.creator_id else null end,
    'purchase_offer',p_purchase_offer_id,'offer.withdrawn','sent','withdrawn',nullif(btrim(p_reason),''),
    jsonb_build_object('negotiation_id',v_offer.negotiation_id)
  );

  v_result:=jsonb_build_object('ok',true,'purchase_offer_id',p_purchase_offer_id,'status','withdrawn');
  update pci.command_receipts set status='succeeded',result_entity_type='purchase_offer',
    result_entity_id=p_purchase_offer_id,result_payload=v_result,completed_at=now()
  where actor_type=v_offer.proposer_type and actor_user_id=p_actor_user_id
    and command_name='withdraw_purchase_offer' and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

-- Read model shared by separate admin/creator API wrappers. Internal notes are
-- never part of this negotiation response.
create or replace function pci_api.negotiation_detail(
  p_actor_user_id uuid,
  p_negotiation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n pci.negotiations%rowtype;
  v_creator_id uuid;
  v_is_operator boolean:=false;
begin
  select n.* into v_n from pci.negotiations n where n.negotiation_id=p_negotiation_id;
  if v_n.negotiation_id is null then raise exception using errcode='P0001',message='negotiation_not_found'; end if;

  begin
    perform pci.require_operator(p_actor_user_id,v_n.workspace_id,false);
    v_is_operator:=true;
  exception when others then
    v_is_operator:=false;
  end;

  if not v_is_operator then
    v_creator_id:=pci.require_creator(p_actor_user_id,false);
    if v_creator_id<>v_n.creator_id then raise exception using errcode='P0001',message='negotiation_actor_forbidden'; end if;
  end if;

  return jsonb_build_object(
    'negotiation_id',v_n.negotiation_id,
    'submission_id',v_n.submission_id,
    'status',v_n.status,
    'opened_at',v_n.opened_at,
    'closed_at',v_n.closed_at,
    'messages',coalesce((
      select jsonb_agg(jsonb_build_object(
        'message_id',m.negotiation_message_id,'sender_type',m.sender_type,
        'message_body',m.message_body,'created_at',m.created_at
      ) order by m.created_at,m.negotiation_message_id)
      from pci.negotiation_messages m where m.negotiation_id=v_n.negotiation_id
    ),'[]'::jsonb),
    'offers',coalesce((
      select jsonb_agg(jsonb_build_object(
        'purchase_offer_id',o.purchase_offer_id,'proposer_type',o.proposer_type,
        'status',o.status,'currency',o.currency,'total_amount',o.total_amount,
        'rights_package',o.rights_package_snapshot,'payment_terms',o.payment_terms,
        'performance_bonus_terms',o.performance_bonus_terms,'commercial_terms',o.commercial_terms,
        'expires_at',o.expires_at,'sent_at',o.sent_at,'supersedes_offer_id',o.supersedes_offer_id,
        'items',coalesce((
          select jsonb_agg(jsonb_build_object(
            'offer_item_id',oi.purchase_offer_item_id,'submission_id',oi.submission_id,
            'submission_version_id',oi.submission_version_id,'amount',oi.amount,
            'item_terms',oi.item_terms,'version_sha256',oi.version_sha256_snapshot
          ) order by oi.created_at,oi.purchase_offer_item_id)
          from pci.purchase_offer_items oi where oi.purchase_offer_id=o.purchase_offer_id
        ),'[]'::jsonb)
      ) order by o.created_at,o.purchase_offer_id)
      from pci.purchase_offers o where o.negotiation_id=v_n.negotiation_id
    ),'[]'::jsonb)
  );
end;
$$;

revoke execute on all functions in schema pci from public,anon,authenticated;
revoke execute on all functions in schema pci_api from public,anon,authenticated;
grant execute on all functions in schema pci to service_role;
grant execute on all functions in schema pci_api to service_role;

commit;
