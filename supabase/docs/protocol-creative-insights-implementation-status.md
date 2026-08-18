# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-18  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1J — Atomic offer acceptance + Purchase + Payable + Rights Pending — CODE COMPLETE / RUNTIME UNVALIDATED**

The vertical slice now covers:

`Consignment → Creator submission/version upload → review/revisions → preselection → rights declaration/clearance → negotiation → immutable formal offer/counteroffer → Creator accepts live Protocol offer → atomic Purchase + base Payable + pending Rights Grant(s) → Creator creates/selects payment account → confirms exact payment destination for that payable → Payable ready_to_pay.`

Payment transfer execution is deliberately not part of 1J. Commercial rights remain inactive while the base payable is unpaid.

## Commercial acceptance invariant now implemented

`creator_accept_offer()` locks and validates the exact live offer and, in one PostgreSQL transaction, creates:

1. Offer `sent → accepted`
2. Purchase `agreed`
3. Base Payable `awaiting_confirmation`
4. One Rights Grant `pending_payment` per purchased exact submission version/hash
5. Negotiation `closed` with `purchase_agreed`
6. Append-only events, command receipt and notification outbox entry

If any step fails, the transaction rolls back and none of these objects persist.

Exact retries use the same idempotency key and return the original committed Purchase snapshot even if the first HTTP response was lost.

## Commit-time integrity guards

Deferred constraint triggers now enforce at COMMIT:

- an accepted offer must have a Purchase;
- the Purchase must reference the accepted offer with matching workspace/creator/currency/amount;
- every Purchase must have its base Payable;
- every purchased offer item must have a Rights Grant;
- a Payable in `ready_to_pay`, `processing` or `paid` must have an actual payment-destination confirmation and frozen snapshot.

Commercial Purchase, Rights Grant and Payable identity/value snapshots are immutable. Lifecycle status/timestamps may evolve through commands.

An exact submission version can only receive one Rights Grant, preventing accidental double-acquisition of the same bytes.

## Payment destination lifecycle

Creator payment account details are immutable after creation. If the Creator changes alias/CVU/CBU, PCI creates a new account row and the previous row may only be deactivated.

A payable confirmation creates an append-only `pci.payable_payment_confirmations` row and freezes the exact account snapshot into the Payable. Later account changes do not alter that obligation's confirmed destination.

State flow:

`awaiting_confirmation → ready_to_pay`

Reconfirmation before transfer is supported and creates a new historical confirmation. Exact idempotent retries return the original confirmation even if the Payable later advances state.

## Sensitive payment data

`pci-creator-api` never forwards a raw account identifier to PostgreSQL. If an exact account identifier is supplied, the Edge Function encrypts it using AES-GCM before invoking the private command.

Required future Edge secret:

- `PCI_PAYMENT_DATA_KEY`

The encrypted value remains backend-only. Creator/Admin read models expose only operational fields such as provider, alias and last four characters; ciphertext is excluded.

## Rights boundary remains intact

At offer acceptance:

- Purchase exists: **yes**
- Protocol debt exists: **yes**
- Rights Grant exists: **yes, `pending_payment`**
- Commercial rights active: **NO**
- Creative Asset available: **NO**

The Creator's rights declaration is locked against rewriting as soon as any Rights Grant exists, including `pending_payment`.

This preserves the frozen policy: **“Mientras no te paguemos, tu video sigue siendo tuyo.”**

## Edge Function routes relevant through 1J

### `pci-creator-api`

Existing upload/review/negotiation routes remain intact. 1J adds:

- `POST /v1/offers/:offer_id/accept`
- `GET /v1/payment-accounts`
- `POST /v1/payment-accounts`
- `POST /v1/payment-accounts/:payment_account_id/deactivate`
- `GET /v1/payables`
- `POST /v1/payables/:payable_id/confirm-payment-account`

Purchase/payable safe read models also exist in `pci_api` for subsequent UI wiring.

