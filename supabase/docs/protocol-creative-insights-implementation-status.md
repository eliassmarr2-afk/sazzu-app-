# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-18  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1I — Negotiation + formal offers — CODE COMPLETE / RUNTIME UNVALIDATED**

The implemented vertical slice now covers:

`Protocol creates/publishes consignment → Creator joins → Submission/V1 → signed TUS upload → review → changes/V2 or preselection → Creator rights declaration → Protocol rights clearance → negotiation → shared contextual messages → immutable formal offer for the exact preselected version → Creator rejects or counteroffers → Protocol can reject counteroffer, supersede it with a new formal offer, withdraw its own offer or close/reopen negotiation.`

**Formal acceptance is deliberately NOT implemented in 1I.** The frozen invariant is that an accepted offer may not exist without its Purchase + base Payable + Rights Grant pending payment. Therefore the `accept_offer` command and route begin in **FASE 1J** and must create those objects atomically.

## Frozen architecture represented in code

- `pci` is the private authoritative schema.
- `pci_api` is the minimal backend command/query surface.
- Creator identities are external counterparties, never `protocol_workspace_members`.
- Browser clients cannot mutate PCI business tables directly.
- `anon` and `authenticated` receive no direct PCI table/function grants.
- JWT-authenticated Edge Functions resolve actor identity server-side and invoke service-role-only commands.
- Business mutations use state validation, row locking where required, idempotency receipts and append-only events.
- Submitted media and acquired assets remain in separate private Storage zones.
- Creative bytes are immutable after `ready`; rights declaration/clearance metadata may evolve independently.
- Internal Protocol review notes and Creator-visible feedback are different projections.
- Negotiation chat is contextual evidence only; it never substitutes a formal `purchase_offer`.
- Formal offers are immutable snapshots and reference an exact preselected version.
- Only one open negotiation may exist per submission.
- Only one `sent` formal offer may exist per negotiation.
- Counteroffers create a new formal row linked by `parent_offer_id`; the previous live proposal becomes `superseded`.
- Creator counteroffers preserve the exact creative version and inherited rights/payment/bonus snapshots; only price and explicit counter note change.
- Offer expiration has a worker command but is not scheduled in production.

## Rights-clearance refinement made during 1I

The earlier ready-version guard was intentionally corrected.

### Immutable forever

- Storage bucket/path
- original filename
- MIME
- file size
- duration/dimensions
- SHA-256
- technical validation
- finalization timestamps
- version number / submission ownership

### Allowed to evolve without changing bytes

- `rights_declaration`
- `rights_clearance_status` (`pending`, `complete`, `flagged`)

Creator submits a declaration for the exact ready version. Protocol records an append-only `rights_clearance_review`. Formal offer creation requires `rights_clearance_status = complete`.

Once a future Rights Grant exists for a version, the Creator declaration is locked against rewriting.

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

## Edge Functions in Git

### `pci-creator-api`

JWT required at deployment.

Current routes include:

- `GET /v1/opportunities`
- `POST /v1/consignments/:consignment_id/join`
- `POST /v1/submissions`
- `GET /v1/submissions`
- `GET /v1/submissions/:submission_id`
- `POST /v1/submissions/:submission_id/versions`
- `POST /v1/versions/:submission_version_id/finalize`
- `POST /v1/versions/:submission_version_id/rights-declaration`
- `GET /v1/negotiations`
- `GET /v1/negotiations/:negotiation_id`
- `POST /v1/negotiations/:negotiation_id/messages`
- `POST /v1/offers/:offer_id/reject`
- `POST /v1/offers/:offer_id/counter`

There is intentionally no Creator `accept` route yet.

### `pci-admin-api`

JWT required at deployment.

Review/read routes remain intact, including review queue, submission detail, review context, review decisions, internal notes and signed playback.

1I adds:

- `POST /v1/workspaces/:workspace_id/versions/:submission_version_id/rights-clearance`
- `GET /v1/workspaces/:workspace_id/negotiations`
- `GET /v1/workspaces/:workspace_id/negotiations/:negotiation_id`
- `POST /v1/workspaces/:workspace_id/submissions/:submission_id/negotiation/open`
- `POST /v1/workspaces/:workspace_id/negotiations/:negotiation_id/reopen`
- `POST /v1/workspaces/:workspace_id/negotiations/:negotiation_id/close`
- `POST /v1/workspaces/:workspace_id/negotiations/:negotiation_id/messages`
- `POST /v1/workspaces/:workspace_id/negotiations/:negotiation_id/offers`
- `POST /v1/workspaces/:workspace_id/offers/:offer_id/reject`
- `POST /v1/workspaces/:workspace_id/offers/:offer_id/withdraw`

## Formal offer lifecycle implemented

Initial Protocol proposal:

`none → offer SENT (workspace)`

Creator response:

- `SENT → REJECTED`
- `SENT → SUPERSEDED + new SENT counteroffer (creator)`

Protocol response to Creator counteroffer:

- creator `SENT → REJECTED`
- creator `SENT → SUPERSEDED + new SENT offer (workspace)`

Protocol may withdraw its own live proposal:

`workspace SENT → WITHDRAWN`

Due offers may be materialized by worker:

`SENT → EXPIRED`

Negotiation can close without acquisition. Closing resolves any live proposal first and never changes ownership of the submission.

## Acceptance boundary — frozen for 1J

`accept_offer()` must validate, lock and atomically create:

1. Offer `sent → accepted`
2. Purchase `agreed`
3. Base Payable `awaiting_confirmation`
4. Rights Grant `pending_payment` tied to exact version/hash
5. Negotiation `closed` with purchase reason
6. Append-only events / command receipt

If any step fails, none of them may persist.

Only after that layer exists may the Creator API expose `POST /v1/offers/:offer_id/accept`.

## Required deployment configuration — do not apply to production yet

Before Edge Functions can invoke `pci_api` through PostgREST, `pci_api` must be included in the project's exposed API schemas. The authoritative `pci` schema remains private and no direct `anon/authenticated` grants are introduced.

Both Edge Functions must deploy with JWT verification enabled.

Expected environment configuration:

- `PCI_CREATOR_ALLOWED_ORIGINS`
- `PCI_ADMIN_ALLOWED_ORIGINS`
- normal Supabase Edge secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

No production configuration is changed at this checkpoint.

## Validation status

Code is versioned in Git but migrations/functions have **not** been executed against a disposable Supabase environment. SQL/runtime integration therefore remains unvalidated.

A paid Supabase development branch remains deliberately deferred. Before real Creator sessions, create a temporary branch, apply all PCI migrations/functions, execute state-transition/idempotency/Storage/authorization/adversarial tests, then delete that branch.

## Security gate still required before external Creator launch

External launch remains blocked until the legacy project's broad `authenticated` / public RPC surface is audited and hardened. PCI's own private boundary does not make unrelated legacy RPCs safe automatically.

## Next technical block

**FASE 1J — Atomic offer acceptance + Purchase + Payable + Rights Pending**

Target slice:

`Creator accepts exact live Protocol offer → one PostgreSQL transaction creates the commercial purchase commitment and debt → Creator confirms payment destination → payment remains pending → commercial rights remain inactive until confirmed payment.`

Payment transfer execution, rights activation and Creative Asset promotion continue after the purchase-acceptance layer is stable.

Meta Ads execution remains explicitly out of scope.