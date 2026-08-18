# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-18  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1M — Creator onboarding + invitation/Auth bootstrap — CODE COMPLETE / RUNTIME UNVALIDATED**

The first complete PCI business lifecycle is represented in code:

`Protocol invitation → Supabase Auth → Creator identity bootstrap → exact versioned legal acceptance → workspace relationship active → Consignment → Creator submission/version → private signed upload → review/revisions → preselection → rights declaration/clearance → negotiation → immutable formal offer/counteroffer → atomic acceptance → Purchase + base Payable + Rights pending_payment → payment destination confirmation → external manual payout → Payable paid → Rights active → Creative Asset provisioning → outbox/worker server-side Storage copy → Creative Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## Architectural boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` and `authenticated` have no direct PCI business-table/function grants.
- Browser clients never receive `service_role`.
- Creator business identity is derived server-side from Supabase Auth.
- A valid Auth session is authentication only; it is not PCI authorization.
- Business commands require an active Creator and the appropriate active `workspace_creators` relationship.
- Commercial history, versions, reviews, offers, purchases, legal acceptances, payout allocations and events are preserved as immutable/append-only evidence where required.

## Human/API surfaces

### `pci-admin-api`

Internal Protocol business API. Covers review, rights clearance, negotiation, formal offers, payment operations, playback and purchased-asset/library contexts.

### `pci-creator-api`

External Creator business API. Covers opportunities, submissions, signed TUS upload/finalization, rights declaration, negotiation, offer response, payment-account confirmation and payout visibility.

This API remains gated by active Creator/business relationship state.

### `pci-onboarding-api`

Phase 1M identity/bootstrap boundary only. It does not expose commercial commands.

It handles:

- operator publication of versioned Creator legal documents;
- operator Creator invitations;
- Supabase Auth invite / existing-user Magic Link delivery;
- Creator Auth-to-PCI identity bootstrap;
- exact legal-document acceptance;
- relationship activation;
- invitation listing/revocation and onboarding-state reads.

It is intentionally separate so that `pci-creator-api` does not need to weaken `require_active_creator()` for users who have authenticated but have not yet accepted the required commercial/legal terms.

### `pci-worker`

Internal machine surface for non-transactional side effects, currently Creative Asset promotion. It is not a human portal API.

## Phase 1M onboarding lifecycle

```text
Protocol operator
  ↓
publish exact legal-document versions
  ↓
create Creator invitation
  ↓
Creator + workspace_creator INVITED
  ↓
PCI stores only invitation token SHA-256
  ↓
Supabase Auth sends invite or existing-user Magic Link
  ↓
Creator authenticates
  ↓
pci-onboarding-api derives authenticated user id/email
  ↓
Creator submits raw PCI invitation token
  ↓
backend hashes and validates exact invitation
  ↓
auth.users.id linked to pci.creator_id
  ↓
invitation ACCEPTED
workspace_creator still INVITED
  ↓
Creator accepts exact legal IDs/versions/hashes frozen by invitation
  ↓
all required documents accepted
  ↓
Creator ACTIVE (when previously pending)
workspace_creator ACTIVE
  ↓
normal pci-creator-api business access becomes eligible
```

## Invitation token design

The raw PCI invitation token is never stored in PostgreSQL.

`pci-onboarding-api` derives a deterministic high-entropy token with HMAC-SHA256 using:

- `PCI_INVITATION_TOKEN_KEY`;
- workspace ID;
- normalized invited email;
- operator `Idempotency-Key`.

PostgreSQL stores only SHA-256 of that raw token.

Why deterministic: if the database commit succeeds but an HTTP response is lost, retrying the same command with the same idempotency key regenerates the same invitation token instead of orphaning the stored invitation.

A new idempotency key generates a different token/invitation.

Token/hash and Auth snapshots are guarded by database invariants. A token may return the same already-accepted onboarding context to the same authenticated actor as an idempotent replay, but it cannot bind another authenticated user after acceptance.

## New vs existing Auth users

For a Creator without an existing PCI-linked Auth user:

`supabase.auth.admin.inviteUserByEmail(email, { redirectTo })`

