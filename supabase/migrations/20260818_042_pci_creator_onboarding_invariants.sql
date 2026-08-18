-- Protocol Creative Insights (PCI)
-- Phase 1M hardening: workspace-scoped legal evidence and invitation lifecycle integrity.
-- Intentionally stored in Git only; not applied to production yet.

alter table pci.creator_legal_acceptances
  drop constraint if exists creator_legal_acceptances_creator_id_document_type_document_version_key;

create unique index if not exists pci_creator_legal_acceptance_workspace_version_uidx
  on pci.creator_legal_acceptances(creator_id,workspace_id,document_type,document_version)
  where workspace_id is not null;

create or replace function pci.guard_creator_invitation_status_transition()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if old.status='pending' and new.status in ('accepted','revoked','expired') then return new; end if;
  raise exception using errcode='23514',message='pci_creator_invitation_status_transition_invalid';
end;
$$;

revoke all on function pci.guard_creator_invitation_status_transition() from public,anon,authenticated;
grant execute on function pci.guard_creator_invitation_status_transition() to service_role;

drop trigger if exists pci_creator_invitations_status_transition_guard on pci.creator_invitations;
create trigger pci_creator_invitations_status_transition_guard
before update of status on pci.creator_invitations
for each row execute function pci.guard_creator_invitation_status_transition();

create or replace function pci.assert_creator_invitation_commit_integrity()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_invitation pci.creator_invitations%rowtype;
  v_relationship pci.workspace_creators%rowtype;
  v_creator pci.creators%rowtype;
begin
  select * into v_invitation from pci.creator_invitations i
  where i.invitation_id=coalesce(new.invitation_id,old.invitation_id);
  if v_invitation.invitation_id is null then return null; end if;

  select * into v_creator from pci.creators c where c.creator_id=v_invitation.creator_id;
  select * into v_relationship from pci.workspace_creators wc where wc.workspace_creator_id=v_invitation.workspace_creator_id;

  if v_creator.creator_id is null or lower(v_creator.email) is distinct from lower(v_invitation.email_snapshot) then
    raise exception using errcode='23514',message='pci_creator_invitation_creator_snapshot_invalid';
  end if;
  if v_relationship.workspace_creator_id is null
     or v_relationship.workspace_id is distinct from v_invitation.workspace_id
     or v_relationship.creator_id is distinct from v_invitation.creator_id then
    raise exception using errcode='23514',message='pci_creator_invitation_relationship_invalid';
  end if;
  if jsonb_typeof(v_invitation.legal_requirements_snapshot) <> 'array'
     or jsonb_array_length(v_invitation.legal_requirements_snapshot)=0 then
    raise exception using errcode='23514',message='pci_creator_invitation_legal_requirements_missing';
  end if;
  if v_invitation.status='accepted' then
    if v_invitation.accepted_at is null or v_invitation.auth_user_id_snapshot is null then
      raise exception using errcode='23514',message='pci_accepted_invitation_auth_snapshot_required';
    end if;
    if v_creator.auth_user_id is distinct from v_invitation.auth_user_id_snapshot then
      raise exception using errcode='23514',message='pci_accepted_invitation_creator_auth_mismatch';
    end if;
  end if;
  if v_invitation.status='revoked' and v_invitation.revoked_at is null then
    raise exception using errcode='23514',message='pci_revoked_invitation_timestamp_required';
  end if;
  return null;
end;
$$;

revoke all on function pci.assert_creator_invitation_commit_integrity() from public,anon,authenticated;
grant execute on function pci.assert_creator_invitation_commit_integrity() to service_role;

drop trigger if exists pci_creator_invitation_commit_integrity on pci.creator_invitations;
create constraint trigger pci_creator_invitation_commit_integrity
after insert or update on pci.creator_invitations
deferrable initially deferred
for each row execute function pci.assert_creator_invitation_commit_integrity();

create or replace function pci.assert_workspace_creator_activation_has_legal_acceptance()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_invitation pci.creator_invitations%rowtype;
  v_missing integer;
begin
  if new.status <> 'active' or old.status is not distinct from 'active' then return null; end if;

  select * into v_invitation from pci.creator_invitations i
  where i.workspace_creator_id=new.workspace_creator_id and i.status='accepted'
  order by i.accepted_at desc limit 1;

  if v_invitation.invitation_id is null then
    raise exception using errcode='23514',message='pci_workspace_creator_activation_requires_invitation';
  end if;

  select count(*) into v_missing
  from jsonb_array_elements(v_invitation.legal_requirements_snapshot) req
  where not exists(
    select 1 from pci.creator_legal_acceptances ca
    where ca.creator_id=new.creator_id
      and ca.workspace_id=new.workspace_id
      and ca.legal_document_id=(req->>'legal_document_id')::uuid
      and lower(ca.document_hash)=lower(req->>'document_hash')
  );

  if v_missing>0 then
    raise exception using errcode='23514',message='pci_workspace_creator_activation_requires_legal_acceptance';
  end if;
  return null;
end;
$$;

revoke all on function pci.assert_workspace_creator_activation_has_legal_acceptance() from public,anon,authenticated;
grant execute on function pci.assert_workspace_creator_activation_has_legal_acceptance() to service_role;

drop trigger if exists pci_workspace_creator_activation_legal_gate on pci.workspace_creators;
create constraint trigger pci_workspace_creator_activation_legal_gate
after update of status on pci.workspace_creators
deferrable initially deferred
for each row execute function pci.assert_workspace_creator_activation_has_legal_acceptance();
