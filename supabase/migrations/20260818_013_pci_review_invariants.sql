-- Protocol Creative Insights (PCI)
-- Phase 1H review-history invariants.
-- Intentionally stored in Git only; not applied to production yet.

alter table pci.submission_reviews
  add constraint pci_submission_reviews_changes_feedback_check
  check (
    decision <> 'changes_requested'
    or nullif(btrim(coalesce(creator_feedback, '')), '') is not null
  );

alter table pci.submission_reviews
  add constraint pci_submission_reviews_rejection_reason_check
  check (
    decision <> 'rejected'
    or (
      nullif(btrim(coalesce(rejection_reason_code, '')), '') is not null
      and nullif(btrim(coalesce(creator_feedback, '')), '') is not null
    )
  );

alter table pci.submission_reviews
  add constraint pci_submission_reviews_reason_scope_check
  check (
    decision = 'rejected'
    or rejection_reason_code is null
  );

create trigger pci_internal_notes_append_only
before update or delete on pci.internal_notes
for each row execute function pci.guard_append_only();

comment on table pci.submission_reviews is
  'Append-only review decisions. Change requests require creator-visible feedback; rejections require structured reason plus creator-visible feedback.';
comment on table pci.internal_notes is
  'Append-only Protocol-only notes. Never returned by creator-facing read models and never rewritten historically.';