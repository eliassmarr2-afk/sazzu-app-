# Protocol Creative Insights — Phase 1O runtime validation results

**Date:** 2026-08-20
**Status:** COMPLETE — end-to-end disposable-runtime lifecycle validated through real HTTP, payment lifecycle and physical Worker Storage promotion
**Production mutation:** NONE  
**Disposable runtime:** `protocol-creative-insights-runtime-test` (`dgpmdqmdwqyiwhkbiakd`)  
**Runtime type:** second Free Supabase project, isolated from production

## Final authoritative closure — 2026-08-20

Phase 1O is **COMPLETE** for the disposable-runtime lifecycle. The historical sections below are preserved as chronology; any older statement that authenticated Edge paths, payment encryption, payout, Worker deployment, physical promotion, or acquisition were pending is superseded by this closure.

Validated final chain:

`Creator real → Auth/JWT → V2 READY → truthful Rights declaration → Clearance COMPLETE → PRESELECTED → Negotiation → Formal Offer → Creator ACCEPT → Purchase AGREED → Payable READY_TO_PAY → synthetic Payout INITIATED/CONFIRMED → Payable PAID → Rights ACTIVE → Asset PROVISIONING → Worker physical copy → Asset AVAILABLE → Submission ACQUIRED → Purchase SETTLED`

Final evidence:
- V2 `70bd1eb0-9f27-4c1f-956c-71e9caf36d09`
- Purchase `e23015f0-25cd-4164-9680-51d98e8736ef`
- Payable `25ccf7ac-46c9-47e4-918c-e2f9bca92ff3`
- Payout `c883c9bf-f3be-4952-ac59-9971c3065390`
- Rights Grant `c05bed09-44fc-4ad3-9635-c7828acafefc`
- Creative Asset `504a429e-ca2e-4329-83a5-09d0049742cd`
- SHA-256 `2e80992585a18c9dfcefc7b53a81ddb1c6b0fbee100539613c268d25142dda8d`
- `2434338` bytes, `video/mp4`
- Worker verification `supabase_server_copy_plus_object_metadata`
- Storage copy mode `server_side_cross_bucket`
- source V2 preserved; destination object exists; outbox completed in one attempt.

Boundaries proven: preselection ≠ purchase; Formal Offer SENT ≠ purchase; acceptance ≠ Rights ACTIVE; destination confirmation ≠ payment; payout registration ≠ confirmation; Rights activate only after Payable PAID; acquisition completes only after verified physical promotion.

The payout was synthetic runtime-only; no real external money moved. Production `cuuzsbhpjmjbbnghtiny` was not mutated. `PCI_INVITATION_TOKEN_KEY` is obsolete and must not be reintroduced.

Non-blocking follow-ups: custom SMTP/real invitation transport; leaked-password-protection review in the disposable Auth project; intentional INFO `RLS enabled no policy`; long-term `pci-worker` scheduler/runner; explicit interrupted-upload TUS resume/retry validation; Rights negative resubmit/flag HTTP variants; partial/failed/reversed payout HTTP variants.

---

## Executive checkpoint

Phase 1O is now exercising PCI on a real managed Supabase runtime, not only compiling migrations.

Validated so far:

- PCI migrations `001–055` applied sequentially without SQL apply errors;
- runtime hardenings `056–059` discovered from adversarial/behavioral testing and applied;
- all five PCI Storage buckets private with intended limits/MIME allowlists;
- `pci` private and `pci_api` exposed to PostgREST only as a service-role RPC surface;
- zero direct PCI DML/EXECUTE for `anon` / `authenticated`;
- Security Advisor with **0 WARN / 0 ERROR** after removing the temporary HTTP probe extension;
- Creator A/B BOLA and workspace-state authorization behavior passing;
- Protocol internal role matrix passing;
- three human Edge Functions deployed and `ACTIVE` with `verify_jwt:true`;
- real HTTP requests without Authorization rejected by the Edge gateway with `401 UNAUTHORIZED_NO_AUTH_HEADER`;
- atomic Offer → Purchase / Payable / Rights lifecycle passing with deferred constraints forced immediately;
- full-Payout → Rights ACTIVE → Creative Asset PROVISIONING passing;
- worker DB claim/complete → Asset AVAILABLE → Submission ACQUIRED → Purchase SETTLED passing;
- all synthetic lifecycle rows removed by `ROLLBACK`.

