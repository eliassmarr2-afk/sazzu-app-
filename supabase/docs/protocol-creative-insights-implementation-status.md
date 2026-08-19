# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase development branch:** NOT CREATED  
**Disposable runtime:** `protocol-creative-insights-runtime-test` (`dgpmdqmdwqyiwhkbiakd`)

## Current technical phase

**FASE 1O — IN PROGRESS / DB + STORAGE + DATA API + AUTHORIZATION + HUMAN EDGE BOOT + CORE COMMERCIAL LIFECYCLE VALIDATED**

Phase 1N Creator Portal remains code-complete. Phase 1O is validating the complete PCI architecture against an isolated second Free Supabase project.

Production project `cuuzsbhpjmjbbnghtiny` remains untouched. No PCI migration, Edge Function, Auth setting, Storage policy, secret or Creator Portal configuration from 1O has been applied to production.

## Runtime checkpoint

The disposable runtime now proves:

- PCI migrations `001–055` compile/apply sequentially on managed PostgreSQL;
- runtime hardenings `056–059` discovered through adversarial/behavioral tests are applied;
- 29/29 PCI business tables have RLS enabled;
- direct `anon` / `authenticated` PCI DML and function EXECUTE remain zero;
- authoritative `pci` stays private while `pci_api` is the service-role RPC surface known to PostgREST;
- five PCI Storage buckets exist privately with intended size/MIME restrictions and no broad client policy;
- Security Advisor currently reports **0 WARN / 0 ERROR**; INFO-only deny-all RLS notices remain intentional;
- Protocol role authorization and Creator workspace authorization/BOLA have passed runtime tests;
- `pci-creator-api`, `pci-admin-api` and `pci-onboarding-api` are deployed `ACTIVE` with `verify_jwt:true`;
- real unauthenticated HTTP requests to all three are rejected at the Edge gateway with HTTP 401;
- the atomic Offer → Purchase/Payable/Rights lifecycle passes with deferred constraints forced;
- full Payout → Payable PAID → Rights ACTIVE → Creative Asset PROVISIONING passes;
- worker DB claim/complete → Asset AVAILABLE → Submission ACQUIRED → Purchase SETTLED passes;
- all synthetic lifecycle rows are removed by rollback.

Detailed evidence:

`supabase/docs/pci-phase-1o-runtime-validation-results.md`

## Runtime-discovered hardenings

### 056 — Protocol operator role gate

The common operator guard originally treated every active `protocol_workspace_member` role equivalently.

Pilot policy is now fail-closed:

```text
owner   ACTIVE → allowed
admin   ACTIVE → allowed
analyst ACTIVE → denied
viewer  ACTIVE → denied
```

Behavioral result:

`protocol_operator_role_matrix_passed`

### 057 — Creator workspace relationship gate

Global Creator `active` status was insufficient to authorize each workspace independently.

Frozen relationship policy:

```text
workspace_creator active     → read/write
workspace_creator restricted → read-only
workspace_creator invited    → onboarding only
workspace_creator suspended  → no business-resource access
workspace_creator closed     → no business-resource access
```

Twenty mature workspace-scoped Creator implementations now sit behind private `pci.*_core_1o` functions while the same `pci_api` names act as authorization wrappers.

Behavioral results:

- `creator_workspace_gate_matrix_passed`
- `creator_rpc_bola_and_relationship_state_passed`

### 058–059 — deferred Payable financial-integrity trigger

The first complete payment lifecycle with `SET CONSTRAINTS ALL IMMEDIATE` exposed a bug that SQL compilation could not detect.

`pci.assert_payable_financial_integrity()` is shared by triggers on:

- `pci.payables`;
- `pci.payout_allocations`;
- `pci.payouts`.

The original function assumed every trigger row had `NEW/OLD.payable_id`, while `pci.payouts` reaches Payables through allocations.

`058` introduced source-table dispatch. The immediate rerun exposed a PostgreSQL shared-RECORD subtlety: static `NEW/OLD` field references are resolved against the physical trigger row type even when they sit in an unselected CASE branch.