### `pci-admin-api`

Existing review, rights-clearance, negotiation, offer and playback routes remain intact.

1J adds backend-safe read models for:

- Protocol purchases
- Protocol payables/payment queue

These intentionally do not expose encrypted payment identifiers. Admin route wiring for payment execution is part of 1K.

## Migrations implemented

1. `20260818_001_pci_foundation_schema.sql`
2. `20260818_002_pci_security_invariants.sql`
3. `20260818_003_pci_commercial_domain.sql`
4. `20260818_004_pci_operator_commands.sql`
5. `20260818_005_pci_creator_submission_commands.sql`
6. `20260818_006_pci_storage_buckets.sql`
7. `20260818_007_pci_creator_finalize_and_read_models.sql`
8. `20260818_008_pci_creator_upload_invalidation.sql`
9. `20260818_009_pci_admin_review_read_models.sql`
10. `20260818_010_pci_review_workflow_commands.sql`
11. `20260818_011_pci_review_read_models.sql`
12. `20260818_012_pci_creator_submission_detail_reviews.sql`
13. `20260818_013_pci_review_invariants.sql`
14. `20260818_014_pci_negotiation_offer_invariants.sql`
15. `20260818_015_pci_admin_negotiation_commands.sql`
16. `20260818_016_pci_admin_formal_offer_commands.sql`
17. `20260818_017_pci_creator_negotiation_offer_commands.sql`
18. `20260818_018_pci_negotiation_offer_read_models.sql`
19. `20260818_019_pci_offer_expiration_worker.sql`
20. `20260818_020_pci_rights_clearance_lifecycle.sql`
21. `20260818_021_pci_offer_exact_version_guards.sql`
22. `20260818_022_pci_atomic_offer_acceptance.sql`
23. `20260818_023_pci_payment_account_confirmation.sql`
24. `20260818_024_pci_purchase_payable_read_models.sql`
25. `20260818_025_pci_payable_confirmation_idempotency.sql`
26. `20260818_026_pci_purchase_commit_invariants.sql`
27. `20260818_027_pci_payment_account_immutability.sql`

## Required deployment configuration — do not apply to production yet

Before Edge Functions can invoke `pci_api` through PostgREST, `pci_api` must be included in the project's exposed API schemas. The authoritative `pci` schema remains private and no direct `anon/authenticated` grants are introduced.

Both Edge Functions must deploy with JWT verification enabled.

Expected environment configuration:

- `PCI_CREATOR_ALLOWED_ORIGINS`
- `PCI_ADMIN_ALLOWED_ORIGINS`
- `PCI_PAYMENT_DATA_KEY`
- normal Supabase Edge secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

No production configuration is changed at this checkpoint.

## Validation status

All PCI work remains versioned in Git only. Migrations/functions have **not** been executed against a disposable Supabase environment, therefore SQL/runtime integration remains unvalidated.

The paid Supabase development branch remains deliberately deferred. Before any real Creator session, create a temporary branch, apply the complete migration chain, run state-transition/idempotency/Storage/payment-snapshot/authorization/adversarial tests, then delete that branch.

## Security gate still required before external Creator launch

External launch remains blocked until the legacy project's broad `authenticated` / public RPC surface is audited and hardened. PCI's private boundary does not automatically make unrelated legacy RPCs safe.

## Next technical block

**FASE 1K — Manual payout execution + payment confirmation**

Target slice:

`Protocol sees ready_to_pay → backend reveals/decrypts only the confirmed destination required for the authorized payment operation → Protocol records external transfer/provider/reference/proof → Payout + allocation created → base Payable becomes paid only when confirmed allocations cover the obligation.`

1K will not activate commercial rights casually from the UI. After payment confirmation is stable, the next block will handle **Rights activation + Creative Asset provisioning/promotion** as a derived backend consequence.

Meta Ads execution remains explicitly out of scope.
