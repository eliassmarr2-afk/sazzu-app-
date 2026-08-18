-- Protocol Creative Insights (PCI)
-- Phase 1I hardening: exact-version commercial guards.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.guard_purchase_offer_item_preselected_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_offer pci.purchase_offers%rowtype;
  v_negotiation pci.negotiations%rowtype;
  v_submission pci.submissions%rowtype;
  v_version pci.submission_versions%rowtype;
begin
  select * into v_offer from pci.purchase_offers po where po.offer_id = new.offer_id;
  if v_offer.offer_id is null then
    raise exception using errcode = '23514', message = 'pci_offer_not_found';
  end if;

  select * into v_negotiation from pci.negotiations n where n.negotiation_id = v_offer.negotiation_id;
  select * into v_submission from pci.submissions s where s.submission_id = v_negotiation.submission_id;
  select * into v_version from pci.submission_versions sv where sv.submission_version_id = new.submission_version_id;

  if new.submission_id <> v_submission.submission_id
     or v_version.submission_id <> v_submission.submission_id then
    raise exception using errcode = '23514', message = 'pci_offer_item_submission_mismatch';
  end if;

  if v_submission.status <> 'preselected' then
    raise exception using errcode = '23514', message = 'pci_offer_requires_preselected_submission';
  end if;

  if v_submission.current_version_id <> v_version.submission_version_id then
    raise exception using errcode = '23514', message = 'pci_offer_requires_current_preselected_version';
  end if;

  if v_version.status <> 'ready' or v_version.sha256 is null then
    raise exception using errcode = '23514', message = 'pci_offer_version_not_commercially_ready';
  end if;

  if not exists (
    select 1
    from pci.submission_reviews sr
    where sr.submission_id = v_submission.submission_id
      and sr.submission_version_id = v_version.submission_version_id
      and sr.decision = 'preselected'
  ) then
    raise exception using errcode = '23514', message = 'pci_offer_version_not_preselected';
  end if;

  return new;
end;
$$;

revoke all on function pci.guard_purchase_offer_item_preselected_version() from public, anon, authenticated;
grant execute on function pci.guard_purchase_offer_item_preselected_version() to service_role;

create trigger pci_purchase_offer_items_preselected_version_guard
before insert on pci.purchase_offer_items
for each row execute function pci.guard_purchase_offer_item_preselected_version();

create or replace function pci.guard_creator_rights_declaration_after_grant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rights_declaration is distinct from old.rights_declaration
     and exists (
       select 1 from pci.rights_grants rg
       where rg.submission_version_id = old.submission_version_id
     )
  then
    raise exception using errcode = '23514', message = 'pci_rights_declaration_locked_after_grant';
  end if;
  return new;
end;
$$;

revoke all on function pci.guard_creator_rights_declaration_after_grant() from public, anon, authenticated;
grant execute on function pci.guard_creator_rights_declaration_after_grant() to service_role;

create trigger pci_submission_versions_rights_declaration_grant_guard
before update on pci.submission_versions
for each row execute function pci.guard_creator_rights_declaration_after_grant();

comment on function pci.guard_purchase_offer_item_preselected_version() is
  'Formal offers can only reference the exact current ready version that Protocol explicitly preselected.';