`059` is the final polymorphic-safe implementation:

- converts `NEW/OLD` to JSONB first;
- extracts identifiers by key;
- resolves direct Payables for `payables/payout_allocations`;
- resolves all affected Payables through allocations for `payouts`;
- preserves overpaid, overallocated, paid-underfunded and processing-without-inflight rules.

The identical end-to-end payment test then passed with all deferred constraints forced immediately.

## Authorization / BOLA evidence

Rollback-only runtime tests verified:

### Protocol

- owner admin RPC → allowed;
- admin admin RPC → allowed;
- analyst admin RPC → denied;
- viewer admin RPC → denied.

### Creator

- active read/write → allowed;
- restricted read → allowed;
- restricted write → denied;
- invited/suspended/closed read → denied;
- Creator A → A Submission → allowed;
- Creator A → B Submission → blocked;
- Creator B → A Submission → blocked;
- globally-active Creator with suspended workspace relationship → business-resource read blocked.

## Database / Data API / Storage boundary

### Database

- 29/29 PCI tables: RLS enabled;
- `anon` direct DML: 0;
- `authenticated` direct DML: 0;
- direct PCI function EXECUTE for `anon/authenticated`: 0;
- PCI `SECURITY DEFINER`: 0;
- explicit empty `search_path` retained;
- service-role backend access remains available.

### PostgREST

Disposable runtime explicitly exposes:

```text
public, graphql_public, pci_api
```

`pci` remains outside the Data API. `pci_api` routing does not grant browser authorization because `anon/authenticated` lack schema USAGE and function EXECUTE.

### Storage

Private buckets:

- `pci-submissions`;
- `pci-rights-documents`;
- `pci-assets`;
- `pci-payout-proofs`;
- `pci-message-attachments`.

No broad `storage.objects` policy exists.

## Human Edge runtime

Deployed from the feature-branch Git source:

- `pci-creator-api` — `ACTIVE`, `verify_jwt:true`;
- `pci-admin-api` — `ACTIVE`, `verify_jwt:true`;
- `pci-onboarding-api` — `ACTIVE`, `verify_jwt:true`.

`pci-worker` remains intentionally undeployed until `PCI_WORKER_SECRET` can be configured through an approved secret-management path.

### Real unauthenticated network test

A temporary disposable-only `pg_net` probe sent real HTTP requests with no Authorization header to all three human APIs.

Each returned:

```text
HTTP 401
UNAUTHORIZED_NO_AUTH_HEADER
Missing authorization header
```

Edge logs independently recorded the three 401 requests. The temporary `pg_net` extension was removed immediately after testing, returning Security Advisor to 0 WARN / 0 ERROR.

Authenticated handler execution is still pending because the connected Supabase management surface does not expose user-session token creation and credential-like values are correctly blocked from SQL probes.

## Commercial/payment lifecycle runtime result

A complete synthetic path was executed through the real `pci_api` commands inside a rollback-only transaction:

```text
Consignment OPEN
→ Creator joins
→ Submission DRAFT
→ Version reserve/finalize
→ Version READY / Submission SUBMITTED
→ Rights declaration v1
→ Review
→ PRESELECTED
→ Rights Clearance COMPLETE
→ Negotiation OPEN
→ Formal Offer SENT
→ Creator ACCEPT
→ Purchase AGREED
→ Payable AWAITING_CONFIRMATION
→ Rights PENDING_PAYMENT
→ payment destination confirmation
→ READY_TO_PAY
→ Payout INITIATED
→ Payout CONFIRMED
→ Payable PAID
→ Rights ACTIVE
→ Creative Asset PROVISIONING
```

Assertions included:

- finalize transition correctness;
- Offer acceptance idempotent replay;
- exactly one Purchase/base Payable/Rights Grant;
- Rights remain `pending_payment` before confirmed payment;
- Creator ledger before and after payout;
- payout confirmation idempotent replay;
- paid trigger creates exactly one provisioning asset;
- deferred financial constraints pass.

