-- Protocol Creative Insights (PCI)
-- Phase 1M: Creator invitation, Auth bootstrap and versioned legal-acceptance gate.
-- Intentionally stored in Git only; not applied to production yet.

create table pci.creator_legal_documents (
  legal_document_id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.protocol_workspaces(workspace_id) on delete restrict,
  document_type text not null,
  document_version text not null,
  title text not null,
  document_hash text not null,
  content_ref text not null,
  status text not null default 'draft'
    check (status in ('draft','published','superseded','retired')),
  required_for_activation boolean not null default true,
  published_at timestamptz null,
  superseded_at timestamptz null,
  retired_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, document_type, document_version),
  check (document_type ~ '^[a-z0-9_:-]{1,80}$'),
  check (length(document_version) between 1 and 80),
  check (length(title) between 1 and 240),
  check (document_hash ~ '^[0-9a-f]{64}$'),
  check (length(content_ref) between 1 and 1000)
);

create unique index pci_creator_legal_documents_one_published_type_uidx
  on pci.creator_legal_documents(workspace_id, document_type)
  where status='published';

create index pci_creator_legal_documents_workspace_idx
  on pci.creator_legal_documents(workspace_id,status,required_for_activation,document_type);

alter table pci.creator_legal_documents enable row level security;
grant all privileges on pci.creator_legal_documents to service_role;

alter table pci.creator_invitations
  add column if not exists workspace_creator_id uuid null
    references pci.workspace_creators(workspace_creator_id) on delete restrict,
  add column if not exists auth_user_id_snapshot uuid null
    references auth.users(id) on delete set null,
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending','sent','failed')),
  add column if not exists delivery_method text null
    check (delivery_method is null or delivery_method in ('supabase_invite','magic_link')),
  add column if not exists legal_requirements_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists delivered_at timestamptz null,
  add column if not exists delivery_failed_at timestamptz null,
  add column if not exists delivery_error_code text null,
  add column if not exists revoked_reason text null;

alter table pci.creator_legal_acceptances
  add column if not exists workspace_id text null
    references public.protocol_workspaces(workspace_id) on delete restrict,
  add column if not exists legal_document_id uuid null
    references pci.creator_legal_documents(legal_document_id) on delete restrict,
  add column if not exists invitation_id uuid null
    references pci.creator_invitations(invitation_id) on delete restrict;

create unique index if not exists pci_creator_legal_acceptance_document_uidx
  on pci.creator_legal_acceptances(creator_id,legal_document_id)
  where legal_document_id is not null;

create index if not exists pci_creator_invitations_workspace_status_idx
  on pci.creator_invitations(workspace_id,status,created_at desc);

create index if not exists pci_creator_invitations_creator_status_idx
  on pci.creator_invitations(creator_id,status,created_at desc);

create or replace function pci.guard_creator_invitation_identity()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if new.invitation_id is distinct from old.invitation_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.workspace_creator_id is distinct from old.workspace_creator_id
     or lower(new.email_snapshot) is distinct from lower(old.email_snapshot)
     or new.token_hash is distinct from old.token_hash
     or new.legal_requirements_snapshot is distinct from old.legal_requirements_snapshot
     or new.expires_at is distinct from old.expires_at
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
  then
    raise exception using errcode='23514',message='pci_creator_invitation_identity_immutable';
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_creator_invitation_identity() from public,anon,authenticated;
grant execute on function pci.guard_creator_invitation_identity() to service_role;

drop trigger if exists pci_creator_invitations_identity_guard on pci.creator_invitations;
create trigger pci_creator_invitations_identity_guard
before update on pci.creator_invitations
for each row execute function pci.guard_creator_invitation_identity();

-- A published legal document is a contractual snapshot. Only lifecycle state may move.
create or replace function pci.guard_creator_legal_document_snapshot()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.status <> 'draft' then
    if new.legal_document_id is distinct from old.legal_document_id
       or new.workspace_id is distinct from old.workspace_id
       or new.document_type is distinct from old.document_type
       or new.document_version is distinct from old.document_version
       or new.title is distinct from old.title
       or new.document_hash is distinct from old.document_hash
       or new.content_ref is distinct from old.content_ref
       or new.required_for_activation is distinct from old.required_for_activation
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
    then
      raise exception using errcode='23514',message='pci_published_legal_document_snapshot_immutable';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_creator_legal_document_snapshot() from public,anon,authenticated;
