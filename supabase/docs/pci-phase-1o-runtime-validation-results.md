# Protocol Creative Insights — Phase 1O runtime validation results

**Date:** 2026-08-19  
**Status:** IN PROGRESS — DB / Storage / Data API / authorization audit validated; Edge runtime pending  
**Production mutation:** NONE  
**Disposable runtime:** `protocol-creative-insights-runtime-test` (`dgpmdqmdwqyiwhkbiakd`)  
**Runtime type:** second Free Supabase project, isolated from production

## Executive checkpoint

Phase 1O has moved beyond migration compilation and into adversarial runtime validation.

The disposable project now has:

- all PCI migrations `001–055` applied sequentially without SQL apply errors;
- two runtime-discovered authorization hardenings, `056–057`, applied and behaviorally tested;
- private PCI Storage buckets created with the intended limits/MIME allowlists;
- `pci` kept private and `pci_api` exposed to PostgREST only as a service-role RPC surface;
- zero direct PCI DML/EXECUTE privileges for `anon` and `authenticated`;
- Security Advisor at **0 ERROR** after hardening the test-only Protocol contract fixture;
- real Creator A/B BOLA and workspace-state authorization tests passing inside rollback-only transactions.

Production project `cuuzsbhpjmjbbnghtiny` remains untouched.

## Disposable Protocol contract fixture

A clean Supabase project does not contain legacy Protocol Data tables, while PCI references:

- `public.protocol_workspaces`;
- `public.protocol_workspace_members`.

The runtime therefore uses only:

`supabase/test-fixtures/pci-phase-1o-runtime-protocol-contract.sql`

No production business rows are copied.

### Fixture finding and fix

The first Security Advisor run exposed a laboratory-only problem: because the fixture tables live in `public`, their initial form inherited broad default grants and had RLS disabled.

The fixture was hardened in both Git and the disposable runtime:

- RLS enabled;
- all privileges revoked from `public`, `anon`, `authenticated`;
- `service_role` retains the backend DML required by PCI;
- no permissive RLS policies were added.

After this fix Security Advisor reports **0 ERROR**.

## Migration/runtime compilation result

**PCI migrations `001–055` applied sequentially and successfully.**

Validated blocks:

- `001–006` — schemas, baseline security, commercial domain, operator/Creator commands, private Storage buckets;
- `007–013` — upload finalize/invalidation, Creator/admin projections, review workflow and invariants;
- `014–019` — negotiation, messages, Formal Offers, Creator counteroffers and offer expiration;
- `020–022` — Rights declaration/clearance prerequisite, exact-Version commercial guards and atomic Offer acceptance;
- `023–027` — payment destinations, Payable confirmation and immutable Purchase/Payable snapshots;
- `028–033` — manual/partial Payout lifecycle, proof ownership/path and financial commit invariants;
- `034–040` — PAID Payable → Rights ACTIVE → Creative Asset provisioning, worker retry/stale-lock behavior and settlement;
- `041–046` — invitation/Auth/legal bootstrap, activation gate, delivery/revocation/concurrency/expiry/Auth snapshot hardening;
- `047–050` — open/direct participation and frozen accepted Brief revision;
- `051–055` — strict rights declaration schema, rights action projection, commercial negotiation projection and authoritative Creator payment ledger.

## Runtime-discovered authorization hardenings

### 056 — Protocol internal operator role gate

**Finding:** the shared `pci.require_active_workspace_member()` checked only active membership. It did not distinguish `owner`, `admin`, `analyst`, `viewer`.

That meant a Protocol `viewer` could cross the same backend guard used by sensitive internal PCI operations.

**Fix:** `20260819_056_pci_internal_operator_role_gate.sql`.

Pilot policy is now fail-closed:

- active `owner` → allowed;
- active `admin` → allowed;
- active `analyst` → denied;
- active `viewer` → denied.

Fine-grained read permissions may be added later through dedicated read surfaces, not by weakening the common command guard.

**Behavioral runtime test:** a real admin RPC (`pci_api.admin_creator_invitations`) was executed with synthetic owner/admin/analyst/viewer users inside `BEGIN … ROLLBACK`.

Result: `protocol_operator_role_matrix_passed`.

### 057 — Creator workspace relationship authorization

**Finding:** `pci.require_active_creator()` validates the Creator globally, but global `active` status does not prove access to every workspace.

A Creator could be active because of workspace A while their relationship in workspace B had later become restricted/suspended/closed.

**Fix:** `20260819_057_pci_creator_workspace_relationship_gate.sql`.

Frozen workspace rule:

- `active` → read/write;
- `restricted` → read-only;
- `invited`, `suspended`, `closed` → no PCI business access.

Implementation:

1. adds `pci.require_creator_workspace_access(creator_id, workspace_id, mode)`;
2. moves 20 mature workspace-scoped Creator implementations behind private `pci.*_core_1o` functions;
3. recreates the same `pci_api` names as thin authorization wrappers;
4. list reads filter inaccessible workspaces;
5. detail/write routes resolve the resource workspace and enforce read/write mode;
6. the private cores remain outside the PostgREST-exposed schema.

Post-apply audit:

- 20 private cores present;
- 20 public wrappers present;
- 0 `anon` EXECUTE;
- 0 `authenticated` EXECUTE;
- 0 `SECURITY DEFINER` introduced;
- `search_path` remains explicitly empty;
- all 20 wrappers covered by either an explicit relationship helper or a workspace relationship filter.