is the intended delivery mechanism.

For a Creator already linked to Supabase Auth but being onboarded to another workspace:

`signInWithOtp({ email, options: { shouldCreateUser:false, emailRedirectTo } })`

is used so that the invitation cannot silently self-create another Auth identity.

PCI authorization never trusts `user_metadata`.

## Versioned legal evidence

New private table:

`pci.creator_legal_documents`

Each published document records:

- workspace;
- document type;
- exact version;
- title;
- SHA-256 of the exact legal artifact/text;
- content reference;
- whether it is required for Creator activation;
- publication/lifecycle timestamps.

A published legal document is an immutable contractual snapshot.

Each Creator invitation snapshots the exact set of required legal document IDs/versions/hashes. Publishing a newer legal version later does not rewrite an existing invitation.

`pci.creator_legal_acceptances` is append-only evidence and is now workspace/document scoped.

PCI intentionally contains **no fabricated production legal text**. Actual Creator terms must be reviewed/published before a real invitation.

## Activation invariants

At COMMIT:

- an accepted invitation must have Auth identity + delivery timestamps;
- invitation Creator/email/workspace relationship must match its snapshots;
- invitation legal-requirements snapshot must be nonempty;
- only one pending invitation may exist per workspace relationship;
- a relationship already in accepted/bootstrap-pending-legal state cannot receive a parallel invitation;
- `workspace_creator → active` requires an accepted invitation and acceptance of every exact required legal snapshot;
- legal acceptance cannot be edited or deleted afterward.

Therefore a valid Supabase session alone cannot create business access.

## Invitation lifecycle

```text
pending → accepted
pending → revoked
pending → expired
```

No other status transition is valid.

Delivery metadata is separately tracked as `pending / sent / failed`.

Operator revocation is explicit and audited.

Expiration is enforced synchronously by the timestamp during bootstrap. The helper `worker_expire_creator_invitations()` materializes stale pending rows as `expired` for operational visibility; it is intentionally not wired to a production schedule yet.

## Email/Auth deployment gate

Before a real Creator invite, the disposable/pilot environment must configure:

- Auth Additional Redirect URL for `PCI_CREATOR_APP_URL`;
- branded Invite and Magic Link templates;
- custom SMTP before external pilot use;
- click-tracking/link-rewriting disabled for Auth email;
- email-prefetch-safe confirmation flow that requires explicit human action before consuming the Supabase Auth verification token.

The Creator frontend must immediately remove the raw PCI invitation token from the visible URL and must not persist it to `localStorage`, analytics or logs.

Detailed requirements and adversarial test cases are versioned at:

`supabase/docs/pci-creator-onboarding-deployment-and-test-gate.md`

## Phase 1M Edge configuration

`pci-onboarding-api` must deploy with JWT verification enabled.

Required environment configuration:

- `PCI_CREATOR_APP_URL`
- `PCI_INVITATION_TOKEN_KEY`
- `PCI_ONBOARDING_ALLOWED_ORIGINS`
- standard Supabase Edge secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

Existing configuration remains required for the other PCI functions:

- `PCI_CREATOR_ALLOWED_ORIGINS`
- `PCI_ADMIN_ALLOWED_ORIGINS`
- `PCI_PAYMENT_DATA_KEY`
- `PCI_WORKER_SECRET`

No production secret/configuration has been changed.

## Commercial lifecycle retained from 1G–1L

### Creator media

- signed private upload reservation;
- resumable TUS upload;
- no upsert/overwrite;
- immutable V1/V2/etc source versions;
- exact SHA-256 snapshot;
- technical invalidity separate from creative rejection.

### Review

- explicit review commands;
- changes requested / preselection / rejection;
- Creator feedback physically separated from internal notes;
- revision-round limits frozen from the accepted brief.

### Negotiation/offers

- contextual chat is not contractual;
- one open negotiation per submission;
- one live offer per negotiation;
- immutable formal offer chain;
- exact preselected version/hash and rights/payment snapshots.

### Acceptance

Offer acceptance atomically creates:

- accepted offer;
- Purchase agreed;
- base Payable awaiting confirmation;
- exact Rights Grant(s) pending payment;
- closed negotiation;
- events/idempotency evidence.

### Payout ledger

- external transfer represented by `pci.payouts`;
- exact obligation linkage via `pci.payout_allocations`;
- partial payment support;
- confirmed money only counts as paid;
- duplicate real-world payment reference protection;
- no overpayment/overallocation;
- payment destination is snapshotted per obligation;
- sensitive account identifiers encrypted before PostgreSQL.

### Rights + Creative Assets

When the base Payable becomes paid, the same commercial transaction validates exact Purchase/version/hash/clearance and creates:

- Rights Grant `active`;
- Creative Asset `provisioning`;
- deterministic target path in private `pci-assets`;
- `promote_asset` outbox job.

`pci-worker` later performs server-side Storage copy from `pci-submissions` to `pci-assets` and verifies source/destination identity, size and MIME. It does **not** claim to recompute SHA-256 over the full MP4; the SHA-256 frozen on the immutable source version remains the commercial fingerprint and must match Version → Rights Grant → Creative Asset snapshots.

Only after successful provisioning:

- Creative Asset becomes `available`;
- Submission becomes `acquired`;
- Purchase becomes `settled` when all purchased assets are available.

## Storage boundaries

Private buckets remain:

- `pci-submissions`
- `pci-rights-documents`
- `pci-assets`
- `pci-payout-proofs`
- `pci-message-attachments`

Unpurchased submissions never become Library assets by merely existing in Storage.

## Migrations implemented through Phase 1M

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
34. `20260818_034_pci_rights_activation_asset_provisioning.sql`
35. `20260818_035_pci_asset_promotion_worker_commands.sql`
36. `20260818_036_pci_asset_integrity_and_library_read_models.sql`
37. `20260818_037_pci_active_rights_integrity_trigger_fix.sql`
38. `20260818_038_pci_asset_worker_stale_lock_recovery.sql`
39. `20260818_039_pci_asset_settlement_and_manual_retry_hardening.sql`
40. `20260818_040_pci_purchase_asset_visibility.sql`
41. `20260818_041_pci_creator_onboarding_and_legal_bootstrap.sql`
42. `20260818_042_pci_creator_onboarding_invariants.sql`
43. `20260818_043_pci_creator_invitation_delivery_and_revocation.sql`
44. `20260818_044_pci_creator_invitation_concurrency_guards.sql`
45. `20260818_045_pci_creator_bootstrap_expiry_semantics.sql`
46. `20260818_046_pci_creator_invitation_auth_snapshot_hardening.sql`

## Validation status

All PCI work is versioned in Git only.

Migrations and Edge Functions have **not** been executed against a disposable Supabase environment. SQL/runtime/Auth/Storage integration therefore remains unvalidated.

The paid Supabase development branch remains deliberately deferred. Before a real Creator session we must create a temporary branch, apply all PCI migrations/functions, run database advisors and state-transition/idempotency/Auth/Storage/encryption/BOLA/adversarial tests, then delete that branch.

The Phase 1M mandatory onboarding test matrix is documented separately and includes new/existing Auth user flows, wrong-email attacks, cross-workspace attempts, token replay, lost-response idempotency, expiration/revocation, email delivery failure, legal-version freezing and secret-leak inspection.

## Security gate still required before external Creator launch

External launch remains blocked until the legacy production project's broad public / `authenticated` RPC surface is audited and hardened. PCI's private boundary does not make unrelated legacy functions safe automatically.

No Creator pilot should begin before that gate and disposable-runtime validation pass.

## Next technical block

**FASE 1N — Creator Portal frontend foundation + Auth/onboarding UX**

Target slice:

`Invite email → Creator portal Auth callback → safe invitation-token handling → onboarding state → exact legal acceptance UI → activated Creator shell → Opportunities → My submissions → Submission detail/upload → Negotiation → Payments.`

The frontend must use a Supabase publishable key and the PCI Edge APIs only; no service-role access and no direct commercial table writes.

Before implementing the final visual UI, establish/approve the Creator Portal screen contract and visual concept, then code against the already-versioned API surface.