Production project `cuuzsbhpjmjbbnghtiny` remains untouched.

## Disposable Protocol contract fixture

A clean Supabase project does not contain legacy Protocol Data tables, while PCI references:

- `public.protocol_workspaces`;
- `public.protocol_workspace_members`.

The runtime therefore uses only:

`supabase/test-fixtures/pci-phase-1o-runtime-protocol-contract.sql`

No production business rows are copied.

The first Security Advisor run found that the fixture initially inherited broad `public` privileges and had RLS disabled. The fixture was hardened in Git and runtime:

- RLS enabled;
- all privileges revoked from `public`, `anon`, `authenticated`;
- `service_role` retains required backend access;
- no permissive RLS policy was added.

## Migration/runtime compilation

**PCI migrations `001–055` applied sequentially and successfully.**

Validated blocks:

- `001–006` — schemas, baseline security, commercial domain, commands, private Storage buckets;
- `007–013` — upload finalize/invalidation, projections, review workflow and invariants;
- `014–019` — negotiation, messages, Formal Offers, counteroffers and offer expiration;
- `020–022` — Rights prerequisite, exact-Version guards and atomic Offer acceptance;
- `023–027` — payment destinations, Payable confirmation and immutable commercial snapshots;
- `028–033` — payout lifecycle, proof ownership/path and deferred financial integrity;
- `034–040` — PAID Payable → Rights ACTIVE → asset provisioning, worker retry/stale-lock and settlement;
- `041–046` — invitation/Auth/legal bootstrap and hardening;
- `047–050` — open/direct participation and frozen accepted Brief revision;
- `051–055` — strict rights declaration schema, action projections, commercial projection and authoritative Creator payment ledger.

## Runtime-discovered hardenings

### 056 — Protocol internal operator role gate

**Finding:** `pci.require_active_workspace_member()` originally checked active membership without distinguishing `owner`, `admin`, `analyst`, `viewer`.

Pilot policy is now fail-closed:

- active `owner` → allowed;
- active `admin` → allowed;
- active `analyst` → denied;
- active `viewer` → denied.

Behavioral test through a real admin RPC returned:

`protocol_operator_role_matrix_passed`.

Fine-grained analyst/viewer read access can be designed later through dedicated safe read surfaces rather than weakening the common mutation guard.

### 057 — Creator workspace relationship gate

**Finding:** global Creator `active` did not prove access to every workspace. A Creator could be active through workspace A while restricted/suspended/closed in workspace B.

Frozen workspace policy:

- `active` → read/write;
- `restricted` → read-only;
- `invited`, `suspended`, `closed` → no PCI business access.

Implementation:

1. `pci.require_creator_workspace_access(creator_id, workspace_id, mode)`;
2. 20 mature workspace-scoped implementations moved behind private `pci.*_core_1o` functions;
3. same `pci_api` names recreated as thin authorization wrappers;
4. list reads filter inaccessible workspace rows;
5. detail/writes enforce explicit read/write relationship state;
6. private cores remain outside PostgREST exposure.

Post-apply audit:

- 20 private cores;
- 20 public wrappers;
- 0 `anon` EXECUTE;
- 0 `authenticated` EXECUTE;
- 0 `SECURITY DEFINER` introduced;
- explicit empty `search_path` retained.

Runtime results:

- `creator_workspace_gate_matrix_passed`;
- `creator_rpc_bola_and_relationship_state_passed`.

### 058–059 — Deferred Payable financial-integrity trigger

The first complete commercial/payment lifecycle test forced deferred constraints with:

`SET CONSTRAINTS ALL IMMEDIATE`.

That surfaced a real trigger bug that migration compilation alone could not expose.

`pci.assert_payable_financial_integrity()` is shared by constraint triggers on:

- `pci.payables`;
- `pci.payout_allocations`;
- `pci.payouts`.

The original function assumed every trigger row had `NEW/OLD.payable_id`. `pci.payouts` does not; Payables are reached through `payout_allocations`.

`058` added source-table dispatch. Runtime then exposed a PostgreSQL RECORD-shape subtlety: static `NEW/OLD` field references are resolved against the actual trigger row type even when located in an unselected `CASE` branch.

`059` is the final polymorphic-safe fix:

