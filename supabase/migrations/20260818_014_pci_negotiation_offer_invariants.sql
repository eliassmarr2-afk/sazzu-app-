-- Protocol Creative Insights (PCI)
-- Phase 1I: negotiation and formal-offer invariants.
-- Intentionally stored in Git only; not applied to production yet.

-- Only one live negotiation thread may exist for a submission at a time.
create unique index pci_negotiations_one_open_per_submission_uidx
  on pci.negotiations (submission_id)
  where status = 'open';

-- A negotiation can have historical offers, but only one live formal proposal.
create unique index pci_purchase_offers_one_sent_per_negotiation_uidx
  on pci.purchase_offers (negotiation_id)
  where status = 'sent';

-- Commercial conversation history is append-only.
create trigger pci_messages_append_only
before update or delete on pci.messages
for each row execute function pci.guard_append_only();

-- Negotiations may only move open <-> closed. Identity/ownership is immutable.
create or replace function pci.guard_negotiation_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.negotiation_id is distinct from old.negotiation_id
     or new.workspace_id is distinct from old.workspace_id
     or new.creator_id is distinct from old.creator_id
     or new.submission_id is distinct from old.submission_id
     or new.opened_by is distinct from old.opened_by
     or new.opened_at is distinct from old.opened_at
  then
    raise exception using errcode = '23514', message = 'pci_negotiation_identity_immutable';
  end if;

  if old.status = 'open' and new.status = 'closed' then
    if new.closed_at is null or nullif(btrim(coalesce(new.close_reason, '')), '') is null then
      raise exception using errcode = '23514', message = 'pci_negotiation_close_reason_required';
    end if;
  elsif old.status = 'closed' and new.status = 'open' then
    if new.closed_at is not null or new.close_reason is not null then
      raise exception using errcode = '23514', message = 'pci_negotiation_reopen_must_clear_close_fields';
    end if;
  elsif new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'pci_negotiation_transition_invalid';
  end if;

  return new;
end;
$$;

revoke all on function pci.guard_negotiation_transition() from public, anon, authenticated;
grant execute on function pci.guard_negotiation_transition() to service_role;

create trigger pci_negotiations_transition_guard
before update on pci.negotiations
for each row execute function pci.guard_negotiation_transition();

-- Sent offers are immutable commercial snapshots. Only controlled status/timestamp
-- fields may change after they have been sent.
create or replace function pci.guard_purchase_offer_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'sent' and new.status not in ('accepted','rejected','superseded','withdrawn','expired','rejected_by_withdrawal') then
      raise exception using errcode = '23514', message = 'pci_offer_transition_invalid';
    end if;

    if old.status <> 'sent' then
      raise exception using errcode = '23514', message = 'pci_offer_terminal_state_immutable';
    end if;
  end if;

  if new.status = 'accepted' and new.accepted_at is null then
    raise exception using errcode = '23514', message = 'pci_offer_accepted_timestamp_required';
  end if;
  if new.status = 'rejected' and new.rejected_at is null then
    raise exception using errcode = '23514', message = 'pci_offer_rejected_timestamp_required';
  end if;
  if new.status = 'withdrawn' and new.withdrawn_at is null then
    raise exception using errcode = '23514', message = 'pci_offer_withdrawn_timestamp_required';
  end if;

  return new;
end;
$$;

revoke all on function pci.guard_purchase_offer_status_transition() from public, anon, authenticated;
grant execute on function pci.guard_purchase_offer_status_transition() to service_role;

create trigger pci_purchase_offers_status_transition_guard
before update on pci.purchase_offers
for each row execute function pci.guard_purchase_offer_status_transition();

comment on index pci_negotiations_one_open_per_submission_uidx is
  'Prevents concurrent duplicate negotiation threads for the same PCI submission.';
comment on index pci_purchase_offers_one_sent_per_negotiation_uidx is
  'Exactly one live sent formal offer may exist in a negotiation; counters supersede the prior offer.';
comment on table pci.messages is
  'Shared negotiation conversation. Chat is contextual evidence only and never substitutes a formal purchase_offer.';