## Creator BOLA / relationship-state runtime tests

All synthetic rows were created inside transactions and removed via `ROLLBACK`.

### Relationship matrix

Validated:

- active read → allowed;
- active write → allowed;
- restricted read → allowed;
- restricted write → denied;
- invited read → denied;
- suspended read → denied;
- closed read → denied.

Result: `creator_workspace_gate_matrix_passed`.

### Real Creator A/B object isolation

Synthetic Creator A and B received separate participations and Submissions under one workspace/brief.

Validated through the public Creator RPC:

- A reads A Submission → allowed;
- A requests B Submission ID → blocked;
- B requests A Submission ID → blocked;
- B changed to `restricted` → own read remains allowed, version reservation denied;
- B changed to `suspended` while global Creator remains `active` → even own business-resource read denied.

Result: `creator_rpc_bola_and_relationship_state_passed`.

## Database grants / RLS audit

For the authoritative `pci` schema:

- 29/29 business tables have RLS enabled;
- tables with direct `anon` DML: **0**;
- tables with direct `authenticated` DML: **0**;
- `pci` schema USAGE for `anon/authenticated`: **none**;
- `pci_api` schema USAGE for `anon/authenticated`: **none**;
- PCI function EXECUTE for `anon/authenticated`: **none**;
- service-role access required by backend APIs remains available;
- PCI functions use `SECURITY INVOKER`; no PCI `SECURITY DEFINER` function was found;
- explicit empty `search_path` is retained.

`RLS Enabled No Policy` entries remain as Security Advisor **INFO** by design: direct browser access is deny-all, and business access is mediated through authenticated Edge Functions using service-role RPCs.

## Storage audit

Five PCI buckets exist with the expected private configuration:

- `pci-submissions`;
- `pci-rights-documents`;
- `pci-assets`;
- `pci-payout-proofs`;
- `pci-message-attachments`.

Validated:

- all are private;
- intended file-size limits are present;
- intended MIME allowlists are present;
- no broad `storage.objects` policy exists;
- signed/reserved backend flows remain the intended access mechanism.

## PostgREST / Data API configuration

PCI Edge Functions call RPCs through `admin.schema("pci_api").rpc(...)`, so the service-only RPC schema must be known to PostgREST.

The disposable runtime now explicitly configures:

```text
public, graphql_public, pci_api
```

for `pgrst.db_schemas` and reloads PostgREST config/schema.

Important boundary:

- `pci_api` is exposed to Data API routing;
- that exposure does **not** grant browser authorization;
- `anon/authenticated` still lack schema USAGE and function EXECUTE;
- private authoritative `pci` is not exposed.

API logs after reload showed no schema-cache/config error.

## Security Advisor

Latest result:

- **ERROR: 0**
- remaining items: INFO-only `rls_enabled_no_policy` on intentionally deny-all PCI/fixture tables.

No permissive policy should be added merely to silence those INFO entries.

## Performance Advisor

The empty disposable runtime reports INFO-only findings such as:

- foreign keys without dedicated indexes;
- indexes not yet used.

No performance WARN/ERROR currently blocks Phase 1O.

Because the runtime has no representative traffic/data yet, PCI will not mechanically add dozens of indexes. Hot paths should be reviewed with seeded data + `EXPLAIN (ANALYZE, BUFFERS)` before index decisions.

## Edge Function static audit

Disposable runtime currently has no PCI Edge Functions deployed.

Static review found:

- human APIs validate Bearer tokens with Supabase Auth;
- CORS uses configured allowlists, not wildcard `*`;
- Creator identity is derived server-side;
- no obvious invitation/payment/worker secret logging;
- client errors are normalized;
- `pci-worker` uses an independent `x-pci-worker-secret` and constant-time digest comparison.

Deployment is intentionally not being forced from partial configuration. The runtime still requires custom secrets such as:

- `PCI_PAYMENT_DATA_KEY`;
- `PCI_CREATOR_ALLOWED_ORIGINS`;
- `PCI_ADMIN_ALLOWED_ORIGINS`;
- `PCI_CREATOR_APP_URL`;
- `PCI_INVITATION_TOKEN_KEY`;
- `PCI_ONBOARDING_ALLOWED_ORIGINS`;
- `PCI_WORKER_SECRET`.

The currently available automated Supabase connector does not expose secret-management operations, so a trustworthy Edge deployment must wait for an explicit secret-configuration path instead of deploying intentionally broken Functions.

## Still unproven / next runtime block

Phase 1O is **not complete** yet.

Still required:

- deploy/boot/CORS/JWT tests for the four PCI Edge Functions after secrets are configured;
- real invitation + returning Magic Link behavior;
- real signed TUS upload/resume/finalize against Storage;
- Rights declaration valid/invalid/resubmit/flag/complete/lock behavioral path;
- Formal Offer duplicate/lost-response acceptance behavior;
- AES-GCM payment destination encryption/decryption;
- partial/full/failed/reversed payout execution;
- worker server-side Storage copy and asset settlement;
- Creator Portal with `demoMode:false` on desktop/mobile;
- Creator Security Gate against the legacy production authenticated/public surface before any external pilot.

## Production rule

Production remains untouched throughout this validation. No migration, Auth setting, Edge Function, secret, Storage policy or Creator Portal configuration from Phase 1O has been applied to production.