grant execute on function pci.guard_creator_legal_document_snapshot() to service_role;

drop trigger if exists pci_creator_legal_documents_snapshot_guard on pci.creator_legal_documents;
create trigger pci_creator_legal_documents_snapshot_guard
before update on pci.creator_legal_documents
for each row execute function pci.guard_creator_legal_document_snapshot();

-- Legal acceptances are evidence: append-only.
drop trigger if exists pci_creator_legal_acceptances_append_only on pci.creator_legal_acceptances;
create trigger pci_creator_legal_acceptances_append_only
before update or delete on pci.creator_legal_acceptances
for each row execute function pci.guard_append_only();

create or replace function pci_api.admin_publish_creator_legal_document(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_document_type text,
  p_document_version text,
  p_title text,
  p_document_hash text,
  p_content_ref text,
  p_required_for_activation boolean,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_type text:=lower(btrim(coalesce(p_document_type,'')));
  v_version text:=btrim(coalesce(p_document_version,''));
  v_title text:=btrim(coalesce(p_title,''));
  v_hash text:=lower(btrim(coalesce(p_document_hash,'')));
  v_content_ref text:=btrim(coalesce(p_content_ref,''));
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_document_id uuid;
  v_result jsonb;
begin
  if p_actor_user_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode='22023',message='pci_legal_document_context_required';
  end if;
  if v_type !~ '^[a-z0-9_:-]{1,80}$' then raise exception using errcode='22023',message='pci_legal_document_type_invalid'; end if;
  if length(v_version) not between 1 and 80 then raise exception using errcode='22023',message='pci_legal_document_version_invalid'; end if;
  if length(v_title) not between 1 and 240 then raise exception using errcode='22023',message='pci_legal_document_title_invalid'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode='22023',message='pci_legal_document_hash_invalid'; end if;
  if length(v_content_ref) not between 1 and 1000 then raise exception using errcode='22023',message='pci_legal_document_content_ref_invalid'; end if;

  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  insert into pci.command_receipts(idempotency_key,actor_type,actor_user_id,workspace_id,command_name,request_id,status)
  values(p_idempotency_key,'operator',p_actor_user_id,p_workspace_id,'admin_publish_creator_legal_document',p_request_id,'processing')
  on conflict do nothing returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='operator' and cr.actor_user_id=p_actor_user_id
      and cr.command_name='admin_publish_creator_legal_document' and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  -- Supersede the previously published version of this exact document type.
  update pci.creator_legal_documents
  set status='superseded',superseded_at=now()
  where workspace_id=p_workspace_id and document_type=v_type and status='published';

  insert into pci.creator_legal_documents(
    workspace_id,document_type,document_version,title,document_hash,content_ref,
    status,required_for_activation,published_at,created_by
  ) values(
    p_workspace_id,v_type,v_version,v_title,v_hash,v_content_ref,
    'published',coalesce(p_required_for_activation,true),now(),p_actor_user_id
  ) returning legal_document_id into v_document_id;

  perform pci.append_event(
    p_workspace_id,'operator',p_actor_user_id,null,'creator_legal_document',v_document_id,
    'creator_legal_document.published',null,'published',p_request_id,v_receipt_id,
    jsonb_build_object('document_type',v_type,'document_version',v_version,'document_hash',v_hash,'required_for_activation',coalesce(p_required_for_activation,true))
  );

  v_result:=jsonb_build_object(
    'ok',true,'legal_document_id',v_document_id,'document_type',v_type,
    'document_version',v_version,'document_hash',v_hash,'status','published',
    'required_for_activation',coalesce(p_required_for_activation,true)
  );

  update pci.command_receipts set status='completed',result_entity_type='creator_legal_document',
    result_entity_id=v_document_id,response_snapshot=v_result,completed_at=now()
  where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

create or replace function pci_api.admin_create_creator_invitation(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_email text,
  p_display_name text,
  p_legal_name text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_display_name text:=btrim(coalesce(p_display_name,''));
  v_legal_name text:=nullif(btrim(coalesce(p_legal_name,'')),'');
  v_token_hash text:=lower(btrim(coalesce(p_token_hash,'')));
  v_creator pci.creators%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_requirements jsonb;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_invitation_id uuid;
  v_result jsonb;
begin
  if p_actor_user_id is null or p_idempotency_key is null or p_request_id is null then
    raise exception using errcode='22023',message='pci_creator_invitation_context_required';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email)>320 then
    raise exception using errcode='22023',message='pci_creator_invitation_email_invalid';
  end if;
  if length(v_display_name) not between 1 and 160 then
    raise exception using errcode='22023',message='pci_creator_display_name_invalid';
  end if;
  if v_legal_name is not null and length(v_legal_name)>240 then
    raise exception using errcode='22023',message='pci_creator_legal_name_invalid';
  end if;
  if v_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='pci_creator_invitation_token_hash_invalid';
  end if;
  if p_expires_at is null or p_expires_at <= now()+interval '5 minutes' or p_expires_at > now()+interval '7 days' then
    raise exception using errcode='22023',message='pci_creator_invitation_expiry_invalid';
  end if;

  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'legal_document_id',d.legal_document_id,
    'document_type',d.document_type,
    'document_version',d.document_version,
    'title',d.title,
    'document_hash',d.document_hash,
    'content_ref',d.content_ref
  ) order by d.document_type),'[]'::jsonb)
  into v_requirements
  from pci.creator_legal_documents d
  where d.workspace_id=p_workspace_id and d.status='published' and d.required_for_activation;

  if jsonb_array_length(v_requirements)=0 then
    raise exception using errcode='23514',message='pci_required_legal_documents_missing';
  end if;

  insert into pci.command_receipts(idempotency_key,actor_type,actor_user_id,workspace_id,command_name,request_id,status)
  values(p_idempotency_key,'operator',p_actor_user_id,p_workspace_id,'admin_create_creator_invitation',p_request_id,'processing')
  on conflict do nothing returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='operator' and cr.actor_user_id=p_actor_user_id
      and cr.command_name='admin_create_creator_invitation' and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  select * into v_creator from pci.creators c where lower(c.email)=v_email for update;
  if v_creator.creator_id is null then
    insert into pci.creators(display_name,legal_name,email,status)
    values(v_display_name,v_legal_name,v_email,'pending') returning * into v_creator;
  else
    if v_creator.status='closed' then raise exception using errcode='23514',message='pci_creator_closed'; end if;
    if v_creator.status='suspended' then raise exception using errcode='23514',message='pci_creator_suspended'; end if;
  end if;

  select * into v_relationship from pci.workspace_creators wc
  where wc.workspace_id=p_workspace_id and wc.creator_id=v_creator.creator_id for update;

  if v_relationship.workspace_creator_id is null then
    insert into pci.workspace_creators(workspace_id,creator_id,status)
    values(p_workspace_id,v_creator.creator_id,'invited') returning * into v_relationship;
  elsif v_relationship.status='closed' then
    raise exception using errcode='23514',message='pci_workspace_creator_closed';
  elsif v_relationship.status in ('restricted','suspended') then
    raise exception using errcode='23514',message='pci_workspace_creator_not_invitable';
  elsif v_relationship.status='active' then
    raise exception using errcode='23514',message='pci_workspace_creator_already_active';
  end if;

  -- New invitation supersedes any still-pending invitation for this relationship.
  update pci.creator_invitations
  set status='revoked',revoked_at=now(),revoked_reason='superseded_by_new_invitation'
  where workspace_id=p_workspace_id and creator_id=v_creator.creator_id and status='pending';

  insert into pci.creator_invitations(
    workspace_id,creator_id,workspace_creator_id,email_snapshot,token_hash,status,expires_at,
    legal_requirements_snapshot,created_by
  ) values(
    p_workspace_id,v_creator.creator_id,v_relationship.workspace_creator_id,v_email,v_token_hash,'pending',p_expires_at,
    v_requirements,p_actor_user_id
  ) returning invitation_id into v_invitation_id;

  perform pci.append_event(
    p_workspace_id,'operator',p_actor_user_id,v_creator.creator_id,'creator_invitation',v_invitation_id,
    'creator_invitation.created',null,'pending',p_request_id,v_receipt_id,
    jsonb_build_object('workspace_creator_id',v_relationship.workspace_creator_id,'expires_at',p_expires_at,'required_document_count',jsonb_array_length(v_requirements),'existing_auth_user',v_creator.auth_user_id is not null)
  );

  v_result:=jsonb_build_object(
    'ok',true,'invitation_id',v_invitation_id,'creator_id',v_creator.creator_id,
    'workspace_creator_id',v_relationship.workspace_creator_id,'email',v_email,'expires_at',p_expires_at,
    'existing_auth_user_id',v_creator.auth_user_id,'required_legal_documents',v_requirements
  );

  update pci.command_receipts set status='completed',result_entity_type='creator_invitation',
    result_entity_id=v_invitation_id,response_snapshot=v_result,completed_at=now()
  where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

