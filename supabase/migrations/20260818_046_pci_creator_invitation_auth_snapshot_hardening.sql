-- Protocol Creative Insights (PCI)
-- Phase 1M hardening: cryptographic token shape and one-way Auth delivery snapshots.
-- Intentionally stored in Git only; not applied to production yet.

alter table pci.creator_invitations
  add constraint pci_creator_invitations_token_hash_sha256_chk
  check (token_hash ~ '^[0-9a-f]{64}$');

create or replace function pci.guard_creator_invitation_auth_delivery_snapshot()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.auth_user_id_snapshot is not null
     and new.auth_user_id_snapshot is distinct from old.auth_user_id_snapshot then
    raise exception using errcode='23514',message='pci_creator_invitation_auth_snapshot_immutable';
  end if;

  if old.delivery_status='sent' then
    if new.delivery_method is distinct from old.delivery_method
       or new.delivered_at is distinct from old.delivered_at then
      raise exception using errcode='23514',message='pci_creator_invitation_delivery_snapshot_immutable';
    end if;
  end if;

  if old.delivered_at is not null and new.delivered_at is distinct from old.delivered_at then
    raise exception using errcode='23514',message='pci_creator_invitation_delivery_timestamp_immutable';
  end if;

  return new;
end;
$$;

revoke all on function pci.guard_creator_invitation_auth_delivery_snapshot() from public,anon,authenticated;
grant execute on function pci.guard_creator_invitation_auth_delivery_snapshot() to service_role;

drop trigger if exists pci_creator_invitation_auth_delivery_snapshot_guard on pci.creator_invitations;
create trigger pci_creator_invitation_auth_delivery_snapshot_guard
before update on pci.creator_invitations
for each row execute function pci.guard_creator_invitation_auth_delivery_snapshot();

create or replace function pci.assert_creator_invitation_accepted_delivery()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if new.status='accepted' then
    if new.delivery_status <> 'sent'
       or new.delivered_at is null
       or new.auth_user_id_snapshot is null
       or new.accepted_at is null then
      raise exception using errcode='23514',message='pci_accepted_invitation_delivery_snapshot_required';
    end if;
  end if;
  return null;
end;
$$;

revoke all on function pci.assert_creator_invitation_accepted_delivery() from public,anon,authenticated;
grant execute on function pci.assert_creator_invitation_accepted_delivery() to service_role;

drop trigger if exists pci_creator_invitation_accepted_delivery_integrity on pci.creator_invitations;
create constraint trigger pci_creator_invitation_accepted_delivery_integrity
after insert or update on pci.creator_invitations
deferrable initially deferred
for each row execute function pci.assert_creator_invitation_accepted_delivery();
