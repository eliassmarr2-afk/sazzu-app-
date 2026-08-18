# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-18  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1K — Manual payout execution + payment confirmation — CODE COMPLETE / RUNTIME UNVALIDATED**

The implemented vertical slice now covers:

`Consignment → Creator upload/version → review/revisions → preselection → rights declaration/clearance → negotiation → immutable formal offer/counteroffer → atomic acceptance → Purchase agreed + base Payable + Rights Grant pending_payment → Creator confirms exact payment destination → Payable ready_to_pay → Protocol opens explicit payment execution context → external manual transfer → payout registered → payout confirmed → Payable paid (or ready_to_pay for remaining partial balance).`

**Rights activation is deliberately NOT part of 1K.** Even when the Payable becomes `paid`, the Rights Grant remains `pending_payment` until the next technical block validates and performs the rights-activation transaction.

## Frozen architecture represented in code

- `pci` remains the private authoritative schema.
- `pci_api` remains the minimal service-role-only command/query surface.
- Creator identities are external counterparties, never `protocol_workspace_members`.
- Browser clients cannot mutate PCI business tables directly.
- `anon` and `authenticated` receive no direct PCI table/function grants.
- JWT-authenticated Edge Functions resolve actor identity server-side.
- Mutations use state validation, row locking, idempotency receipts and append-only events.
- Submitted media and acquired assets remain in separate private Storage zones.
- Creative bytes are immutable after `ready`.
- Negotiation chat never substitutes formal offers.
- Formal offers reference the exact preselected version/hash.
- Acceptance atomically creates Purchase + base Payable + pending Rights Grant(s).
- Payment account identifiers are encrypted before PostgreSQL using `PCI_PAYMENT_DATA_KEY` and AES-GCM.
- Payment-destination confirmations are append-only snapshots per Payable.

## 1K payout model

`pci.payouts` represents a real external money movement.

`pci.payout_allocations` associates the money movement with the obligation it pays.

Current MVP command registers one payout against one Payable, while the relational model preserves allocation extensibility.

### Register external transfer

Preconditions:

- Protocol operator is an active workspace member.
- Payable is `ready_to_pay`.
- Creator has confirmed a payment destination for that exact obligation.
- Latest confirmation snapshot equals the Payable snapshot.
- Purchase is still valid/agreed.
- amount does not exceed unconfirmed remaining balance.
- provider + provider reference is unique in the workspace.
- transfer timestamp is valid.
- optional proof, if supplied, belongs to the exact Payable path.

Atomic result:

- Payout `initiated`
- one payout allocation
- Payable `processing`
- events + idempotency receipt

### Confirm payout

`initiated → confirmed`

Only **confirmed** payout allocations count toward the obligation.

If confirmed total covers the obligation:

`Payable processing → paid`

If the transfer is partial and no other payout is in flight:

`Payable processing → ready_to_pay`

with the remaining balance calculated from the ledger.

### Failure

`Payout initiated → failed`

The Payable is recomputed from confirmed/in-flight allocations and normally returns to `ready_to_pay`.

### Reversal

`Payout confirmed → reversed`

The Payable is recomputed from the remaining confirmed money.

A reversal is blocked if any Rights Grant for the Purchase has already left `pending_payment`. Once commercial rights have activated, a reversed payment must become a formal incident/dispute rather than silently undoing the ledger.

## Duplicate / overpayment protection

- unique `(workspace_id, provider, provider_reference)` for real-world payment references;
- payout amount cannot exceed confirmed remaining balance after in-flight reservations;
- an initiated payout reserves its amount, blocking double registration;
- confirmed allocation sum cannot exceed `amount_due`;
- `paid` Payable requires confirmed funds >= `amount_due`;
- `processing` Payable requires a real initiated payout;
- payout allocation sum must exactly equal payout amount at COMMIT;
- allocation payment-destination snapshot must equal payout destination snapshot.

## Payout proof handling

Bucket: `pci-payout-proofs` (private).

Allowed proof formats remain PDF/JPEG/PNG/WEBP up to 20 MiB.

Protocol may request a signed upload token only for a valid `ready_to_pay` obligation.

Canonical path:

`workspace/{workspace_id}/payable/{payable_id}/proof/{proof_id}.{ext}`

The Edge Function validates the object before payout registration and PostgreSQL validates the path again at COMMIT against the actual payout allocation.

Proof is optional in the MVP; provider reference is mandatory.