- `NEW/OLD` are converted to JSONB first;
- IDs are extracted by key instead of static record-field access;
- `payables` / `payout_allocations` resolve a direct Payable;
- `payouts` resolves all affected Payables through allocations;
- original overpaid / overallocated / paid-underfunded / processing-without-inflight rules remain unchanged.

After `059`, the identical lifecycle test passed with deferred constraints forced immediately.

## Creator BOLA / relationship-state runtime tests

All synthetic rows were transaction-local and removed by `ROLLBACK`.

Validated:

- active read/write allowed;
- restricted read allowed;
- restricted write denied;
- invited/suspended/closed read denied;
- Creator A can read A Submission;
- A → B Submission blocked;
- B → A Submission blocked;
- B restricted → own read allowed but new Version reservation denied;
- B suspended while globally active → own business-resource read denied.

## Database grants / RLS audit

For authoritative PCI:

- 29/29 PCI business tables have RLS enabled;
- direct `anon` DML: **0**;
- direct `authenticated` DML: **0**;
- `pci` USAGE for `anon/authenticated`: **none**;
- `pci_api` USAGE for `anon/authenticated`: **none**;
- PCI function EXECUTE for `anon/authenticated`: **none**;
- service-role access required by backend remains available;
- PCI functions are `SECURITY INVOKER`;
- no PCI `SECURITY DEFINER` was found;
- explicit empty `search_path` is retained.

Security Advisor `RLS Enabled No Policy` entries remain INFO-only by design: direct browser access is deny-all and business access is mediated by authenticated Edge Functions using service-role RPCs.

## Storage audit

Five private buckets exist with the expected restrictions:

- `pci-submissions`;
- `pci-rights-documents`;
- `pci-assets`;
- `pci-payout-proofs`;
- `pci-message-attachments`.

Validated:

- all private;
- intended size limits;
- intended MIME allowlists;
- no broad `storage.objects` policy;
- signed/reserved backend paths remain the intended access mechanism.

## PostgREST / Data API

PCI Edge Functions use `admin.schema("pci_api").rpc(...)`, so the service RPC schema must be known to PostgREST.

Disposable runtime explicitly uses:

```text
public, graphql_public, pci_api
```

Boundary remains:

- `pci_api` routable by Data API;
- routing does not grant browser authorization;
- `anon/authenticated` lack schema USAGE and function EXECUTE;
- private `pci` is not exposed.

## Human Edge Function deployment

Three human-facing Functions are now deployed byte-equivalent to the Git source used for this validation:

- `pci-creator-api` — `ACTIVE`, `verify_jwt:true`;
- `pci-admin-api` — `ACTIVE`, `verify_jwt:true`;
- `pci-onboarding-api` — `ACTIVE`, `verify_jwt:true`.

`pci-worker` is intentionally **not deployed yet** because its authorization is the custom `PCI_WORKER_SECRET`, and the connected Supabase management surface available in this session does not expose secret configuration.

### Real unauthenticated HTTP probe

A temporary test-only `pg_net` extension was enabled in the disposable project solely to issue HTTP requests to the deployed Functions.

Three GET probes were sent with **no Authorization header**:

- Creator `/v1/opportunities`;
- Admin `/v1/workspaces/runtime-test/review-queue`;
- Onboarding `/v1/creator/state`.

All three returned:

- HTTP `401`;
- code `UNAUTHORIZED_NO_AUTH_HEADER`;
- message `Missing authorization header`.

Edge logs independently recorded all three 401 requests.

This proves `verify_jwt:true` is active at the Supabase Edge gateway, not only stored as deployment metadata.

The temporary `pg_net` extension was then removed. Security Advisor returned to **0 WARN / 0 ERROR**.

### Still missing from Edge runtime validation

No user-session JWT is available through the connected Supabase tool surface, and credential-like values are correctly blocked from being embedded into SQL probes. Therefore we are **not** claiming yet that an authenticated user request reached the Function handler.

Still pending:

- authenticated Creator JWT → Creator API;
- authenticated owner/admin JWT → Admin/Onboarding APIs;
- CORS behavior from deployed allowed/disallowed origins;
- configured custom secret paths.

## Atomic commercial/payment lifecycle behavioral test

A complete synthetic lifecycle was executed through the real `pci_api` commands inside one transaction and removed with `ROLLBACK`.

Path validated:

