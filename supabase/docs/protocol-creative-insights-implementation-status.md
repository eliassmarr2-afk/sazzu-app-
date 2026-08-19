# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase development branch:** NOT CREATED  
**Disposable runtime:** `protocol-creative-insights-runtime-test` (`dgpmdqmdwqyiwhkbiakd`)

## Current technical phase

**FASE 1O — IN PROGRESS / DB + STORAGE + DATA API + AUTHORIZATION AUDIT VALIDATED / EDGE RUNTIME PENDING**

Phase 1N Creator Portal is code-complete. Phase 1O is now validating the complete architecture against an isolated real Supabase runtime.

No PCI migration, Auth setting, Edge Function, Storage policy or Creator Portal configuration has been applied to production.

## Runtime checkpoint

The disposable Free Supabase project now proves:

- PCI migrations `001–055` compile/apply sequentially on managed PostgreSQL;
- private Storage bucket definitions are accepted by managed Supabase Storage;
- PCI direct browser grants remain closed;
- PostgREST can expose only the service-only `pci_api` schema while authoritative `pci` remains private;
- Security Advisor has **0 ERROR** after test-fixture hardening;
- two runtime-discovered authorization gaps were fixed through migrations `056–057` and verified behaviorally;
- Creator A/B object isolation and workspace relationship state enforcement pass rollback-only adversarial tests.

Detailed evidence:

`supabase/docs/pci-phase-1o-runtime-validation-results.md`

## Complete lifecycle represented in code/runtime schema

```text
Protocol creates/invites Creator
  → Supabase Auth
  → PCI invitation bootstrap
  → exact legal acceptance
  → Creator/workspace ACTIVE
  → Opportunity / exact Brief
  → Participation
  → Submission DRAFT
  → immutable V1/V2
  → private signed TUS upload + finalize
  → creative Review / revisions
  → Creator rights declaration
  → Protocol Rights Clearance
  → preselection
  → negotiation/messages
  → immutable Formal Offer / counteroffer
  → atomic offer acceptance
  → Purchase AGREED
  → base Payable AWAITING_CONFIRMATION
  → Rights PENDING_PAYMENT
  → Creator confirms exact payment destination
  → READY_TO_PAY
  → Protocol manual payout
  → partial/full payout ledger + proof
  → Payable PAID
  → Rights ACTIVE
  → Creative Asset PROVISIONING
  → internal worker Storage copy
  → Creative Asset AVAILABLE
  → Submission ACQUIRED
  → Purchase SETTLED
```

Meta Ads execution remains out of scope.

## Frozen architecture boundary

- `pci` = private authoritative domain schema.
- `pci_api` = minimal service-role-only RPC surface.
- `pci` is not exposed through PostgREST.
- `pci_api` is known to PostgREST so Edge Functions can call `.schema("pci_api").rpc(...)`.
- `anon` / `authenticated` have no direct PCI business-table DML or PCI function EXECUTE.
- Browser never receives `service_role`.
- Creator identity derives from Supabase Auth server-side.
- Auth is not authorization.
- Creator is an external counterparty and never a `protocol_workspace_member`.
- Browser route guards are UX/defense-in-depth only.
- exact Brief revision, READY Version, Review evidence, Rights evidence, Formal Offers, Purchases, payment destinations and Payout evidence preserve immutable/append-only semantics where required.

## Authorization model after runtime audit

### Protocol internal plane — migration 056

Runtime audit found that active workspace membership alone was previously sufficient for the common PCI operator guard, making `owner/admin/analyst/viewer` equivalent.

Pilot rule is now fail-closed:

```text
owner  ACTIVE → allowed
admin  ACTIVE → allowed
analyst ACTIVE → denied
viewer  ACTIVE → denied
```

This is enforced centrally by `pci.require_active_workspace_member()`.

Fine-grained analyst/viewer reads may be designed later as explicit least-privilege read surfaces; they do not inherit sensitive command access.

### Creator workspace plane — migration 057

Runtime audit also found that global Creator `active` status alone could not express per-workspace restriction/suspension.

Frozen relationship rule:

```text
workspace_creator active     → read/write
workspace_creator restricted → read-only
workspace_creator invited    → onboarding only; no business-resource access
workspace_creator suspended  → no business-resource access
workspace_creator closed     → no business-resource access
```

Twenty mature workspace-scoped Creator implementations now live behind private `pci.*_core_1o` functions. Their `pci_api` names are authorization wrappers that either:

- filter list items by workspace relationship; or
- resolve the exact resource workspace and enforce read/write mode before delegating.

## Adversarial authorization evidence

Rollback-only tests on the disposable runtime verified:

### Protocol roles

- owner admin-RPC access → pass;
- admin admin-RPC access → pass;
- analyst admin-RPC access → denied;
- viewer admin-RPC access → denied.

### Creator relationship matrix

- active read/write → pass;
- restricted read → pass;
- restricted write → denied;
- invited read → denied;
- suspended read → denied;
- closed read → denied.

### Creator A/B BOLA

Two synthetic Creators with separate Submissions under the same workspace were tested through the real public Creator RPC:

- A → own Submission → pass;
- A → B Submission ID → blocked;
- B → A Submission ID → blocked;
- restricted Creator can still read own resource but cannot reserve a new Version;
- suspended workspace relationship blocks own business-resource read even while global Creator remains active.