Protocol and Creator obtain proof access only through short-lived signed read URLs.

## Sensitive payment execution context

Normal Protocol payment queues expose only:

- provider
- account type
- holder
- masked document
- alias
- identifier last four

The exact encrypted account identifier is not returned by normal read models.

Explicit operator action:

`POST /v1/workspaces/:workspace_id/payables/:payable_id/execution-context`

causes `pci-admin-api` to:

1. verify workspace membership and payable state;
2. retrieve the private encrypted snapshot using a service-role-only query;
3. decrypt the identifier in Edge memory using `PCI_PAYMENT_DATA_KEY`;
4. return it only in that no-cache response;
5. never persist the plaintext identifier or include it in logs.

## 1K Edge Function routes

### `pci-admin-api`

All prior Review / rights / negotiation / offer / playback routes remain represented in the rewritten readable dispatcher.

Payment/read routes now include:

- `GET /v1/workspaces/:workspace_id/purchases`
- `GET /v1/workspaces/:workspace_id/payables`
- `GET /v1/workspaces/:workspace_id/payouts`
- `GET /v1/workspaces/:workspace_id/payouts/:payout_id`
- `POST /v1/workspaces/:workspace_id/payables/:payable_id/execution-context`
- `POST /v1/workspaces/:workspace_id/payables/:payable_id/payout-proof-upload`
- `POST /v1/workspaces/:workspace_id/payables/:payable_id/payouts`
- `POST /v1/workspaces/:workspace_id/payouts/:payout_id/confirm`
- `POST /v1/workspaces/:workspace_id/payouts/:payout_id/fail`
- `POST /v1/workspaces/:workspace_id/payouts/:payout_id/reverse`
- `POST /v1/workspaces/:workspace_id/payouts/:payout_id/proof`

### `pci-creator-api`

All prior opportunity/submission/upload/rights/negotiation/offer/account routes remain represented in the rewritten readable dispatcher.

Payment visibility now includes:

- `GET /v1/purchases`
- `GET /v1/payables`
- `GET /v1/payouts`
- `POST /v1/payouts/:payout_id/proof`

Creator payout projections never expose encrypted/exact destination identifiers.

## Migrations implemented through 1K

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
28. `20260818_028_pci_manual_payout_lifecycle.sql`
29. `20260818_029_pci_payout_execution_read_models.sql`
30. `20260818_030_pci_payout_proof_upload_context.sql`
31. `20260818_031_pci_creator_payout_proof_context.sql`
32. `20260818_032_pci_payout_commit_invariants.sql`
33. `20260818_033_pci_payout_proof_path_invariant.sql`

## Required deployment configuration — do not apply to production yet

Before Edge Functions can invoke `pci_api` through PostgREST, `pci_api` must be included in the project's exposed API schemas. The authoritative `pci` schema remains private and no direct `anon/authenticated` grants are introduced.

Both human-facing Edge Functions must deploy with JWT verification enabled.

Expected environment configuration:

- `PCI_CREATOR_ALLOWED_ORIGINS`
- `PCI_ADMIN_ALLOWED_ORIGINS`
- `PCI_PAYMENT_DATA_KEY`
- normal Supabase Edge secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

No production configuration is changed at this checkpoint.

## Validation status

Code is versioned in Git but migrations/functions have **not** been executed against a disposable Supabase environment. SQL/runtime integration therefore remains unvalidated.

A paid Supabase development branch remains deliberately deferred. Before any real Creator session, create a temporary branch, apply all PCI migrations/functions, run state-transition/idempotency/Storage/encryption/authorization/adversarial tests, then delete the branch.

## Security gate still required before external Creator launch

External launch remains blocked until the legacy project's broad `authenticated` / public RPC surface is audited and hardened. PCI's own private boundary does not make unrelated legacy RPCs safe automatically.

## Next technical block

**FASE 1L — Rights activation + Creative Asset provisioning**

Target slice:

`Base Payable PAID → validate exact Purchase/version/hash/clearance → Rights Grant pending_payment → active → create Creative Asset provisioning → outbox promote exact immutable source bytes from pci-submissions to pci-assets → verify promoted hash/object → Creative Asset available → Submission acquired → Purchase settled.`

Storage copy/promotion remains an asynchronous external side effect: the database transaction activates the legal/commercial state and creates a `provisioning` asset; a worker performs the Storage copy and only then marks the asset `available`.

Meta Ads execution remains explicitly out of scope.