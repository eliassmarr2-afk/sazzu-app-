# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-18  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1L — Rights activation + Creative Asset provisioning — CODE COMPLETE / RUNTIME UNVALIDATED**

The implemented vertical slice now covers the first complete commercial lifecycle:

`Consignment → Creator submission/version → private signed upload → review/revisions → preselection → rights declaration/clearance → negotiation → immutable formal offer/counteroffer → atomic offer acceptance → Purchase agreed + base Payable + Rights Grant pending_payment → Creator confirms payment destination → external manual payout → payout confirmed → Payable paid → Rights Grant active → Creative Asset provisioning → outbox promote_asset → internal worker server-side Storage copy → Creative Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## 1L commercial boundary

Payment confirmation and file promotion are deliberately different operations.

When the **base Payable becomes `paid`**, PostgreSQL synchronously validates the exact Purchase, offer, Creator/workspace ownership, current preselected version, rights clearance and frozen version SHA-256. Inside the same financial transaction it then:

1. changes each Rights Grant `pending_payment → active`;
2. creates one Creative Asset per exact purchased version with status `provisioning`;
3. reserves a deterministic private target path under `pci-assets`;
4. creates one `promote_asset` outbox job per Creative Asset;
5. writes append-only rights/asset events.

If this commercial activation fails, the transaction that attempted to make the Payable paid also fails. PCI cannot commit a fully paid base purchase while leaving its required rights objects half-created.

At this stage:

- payment confirmed: **yes**
- Protocol debt fulfilled: **yes**
- commercial rights active: **yes**
- source submission still immutable: **yes**
- Creative Asset operationally available: **not yet**
- Purchase settled: **not yet**

The Storage copy is intentionally outside that database transaction.

## Exact-version / hash rule

The acquired identity remains tied to:

- exact `submission_version_id`;
- exact immutable source Storage path;
- exact frozen SHA-256 stored on the version;
- the same SHA-256 snapshot stored on the Rights Grant;
- the same SHA-256 snapshot stored on the Creative Asset.

The worker does **not** claim to recompute SHA-256 over the full promoted MP4. The hash originally frozen for the immutable version remains the commercial fingerprint. Promotion verifies the exact source/destination identity plus object size and MIME around a Supabase server-side copy.

This distinction is intentional: do not label promotion metadata as a newly computed cryptographic checksum.

## Creative Asset lifecycle

Current operational state flow:

`provisioning → available`

Failure path:

`provisioning → failed`

Explicit operator recovery:

`failed → provisioning`

Future lifecycle remains available for rights incidents/use controls:

`available → restricted / retired`

`restricted → available / retired`

Creative Asset identity is immutable after creation:

- workspace / Creator / Purchase / Rights Grant;
- source Submission / exact source version;
- target bucket/path;
- frozen SHA-256;
- creation timestamp.

Only lifecycle metadata/state may evolve through commands.

## `pci-worker`

New internal Edge Function:

`supabase/functions/pci-worker/index.ts`

This is **not** a Creator or Protocol browser API.

Deployment model:

- route: `POST /v1/run`;
- no user JWT contract;
- expected deployment with gateway JWT verification disabled;
- mandatory internal header `x-pci-worker-secret`;
- required Edge secret: `PCI_WORKER_SECRET`;
- service role remains server-side only;
- no permissive browser CORS surface;
- default one job per run, optional `max_jobs` capped at 5.

### Claim

`worker_claim_promote_asset()`:

- selects only `promote_asset` outbox jobs;
- uses `FOR UPDATE SKIP LOCKED`;
- one worker owns a job at a time;
- increments the attempt counter for a new attempt;
- returns the exact immutable source/destination context;
- validates Rights Grant active and exact source version/hash before Storage is touched.

### Crash recovery

A `processing` lock older than 15 minutes is considered stale and can be reclaimed.

A stale fifth attempt may also be reclaimed. This is necessary for the case where Storage copied the object but the worker died before recording completion.

On reclaim, the worker first inspects the destination. If the exact destination already exists with the expected size/MIME, it does **not** overwrite it; it resumes completion idempotently.

### Storage copy

The worker performs a Supabase server-side cross-bucket copy:

`pci-submissions/{exact source}`

→

`pci-assets/workspace/{workspace}/purchase/{purchase}/asset/{asset}/original.{ext}`

No MP4 is downloaded into Edge memory for copy or hashing.

Before completion the worker requires:

- source object exists;
- source size equals frozen version size;
- source MIME equals frozen version MIME;
- destination object exists after copy;
- destination size equals source/frozen size;
- destination MIME equals source/frozen MIME;
- database source SHA snapshot still equals Creative Asset SHA snapshot.

The worker records verification metadata such as source/destination object IDs, sizes, MIME and whether an already-existing destination was safely reused.

### Retry policy

Automatic retry: maximum 5 attempts with exponential delay.

After the fifth failed attempt:

- outbox remains failed/exhausted;
- Creative Asset becomes `failed`;
- no duplicate Creative Asset is created;
- Purchase remains `agreed`;
- Submission remains `preselected`;
- Rights remain legally `active` because payment did occur.

`admin_retry_asset_promotion()` provides an explicit recovery command. It revalidates:

- active Protocol workspace member;
- same failed Creative Asset;
- Rights active;
- Purchase still agreed;
- base Payable paid;
- same failed promote_asset outbox row.

It then resets that same job and asset for another controlled retry. History is preserved.

## Successful promotion and settlement

`worker_complete_asset_promotion()` marks the exact Creative Asset `available` only after object verification.

When **all** Creative Assets belonging to the Purchase are available in the same transaction:

1. source Submissions move `preselected → acquired`;
2. `acquired_at` is recorded;
3. Purchase moves `agreed → settled`;
4. `settled_at` is recorded;
5. append-only events are written;
6. a Creator settlement notification is queued in outbox.

No individual asset can settle a multi-item Purchase while another asset remains provisioning or failed.

## COMMIT-time integrity added in 1L

Deferred constraints now enforce the commercial chain at COMMIT.

### Active Rights Grant

An active Rights Grant requires:

- base Payable `paid` with `paid_at`;
- matching Creative Asset;
- matching Purchase/workspace/Creator;
- exact same `submission_version_id`;
- exact same frozen SHA-256;
- source version still `ready`;
- source rights clearance still `complete`.

### Operational Creative Asset

A `provisioning` or `available` asset requires active rights.

Every asset must reference the exact current source version/submission and use the canonical `pci-assets` target namespace.

An `available` asset additionally requires:

- `provisioned_at`;
- completed promotion verification metadata.

### Settled Purchase

The transition to `settled` requires, at that moment:

- base Payable paid;
- at least one Rights Grant;
- **all** Rights Grants active;
- exactly one corresponding Creative Asset per grant;
- **all** assets available;
- all associated Submissions acquired.

Later lifecycle controls such as restricting an asset due to a dispute do not retroactively erase that the Purchase was settled.

### Acquired Submission

A Submission can commit as `acquired` only when its exact current version has an available Creative Asset belonging to a settled Purchase.

## Library / visibility models

`pci_api.admin_library()` now exists as the canonical Protocol Library projection.

It is sourced only from `pci.creative_assets`. A rejected, preselected-but-unpaid or otherwise unacquired submission can never enter this projection merely because a file exists in Storage.

The Library projection contains operational/commercial metadata such as:

- Creative Asset status;
- Purchase state/value;
- Rights state/package;
- Creator identity;
- source Submission/version;
- original filename/MIME/size/duration/dimensions;
- frozen SHA-256.

Private Storage path is deliberately not included in the normal Library list.

`pci_api.admin_asset_playback_context()` exists for a future short-lived playback route and only returns context for `available` assets with active rights.

`pci_api.creator_acquired_assets()` provides a Creator-safe view without private Storage paths.

In addition, the already-existing Creator/Admin **purchase endpoints** now include safe Creative Asset state (`provisioning`, `available`, `failed`, etc.), so 1L progress is visible through existing API routes even before the dedicated Library screen is wired.

## Edge Functions represented in Git

### `pci-creator-api`

JWT-required human API. Existing routes cover:

- opportunities and participation;
- submission creation/detail;
- signed TUS version upload/finalization;
- rights declarations;
- negotiation/messages;
- formal offer reject/counter/accept;
- payment accounts;
- payables/purchases/payouts;
- Creator payout-proof access.

Existing `GET /v1/purchases` now receives the enriched Purchase projection containing safe Creative Asset status through the database read model.

### `pci-admin-api`

JWT-required Protocol API. Existing routes cover:

- review queue/review decisions/internal notes;
- source playback;
- rights clearance;
- negotiation/formal offers;
- purchase/payable queues;
- explicit payment execution context;
- payout proof upload;
- payout register/confirm/fail/reverse;
- payout proof playback.

Existing `GET /v1/workspaces/:workspace_id/purchases` now receives the enriched asset state through the database read model.

Dedicated `admin_library` / acquired-asset playback read models are prepared at the database API layer; browser route wiring remains intentionally separate from the commercial-state engine and can be added when the Marketing/Library UI is constructed.

### `pci-worker`

Internal machine-only worker described above. It should be deployed separately from human APIs and authenticated with `PCI_WORKER_SECRET`.

## Migrations implemented through 1L

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

Migration 037 intentionally replaces the first cross-table active-rights trigger implementation from 036 with a table-safe Purchase-scoped implementation before any PCI runtime data exists.

## Required deployment configuration — do not apply to production yet

Before Edge Functions can invoke `pci_api` through PostgREST, `pci_api` must be included in the project's exposed API schemas. The authoritative `pci` schema remains private and no direct `anon/authenticated` grants are introduced.

Human functions:

- `pci-creator-api`: JWT verification enabled;
- `pci-admin-api`: JWT verification enabled.

Machine function:

- `pci-worker`: expected JWT gateway verification disabled and mandatory `PCI_WORKER_SECRET` checked inside the function.

Expected Edge configuration/secrets:

- `PCI_CREATOR_ALLOWED_ORIGINS`
- `PCI_ADMIN_ALLOWED_ORIGINS`
- `PCI_PAYMENT_DATA_KEY`
- `PCI_WORKER_SECRET`
- normal Supabase Edge-provided server secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

`pci-worker` is **not scheduled in production** at this checkpoint. A future scheduler should keep its invocation secret in Vault rather than inline SQL/cron text.

No production configuration is changed at this checkpoint.

## Validation status

The code is versioned in Git but migrations/functions have **not** been executed against a disposable Supabase environment. SQL/runtime integration is therefore still unvalidated.

This checkpoint includes connected-repository static review and several corrections found during that review (settlement locking, cross-table trigger shape, stale fifth-attempt recovery and strict MIME metadata verification). This is not a substitute for executing the migration chain in PostgreSQL and exercising real Supabase Storage.

A paid Supabase development branch remains deliberately deferred by product decision. Before any real Creator session, create a temporary branch, apply the complete migration chain, deploy the three Edge Functions with test secrets, and execute state-transition/idempotency/Storage/encryption/authorization/adversarial tests before deleting the branch.

## Security gate still required before external Creator launch

External launch remains blocked until the legacy project's broad `authenticated` / public RPC surface is audited and hardened. PCI's private boundary does not automatically make unrelated legacy RPCs safe for newly authenticated external Creators.

## Next technical block

**FASE 1M — Creator onboarding + invitation/Auth bootstrap**

Target slice:

`Protocol creates/invites Creator → single-use invitation → Creator authenticates with Supabase Auth → invitation/link validation → auth.users.id binds to existing pci.creator_id → workspace_creator becomes active → legal acceptance recorded → Creator lands in PCI with only the intended workspace relationship.`

The goal is to remove the remaining bootstrap assumption that a Creator/Auth link already exists before the flow starts.

Notifications/outbox delivery beyond asset promotion, dedicated Library UI route wiring, disputes and the final external security/runtime gate follow after onboarding is stable.

Meta Ads execution remains explicitly out of scope.