Synthetic rows were rolled back and do not persist.

## Database / Storage audit

### PCI database

- 29/29 PCI tables: RLS enabled;
- direct `anon` DML: 0;
- direct `authenticated` DML: 0;
- direct PCI function EXECUTE for `anon/authenticated`: 0;
- PCI `SECURITY DEFINER` functions: 0;
- explicit empty function `search_path` retained;
- backend service-role access remains available.

`RLS Enabled No Policy` Security Advisor entries are intentional INFO: the architecture is deny-all direct access plus service-mediated RPCs.

### Storage

Private buckets:

- `pci-submissions`;
- `pci-rights-documents`;
- `pci-assets`;
- `pci-payout-proofs`;
- `pci-message-attachments`.

All are private with expected size/MIME constraints. No broad `storage.objects` policy was found.

### Data API

Disposable runtime explicitly exposes:

```text
public, graphql_public, pci_api
```

through `pgrst.db_schemas`.

`pci` remains unexposed. Exposing `pci_api` to routing does not grant browser access because `anon/authenticated` still lack schema USAGE and function EXECUTE.

## Security Advisor

Latest disposable-runtime result:

- **ERROR: 0**
- remaining findings: INFO-only `rls_enabled_no_policy` on intentionally deny-all tables.

The test-only public Protocol fixture was also hardened with RLS + revoked anon/authenticated privileges so it no longer creates false security errors.

## Performance Advisor

Current findings are INFO-only, mainly:

- foreign keys without dedicated indexes;
- indexes unused in an empty/no-traffic runtime.

Do not mass-create indexes from this signal. Use representative seeded data and `EXPLAIN (ANALYZE, BUFFERS)` on hot paths before adding indexes.

## Creator Portal status

Phase 1N remains code-complete, including:

- responsive Dashboard;
- invitation/Auth/legal onboarding;
- Opportunities + exact frozen Brief;
- Mis trabajos + immutable V1/V2 + TUS/finalize UX;
- rights declaration/clearance UX;
- conversations + Formal Offer/counter/accept UX;
- payments + immutable destination + partial/full payout ledger;
- returning Magic Link login;
- shared route/session guard;
- Mi Cuenta;
- mobile/accessibility consistency.

`creator-portal/config.js` remains `demoMode:true` until runtime APIs are fully validated.

## Edge Function status

Expected surfaces:

- `pci-admin-api`;
- `pci-creator-api`;
- `pci-onboarding-api`;
- `pci-worker`.

Static audit confirms the intended controls:

- human APIs validate Bearer identity through Supabase Auth;
- CORS uses allowlists rather than wildcard origins;
- Creator identity is server-derived;
- errors are normalized;
- worker uses independent secret authentication with constant-time comparison;
- no obvious sensitive-token logging was found.

The disposable runtime currently has **no PCI Edge Functions deployed**.

Deployment remains pending because the available automated Supabase connector does not expose secret-management operations for required values such as:

- `PCI_PAYMENT_DATA_KEY`;
- `PCI_CREATOR_ALLOWED_ORIGINS`;
- `PCI_ADMIN_ALLOWED_ORIGINS`;
- `PCI_CREATOR_APP_URL`;
- `PCI_INVITATION_TOKEN_KEY`;
- `PCI_ONBOARDING_ALLOWED_ORIGINS`;
- `PCI_WORKER_SECRET`.

Do not deploy deliberately misconfigured Functions merely to claim runtime progress.

## Phase 1O remaining validation

Still unproven:

### Edge/Auth

- Edge Function boot/runtime/CORS/JWT after secrets are configured;
- invitation email behavior;
- returning Magic Link callback allowlist/session restore;
- unknown-user `shouldCreateUser:false` behavior.

### Media

- signed TUS upload against real private Storage;
- resume/retry/mobile/full-browser-loss behavior;
- backend finalize verification against actual object metadata.

### Review / rights / commerce

- complete V1/V2 transition path with seeded entities;
- rights invalid/valid/resubmit/flag/complete/lock;
- message idempotency;
- offer expiry/supersession;
- counteroffer snapshot preservation;
- atomic accept duplicate/lost-response behavior.

### Payments / assets

- AES-GCM encrypt/decrypt path;
- payment account reconfirmation;
- partial/full/failed/reversed Payout behavior;
- proof signed URL ownership/expiry;
- PAID → Rights ACTIVE transaction;
- worker Storage copy/retry;
- Asset AVAILABLE → Submission ACQUIRED → Purchase SETTLED.

### Portal

- `demoMode:false` desktop/mobile end-to-end behavior.

## Creator Security Gate before any pilot

No external Creator pilot until:

1. the disposable runtime completes the above flow;
2. the legacy production public/authenticated Supabase surface is audited safely;
3. externally exposed schemas/RPCs are explicitly allowlisted;
4. PCI Storage and Creator A/B/Protocol boundaries remain adversarially proven;
5. a controlled rollout receives explicit production approval.

Do not blindly harden the legacy production project.

## Next technical movement

**Continue Phase 1O.**

The database/security boundary is now materially validated. The next runtime blocker is Edge deployment with the required custom secrets. Until a safe secret-configuration path is available, the productive work is to preserve the adversarial SQL tests as repeatable fixtures and prepare the exact Edge/Auth/TUS test sequence rather than touching production.