create or replace function pci_api.admin_mark_creator_invitation_delivery(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_invitation_id uuid,
  p_auth_user_id uuid,
  p_delivery_method text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_invitation pci.creator_invitations%rowtype;
  v_method text:=lower(btrim(coalesce(p_delivery_method,'')));
begin
  if p_invitation_id is null or p_request_id is null or v_method not in ('supabase_invite','magic_link') then
    raise exception using errcode='22023',message='pci_invitation_delivery_context_invalid';
  end if;
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_invitation from pci.creator_invitations i
  where i.invitation_id=p_invitation_id and i.workspace_id=p_workspace_id for update;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;
  if v_invitation.status <> 'pending' then raise exception using errcode='23514',message='pci_creator_invitation_not_pending'; end if;

  update pci.creator_invitations
  set delivery_status='sent',delivery_method=v_method,auth_user_id_snapshot=coalesce(p_auth_user_id,auth_user_id_snapshot),
      delivered_at=coalesce(delivered_at,now()),delivery_failed_at=null,delivery_error_code=null
  where invitation_id=v_invitation.invitation_id;

  perform pci.append_event(
    p_workspace_id,'operator',p_actor_user_id,v_invitation.creator_id,'creator_invitation',v_invitation.invitation_id,
    'creator_invitation.delivered','pending','pending',p_request_id,null,
    jsonb_build_object('delivery_method',v_method)
  );
  return jsonb_build_object('ok',true,'invitation_id',v_invitation.invitation_id,'delivery_status','sent','delivery_method',v_method);
end;
$$;

create or replace function pci_api.admin_fail_creator_invitation_delivery(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_invitation_id uuid,
  p_error_code text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_invitation pci.creator_invitations%rowtype;
  v_error text:=left(lower(regexp_replace(btrim(coalesce(p_error_code,'delivery_failed')),'[^a-z0-9_:-]+','_','g')),120);
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  select * into v_invitation from pci.creator_invitations i
  where i.invitation_id=p_invitation_id and i.workspace_id=p_workspace_id for update;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;
  if v_invitation.status <> 'pending' then return jsonb_build_object('ok',true,'invitation_id',v_invitation.invitation_id,'status',v_invitation.status); end if;

  update pci.creator_invitations
  set status='revoked',revoked_at=now(),revoked_reason='delivery_failed',delivery_status='failed',
      delivery_failed_at=now(),delivery_error_code=v_error
  where invitation_id=v_invitation.invitation_id;

  perform pci.append_event(
    p_workspace_id,'operator',p_actor_user_id,v_invitation.creator_id,'creator_invitation',v_invitation.invitation_id,
    'creator_invitation.delivery_failed','pending','revoked',p_request_id,null,jsonb_build_object('error_code',v_error)
  );
  return jsonb_build_object('ok',true,'invitation_id',v_invitation.invitation_id,'status','revoked','delivery_status','failed');
end;
$$;

create or replace function pci_api.creator_bootstrap_invitation(
  p_actor_user_id uuid,
  p_actor_email text,
  p_token_hash text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text:=lower(btrim(coalesce(p_actor_email,'')));
  v_hash text:=lower(btrim(coalesce(p_token_hash,'')));
  v_invitation pci.creator_invitations%rowtype;
  v_creator pci.creators%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_result jsonb;
begin
  if p_actor_user_id is null or p_idempotency_key is null or p_request_id is null or v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='pci_creator_bootstrap_context_invalid';
  end if;

  select * into v_invitation from pci.creator_invitations i
  where i.token_hash=v_hash for update;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;
  if v_invitation.status='accepted' then
    select * into v_creator from pci.creators c where c.creator_id=v_invitation.creator_id;
    if v_creator.auth_user_id is distinct from p_actor_user_id then raise exception using errcode='42501',message='pci_creator_invitation_user_mismatch'; end if;
    return jsonb_build_object('ok',true,'invitation_id',v_invitation.invitation_id,'creator_id',v_creator.creator_id,'workspace_id',v_invitation.workspace_id,'status','accepted','required_legal_documents',v_invitation.legal_requirements_snapshot,'idempotent_replay',true);
  end if;
  if v_invitation.status <> 'pending' then raise exception using errcode='23514',message='pci_creator_invitation_not_pending'; end if;
  if v_invitation.expires_at <= now() then
    update pci.creator_invitations set status='expired' where invitation_id=v_invitation.invitation_id;
    raise exception using errcode='23514',message='pci_creator_invitation_expired';
  end if;
  if lower(v_invitation.email_snapshot) is distinct from v_email then raise exception using errcode='42501',message='pci_creator_invitation_email_mismatch'; end if;
  if v_invitation.auth_user_id_snapshot is not null and v_invitation.auth_user_id_snapshot is distinct from p_actor_user_id then
    raise exception using errcode='42501',message='pci_creator_invitation_user_mismatch';
  end if;

  select * into v_creator from pci.creators c where c.creator_id=v_invitation.creator_id for update;
  if v_creator.creator_id is null then raise exception using errcode='P0002',message='pci_creator_not_found'; end if;
  if lower(v_creator.email) is distinct from v_email then raise exception using errcode='42501',message='pci_creator_invitation_email_mismatch'; end if;
  if v_creator.auth_user_id is not null and v_creator.auth_user_id is distinct from p_actor_user_id then
    raise exception using errcode='42501',message='pci_creator_auth_already_linked_elsewhere';
  end if;

  select * into v_relationship from pci.workspace_creators wc
  where wc.workspace_creator_id=v_invitation.workspace_creator_id for update;
  if v_relationship.workspace_creator_id is null or v_relationship.creator_id is distinct from v_creator.creator_id
     or v_relationship.workspace_id is distinct from v_invitation.workspace_id then
    raise exception using errcode='23514',message='pci_creator_invitation_relationship_invalid';
  end if;
  if v_relationship.status <> 'invited' then raise exception using errcode='23514',message='pci_creator_invitation_relationship_not_invited'; end if;

  insert into pci.command_receipts(idempotency_key,actor_type,actor_user_id,actor_creator_id,workspace_id,command_name,request_id,status)
  values(p_idempotency_key,'creator',p_actor_user_id,v_creator.creator_id,v_invitation.workspace_id,'creator_bootstrap_invitation',p_request_id,'processing')
  on conflict do nothing returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='creator' and cr.actor_user_id=p_actor_user_id and cr.actor_creator_id=v_creator.creator_id
      and cr.command_name='creator_bootstrap_invitation' and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  update pci.creators set auth_user_id=p_actor_user_id where creator_id=v_creator.creator_id and auth_user_id is null;
  update pci.creator_invitations
  set status='accepted',accepted_at=now(),auth_user_id_snapshot=p_actor_user_id,
      delivery_status=case when delivery_status='pending' then 'sent' else delivery_status end,
      delivered_at=coalesce(delivered_at,now())
  where invitation_id=v_invitation.invitation_id;

  perform pci.append_event(
    v_invitation.workspace_id,'creator',p_actor_user_id,v_creator.creator_id,'creator_invitation',v_invitation.invitation_id,
    'creator_invitation.auth_bootstrapped','pending','accepted',p_request_id,v_receipt_id,
    jsonb_build_object('workspace_creator_id',v_relationship.workspace_creator_id,'legal_acceptance_required',true)
  );

  v_result:=jsonb_build_object(
    'ok',true,'invitation_id',v_invitation.invitation_id,'creator_id',v_creator.creator_id,
    'workspace_id',v_invitation.workspace_id,'workspace_creator_id',v_relationship.workspace_creator_id,
    'invitation_status','accepted','workspace_creator_status','invited','creator_status',v_creator.status,
    'required_legal_documents',v_invitation.legal_requirements_snapshot,'next_action','accept_required_legal_documents'
  );
  update pci.command_receipts set status='completed',result_entity_type='creator_invitation',result_entity_id=v_invitation.invitation_id,
    response_snapshot=v_result,completed_at=now() where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

create or replace function pci_api.creator_accept_legal_document(
  p_actor_user_id uuid,
  p_invitation_id uuid,
  p_legal_document_id uuid,
  p_document_hash text,
  p_accepted_from_ip inet,
  p_accepted_user_agent text,
  p_idempotency_key uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_hash text:=lower(btrim(coalesce(p_document_hash,'')));
  v_creator pci.creators%rowtype;
  v_invitation pci.creator_invitations%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_document pci.creator_legal_documents%rowtype;
  v_requirement jsonb;
  v_receipt_id uuid;
  v_existing pci.command_receipts%rowtype;
  v_acceptance_id uuid;
  v_missing integer;
  v_activated boolean:=false;
  v_result jsonb;
begin
  if p_actor_user_id is null or p_invitation_id is null or p_legal_document_id is null
     or p_idempotency_key is null or p_request_id is null or v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='pci_legal_acceptance_context_invalid';
  end if;

  select * into v_creator from pci.creators c where c.auth_user_id=p_actor_user_id for update;
  if v_creator.creator_id is null then raise exception using errcode='42501',message='pci_creator_not_linked'; end if;
  if v_creator.status in ('restricted','suspended','closed') then raise exception using errcode='42501',message='pci_creator_not_activatable'; end if;

  select * into v_invitation from pci.creator_invitations i
  where i.invitation_id=p_invitation_id and i.creator_id=v_creator.creator_id for update;
  if v_invitation.invitation_id is null then raise exception using errcode='P0002',message='pci_creator_invitation_not_found'; end if;
  if v_invitation.status <> 'accepted' then raise exception using errcode='23514',message='pci_creator_invitation_not_bootstrapped'; end if;
  if v_invitation.auth_user_id_snapshot is distinct from p_actor_user_id then raise exception using errcode='42501',message='pci_creator_invitation_user_mismatch'; end if;

  select value into v_requirement
  from jsonb_array_elements(v_invitation.legal_requirements_snapshot) value
  where value->>'legal_document_id'=p_legal_document_id::text
  limit 1;
  if v_requirement is null then raise exception using errcode='23514',message='pci_legal_document_not_required_by_invitation'; end if;
  if lower(coalesce(v_requirement->>'document_hash','')) is distinct from v_hash then raise exception using errcode='23514',message='pci_legal_document_hash_mismatch'; end if;

  select * into v_document from pci.creator_legal_documents d where d.legal_document_id=p_legal_document_id;
  if v_document.legal_document_id is null then raise exception using errcode='P0002',message='pci_legal_document_not_found'; end if;
  if v_document.workspace_id is distinct from v_invitation.workspace_id
     or v_document.document_type is distinct from v_requirement->>'document_type'
     or v_document.document_version is distinct from v_requirement->>'document_version'
     or lower(v_document.document_hash) is distinct from v_hash then
    raise exception using errcode='23514',message='pci_legal_document_snapshot_mismatch';
  end if;

  select * into v_relationship from pci.workspace_creators wc where wc.workspace_creator_id=v_invitation.workspace_creator_id for update;
  if v_relationship.workspace_creator_id is null or v_relationship.status <> 'invited' then
    if v_relationship.status='active' then
      return jsonb_build_object('ok',true,'creator_id',v_creator.creator_id,'workspace_id',v_invitation.workspace_id,'workspace_creator_status','active','idempotent_replay',true);
    end if;
    raise exception using errcode='23514',message='pci_creator_invitation_relationship_not_invited';
  end if;

  insert into pci.command_receipts(idempotency_key,actor_type,actor_user_id,actor_creator_id,workspace_id,command_name,request_id,status)
  values(p_idempotency_key,'creator',p_actor_user_id,v_creator.creator_id,v_invitation.workspace_id,'creator_accept_legal_document',p_request_id,'processing')
  on conflict do nothing returning command_receipt_id into v_receipt_id;

  if v_receipt_id is null then
    select * into v_existing from pci.command_receipts cr
    where cr.actor_type='creator' and cr.actor_user_id=p_actor_user_id and cr.actor_creator_id=v_creator.creator_id
      and cr.command_name='creator_accept_legal_document' and cr.idempotency_key=p_idempotency_key
    order by cr.created_at desc limit 1;
    if v_existing.command_receipt_id is null then raise exception using errcode='23505',message='pci_idempotency_conflict'; end if;
    if v_existing.status='completed' then return v_existing.response_snapshot; end if;
    raise exception using errcode='40001',message='pci_command_already_processing';
  end if;

  insert into pci.creator_legal_acceptances(
    creator_id,workspace_id,legal_document_id,invitation_id,document_type,document_version,document_hash,
    accepted_from_ip,accepted_user_agent,accepted_at
  ) values(
    v_creator.creator_id,v_invitation.workspace_id,v_document.legal_document_id,v_invitation.invitation_id,
    v_document.document_type,v_document.document_version,v_document.document_hash,
    p_accepted_from_ip,left(nullif(btrim(coalesce(p_accepted_user_agent,'')),''),1000),now()
  ) on conflict do nothing returning legal_acceptance_id into v_acceptance_id;

  if v_acceptance_id is null then
    select ca.legal_acceptance_id into v_acceptance_id from pci.creator_legal_acceptances ca
    where ca.creator_id=v_creator.creator_id and ca.legal_document_id=v_document.legal_document_id;
  end if;

  select count(*) into v_missing
  from jsonb_array_elements(v_invitation.legal_requirements_snapshot) req
  where not exists(
    select 1 from pci.creator_legal_acceptances ca
    where ca.creator_id=v_creator.creator_id
      and ca.legal_document_id=(req->>'legal_document_id')::uuid
      and lower(ca.document_hash)=lower(req->>'document_hash')
  );

  if v_missing=0 then
    update pci.creators set status='active' where creator_id=v_creator.creator_id and status='pending';
    update pci.workspace_creators set status='active',activated_at=coalesce(activated_at,now())
    where workspace_creator_id=v_relationship.workspace_creator_id and status='invited';
    v_activated:=true;
  end if;

  perform pci.append_event(
    v_invitation.workspace_id,'creator',p_actor_user_id,v_creator.creator_id,'creator_legal_acceptance',v_acceptance_id,
    'creator.legal_document_accepted',null,'accepted',p_request_id,v_receipt_id,
    jsonb_build_object('invitation_id',v_invitation.invitation_id,'legal_document_id',v_document.legal_document_id,'document_type',v_document.document_type,'document_version',v_document.document_version,'workspace_activated',v_activated)
  );

  if v_activated then
    perform pci.append_event(
      v_invitation.workspace_id,'system',null,v_creator.creator_id,'workspace_creator',v_relationship.workspace_creator_id,
      'workspace_creator.onboarding_activated','invited','active',p_request_id,v_receipt_id,
      jsonb_build_object('invitation_id',v_invitation.invitation_id)
    );
  end if;

  v_result:=jsonb_build_object(
    'ok',true,'legal_acceptance_id',v_acceptance_id,'legal_document_id',v_document.legal_document_id,
    'document_type',v_document.document_type,'document_version',v_document.document_version,
    'remaining_required_documents',v_missing,'workspace_activated',v_activated,
    'workspace_creator_status',case when v_activated then 'active' else 'invited' end
  );

  update pci.command_receipts set status='completed',result_entity_type='creator_legal_acceptance',result_entity_id=v_acceptance_id,
    response_snapshot=v_result,completed_at=now() where command_receipt_id=v_receipt_id;
  return v_result;
end;
$$;

create or replace function pci_api.creator_onboarding_state(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_creator pci.creators%rowtype;
begin
  select * into v_creator from pci.creators c where c.auth_user_id=p_actor_user_id;
  if v_creator.creator_id is null then
    return jsonb_build_object('ok',true,'linked',false,'creator_status',null,'relationships','[]'::jsonb);
  end if;

  return jsonb_build_object(
    'ok',true,'linked',true,'creator_id',v_creator.creator_id,'display_name',v_creator.display_name,
    'creator_status',v_creator.status,
    'relationships',coalesce((
      select jsonb_agg(jsonb_build_object(
        'workspace_id',wc.workspace_id,
        'workspace_creator_id',wc.workspace_creator_id,
        'status',wc.status,
        'activated_at',wc.activated_at,
        'latest_invitation',(
          select jsonb_build_object(
            'invitation_id',i.invitation_id,'status',i.status,'expires_at',i.expires_at,
            'required_legal_documents',i.legal_requirements_snapshot,
            'accepted_legal_document_ids',coalesce((
              select jsonb_agg(ca.legal_document_id)
              from pci.creator_legal_acceptances ca
              where ca.creator_id=v_creator.creator_id and ca.invitation_id=i.invitation_id
            ),'[]'::jsonb)
          )
          from pci.creator_invitations i
          where i.workspace_creator_id=wc.workspace_creator_id
          order by i.created_at desc limit 1
        )
      ) order by wc.created_at)
      from pci.workspace_creators wc where wc.creator_id=v_creator.creator_id
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function pci_api.admin_creator_invitations(
  p_actor_user_id uuid,
  p_workspace_id text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
begin
  perform pci.require_active_workspace_member(p_actor_user_id,p_workspace_id);
  return jsonb_build_object('ok',true,'items',coalesce((
    select jsonb_agg(jsonb_build_object(
      'invitation_id',i.invitation_id,'creator_id',i.creator_id,'workspace_creator_id',i.workspace_creator_id,
      'display_name',c.display_name,'email',i.email_snapshot,'status',i.status,'delivery_status',i.delivery_status,
      'delivery_method',i.delivery_method,'expires_at',i.expires_at,'delivered_at',i.delivered_at,'accepted_at',i.accepted_at,
      'created_at',i.created_at,'workspace_creator_status',wc.status
    ) order by i.created_at desc)
    from pci.creator_invitations i
    join pci.creators c on c.creator_id=i.creator_id
    join pci.workspace_creators wc on wc.workspace_creator_id=i.workspace_creator_id
    where i.workspace_id=p_workspace_id
  ),'[]'::jsonb));
end;
$$;

revoke all on function pci_api.admin_publish_creator_legal_document(uuid,text,text,text,text,text,text,boolean,uuid,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_create_creator_invitation(uuid,text,text,text,text,text,timestamptz,uuid,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_mark_creator_invitation_delivery(uuid,text,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_fail_creator_invitation_delivery(uuid,text,uuid,text,uuid) from public,anon,authenticated;
revoke all on function pci_api.creator_bootstrap_invitation(uuid,text,text,uuid,uuid) from public,anon,authenticated;
revoke all on function pci_api.creator_accept_legal_document(uuid,uuid,uuid,text,inet,text,uuid,uuid) from public,anon,authenticated;
revoke all on function pci_api.creator_onboarding_state(uuid) from public,anon,authenticated;
revoke all on function pci_api.admin_creator_invitations(uuid,text) from public,anon,authenticated;

grant execute on function pci_api.admin_publish_creator_legal_document(uuid,text,text,text,text,text,text,boolean,uuid,uuid) to service_role;
grant execute on function pci_api.admin_create_creator_invitation(uuid,text,text,text,text,text,timestamptz,uuid,uuid) to service_role;
grant execute on function pci_api.admin_mark_creator_invitation_delivery(uuid,text,uuid,uuid,text,uuid) to service_role;
grant execute on function pci_api.admin_fail_creator_invitation_delivery(uuid,text,uuid,text,uuid) to service_role;
grant execute on function pci_api.creator_bootstrap_invitation(uuid,text,text,uuid,uuid) to service_role;
grant execute on function pci_api.creator_accept_legal_document(uuid,uuid,uuid,text,inet,text,uuid,uuid) to service_role;
grant execute on function pci_api.creator_onboarding_state(uuid) to service_role;
grant execute on function pci_api.admin_creator_invitations(uuid,text) to service_role;

comment on table pci.creator_legal_documents is 'Versioned workspace-specific legal documents. Published versions are immutable contractual snapshots.';
comment on function pci_api.creator_bootstrap_invitation(uuid,text,text,uuid,uuid) is 'Links an authenticated Supabase user to the invited PCI Creator without granting workspace access before required legal acceptance.';