Result:

`atomic_offer_payment_rights_lifecycle_passed`

## Worker DB settlement runtime result

A second rollback-only test extended the paid lifecycle:

```text
Asset PROVISIONING
→ worker claim
→ exact source/destination lock
→ worker complete with matching size/MIME evidence
→ Asset AVAILABLE
→ Submission ACQUIRED
→ Purchase SETTLED
→ settlement notification outbox
```

Completion replay returned the idempotent completed result.

Result:

`worker_db_claim_complete_settlement_passed`

This validates the worker database state machine, not yet the real server-side Storage byte copy.

## Rights evidence lock

`pci.guard_creator_rights_declaration_after_grant()` blocks any rights-declaration mutation whenever any Rights Grant exists for the exact Version, including `pending_payment`. The accepted purchase therefore cannot have its underlying creator rights evidence rewritten before payment.

## Test-data hygiene

After all rollback-only behavioral runs:

- runtime synthetic Auth users: 0;
- runtime synthetic workspaces: 0;
- runtime synthetic Creators: 0;
- persisted Purchases: 0;
- persisted Payouts: 0.

## Creator Portal status

Phase 1N remains code-complete:

- Dashboard;
- invitation/Auth/legal onboarding;
- Opportunities + frozen Brief revision;
- Works + immutable V1/V2 + TUS/finalize UX;
- rights declaration/clearance;
- Conversations + Formal Offer/counter/accept;
- Payments + immutable destination + ledger;
- returning Magic Link;
- route/session guard;
- Account;
- desktop/mobile/accessibility pass.

`creator-portal/config.js` remains `demoMode:true` until authenticated runtime APIs and media paths are validated.

## Custom-secret gate still pending

The connected Supabase management surface available in this session supports Edge deployment/logs but does not expose secret-management operations.

Still required in the disposable runtime:

- `PCI_PAYMENT_DATA_KEY`;
- `PCI_CREATOR_ALLOWED_ORIGINS` for a deployed non-local Portal origin;
- `PCI_ADMIN_ALLOWED_ORIGINS` for a deployed Protocol origin;
- `PCI_CREATOR_APP_URL`;
- `PCI_INVITATION_TOKEN_KEY`;
- `PCI_ONBOARDING_ALLOWED_ORIGINS`;
- `PCI_WORKER_SECRET`.

Do not paste these secret values into chat and do not deploy the Worker without its independent secret.

## Phase 1O remaining validation

Still unproven:

### Auth / Edge

- authenticated Creator request reaching `pci-creator-api` handler;
- authenticated owner/admin request reaching Admin/Onboarding handlers;
- deployed allowed/disallowed CORS behavior;
- real invitation + returning Magic Link behavior;
- unknown-user `shouldCreateUser:false` behavior.

### Media

- signed TUS upload against actual private Storage;
- resume/retry/full-browser-loss behavior;
- backend finalize using actual Storage metadata.

### Rights / payments

- invalid/valid/resubmit/flag/complete paths through HTTP;
- AES-GCM payment identifier encrypt/decrypt through Creator/Admin Edge routes;
- partial/failed/reversed payout HTTP paths;
- proof URL ownership/expiry.

### Worker / Portal

- deploy `pci-worker` with `PCI_WORKER_SECRET`;
- real server-side Storage copy;
- Portal `demoMode:false` desktop/mobile end-to-end.

### Production security gate

Before any external Creator pilot, audit the legacy production `public/authenticated` surface carefully. Do not blindly revoke legacy permissions in production.

## Next technical movement

**Continue FASE 1O at the custom-secret/Auth gate.**

The next useful step is to configure disposable-runtime-only Edge secrets and Auth redirect URLs through an approved management path. Once that is done, resume with authenticated HTTP calls, invitation/Magic Link, TUS and real worker copy. Production remains untouched until a later explicit rollout decision.