```text
Consignment OPEN
→ Creator joins
→ Submission DRAFT
→ reserve Version
→ finalize READY / Submission SUBMITTED
→ Rights declaration v1
→ Review UNDER_REVIEW
→ PRESELECTED
→ Rights Clearance COMPLETE
→ Negotiation OPEN
→ Formal Offer SENT
→ Creator ACCEPT
→ Purchase AGREED
→ Payable AWAITING_CONFIRMATION
→ Rights PENDING_PAYMENT
→ Creator payment account
→ Payable READY_TO_PAY
→ Payout INITIATED
→ Payout CONFIRMED
→ Payable PAID
→ Rights ACTIVE
→ Creative Asset PROVISIONING
```

Assertions included:

- finalize moved Version to `ready` and Submission to `submitted`;
- Creator Offer acceptance replay with the same Idempotency-Key returned the same Purchase;
- exactly one Purchase, one base Payable and one Rights Grant were created;
- Rights stayed `pending_payment` before payment;
- ledger showed ARS 100,000 unpaid before payout;
- Payable became `ready_to_pay` only after destination confirmation;
- payout confirmation replay was idempotent;
- Payable became `paid`;
- Rights became `active`;
- exactly one Creative Asset entered `provisioning`;
- ledger showed ARS 100,000 confirmed / ARS 0 unpaid after payment;
- all deferred constraints passed when forced immediate.

Result:

`atomic_offer_payment_rights_lifecycle_passed`.

## Worker DB settlement behavioral test

A second rollback-only lifecycle extended the paid state through worker RPCs.

Validated:

```text
Asset PROVISIONING
→ worker_claim_promote_asset
→ exact asset/source/destination lock
→ worker_complete_asset_promotion
→ Asset AVAILABLE
→ Submission ACQUIRED
→ Purchase SETTLED
→ settlement notification outbox
```

The completion call was replayed and returned its idempotent already-completed result.

Result:

`worker_db_claim_complete_settlement_passed`.

Important: this validates the worker **database state machine**. It does not yet prove a real server-side Storage copy, because the Worker Edge Function has not been configured/deployed with its custom secret.

## Rights declaration lock

The database trigger `pci.guard_creator_rights_declaration_after_grant()` blocks any change to `rights_declaration` whenever any Rights Grant exists for that exact Version. This includes the `pending_payment` period immediately after Offer acceptance. The legal evidence therefore cannot be silently rewritten between purchase agreement and payment.

## Test-data hygiene

After behavioral runs, explicit checks returned:

- synthetic runtime Auth users: `0`;
- synthetic runtime workspaces: `0`;
- synthetic runtime Creators: `0`;
- persisted Purchases: `0`;
- persisted Payouts: `0`.

## Security Advisor

Latest result after removing the temporary HTTP test extension:

- **WARN: 0**;
- **ERROR: 0**;
- INFO only: intentionally deny-all `rls_enabled_no_policy` entries on PCI/test-fixture tables.

No permissive policy should be added merely to silence these INFO entries.

## Performance Advisor

The mostly empty disposable runtime reports INFO-only findings such as FKs without dedicated indexes and indexes not yet used.

No performance WARN/ERROR currently blocks 1O. Index decisions remain deferred until representative seeded traffic can be measured with `EXPLAIN (ANALYZE, BUFFERS)`.

## Historical runtime gaps — superseded by final closure

At this earlier point in the run, disposable-runtime custom secrets and several real HTTP paths had not yet been exercised. That state is preserved only as chronology.

The final closure above supersedes those pending items: Creator/Admin JWT paths, payment destination encryption/decryption, `demoMode:false`, real signed TUS upload/finalize, Rights clearance, payout confirmation, `pci-worker` custom-secret authentication, physical server-side Storage copy, acquisition and settlement were subsequently validated.

`PCI_INVITATION_TOKEN_KEY` was removed from the design and must not be reintroduced.

Still separate from the completed core lifecycle:
- explicit interrupted-upload TUS resume/retry validation;
- Rights negative resubmit/flag HTTP variants;
- partial/failed/reversed payout HTTP variants;
- custom SMTP / real invitation transport;
- leaked-password-protection review in the disposable Auth project;
- external-pilot security review against the legacy production surface;
- long-term scheduler/runner for `pci-worker`.

## Production rule

Production remains untouched. No migration, Auth setting, Edge Function, secret, Storage policy or Creator Portal configuration from Phase 1O has been applied to production.
