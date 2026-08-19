# Protocol Creative Insights — Phase 1O runtime validation results

**Date:** 2026-08-19  
**Status:** IN PROGRESS  
**Production mutation:** NONE  
**Disposable runtime:** `protocol-creative-insights-runtime-test` (`dgpmdqmdwqyiwhkbiakd`)  
**Runtime type:** second Free Supabase project, isolated from production

## Current checkpoint

A clean disposable Supabase project was created after explicit user approval. Production project `cuuzsbhpjmjbbnghtiny` remains untouched.

Before PCI migrations, the disposable runtime received only the TEST-ONLY structural fixture from:

`supabase/test-fixtures/pci-phase-1o-runtime-protocol-contract.sql`

The fixture provides the minimum `public.protocol_workspaces` / `public.protocol_workspace_members` contract required by PCI foreign keys and operator authorization. It contains no production business data.

## Migration compilation result

**Migrations `001` through `050` have been applied sequentially and successfully.**

No migration in this range was skipped and no SQL compilation/apply error has occurred so far.

Validated migration blocks include:

- `001–006` — private schemas, security baseline, commercial domain, operator/Creator commands and private Storage buckets;
- `007–013` — upload finalize/invalidation, Creator/admin read models, review workflow and review invariants;
- `014–019` — negotiation, messages, immutable Formal Offers, Creator counteroffers and expiration worker;
- `020–022` — Rights declaration/clearance prerequisite, exact-version offer guards and atomic offer acceptance;
- `023–027` — payment destinations, Payable confirmation, Purchase/Payable snapshots and commit-time commercial integrity;
- `028–033` — manual payout lifecycle, partial/inflight accounting, payout proof ownership/path and financial commit invariants;
- `034–040` — paid Payable → Rights ACTIVE, Creative Asset provisioning, worker claims/retries/stale locks, settlement integrity and safe asset visibility;
- `041–046` — Creator invitation/Auth/legal bootstrap, activation gate, delivery/revocation/concurrency/expiry/auth-snapshot hardening;
- `047–050` — open/direct participation behavior and frozen exact Brief context in opportunities/submission projections.

## Important runtime-compiled invariants

Compilation on managed PostgreSQL has now accepted, among others:

1. exact Version immutability after READY;
2. bounded V1/V2 review workflow;
3. Rights declaration and Rights Clearance separation;
4. Formal Offer snapshots bound to the exact preselected READY Version;
5. atomic Creator acceptance that creates Purchase + base Payable + Rights `pending_payment` and closes Negotiation in one transaction;
6. immutable payment-account and Payable destination snapshots;
7. partial/manual Payout accounting with overpayment/overallocation commit guards;
8. paid base Payable activating Rights and provisioning Creative Assets;
9. worker `SKIP LOCKED`, retry/backoff, stale-lock reclaim and manual retry mechanics;
10. all-assets-available settlement to Submission `acquired` + Purchase `settled`;
11. Auth linkage remaining separate from workspace activation until exact required legal documents are accepted;
12. accepted/invited Creator opportunity projections retaining the exact Brief revision rather than silently switching to a later current revision.

## What this checkpoint does NOT prove

Successful migration application is **not** equivalent to end-to-end validation.

Still unproven at this checkpoint:

- migrations `051–055`;
- grants/RLS/direct-REST attack matrix;
- Edge Function boot/CORS/JWT behavior;
- invitation and returning Magic Link runtime behavior;
- Creator A/B BOLA isolation;
- signed TUS upload/resume/finalize against real Storage;
- Rights schema behavioral tests;
- Formal Offer acceptance retries/lost-response behavior with seeded entities;
- payment encryption/decryption and payout execution behavior;
- worker server-side Storage copy;
- desktop/mobile Creator Portal with `demoMode:false`;
- Creator Security Gate against the legacy production authenticated surface.

## Next step

Apply migrations `051–055` strictly in order, then verify migration history, PCI grants/RLS/buckets and run Security Advisor before deploying PCI Edge Functions to the disposable runtime.

Production must remain untouched throughout Phase 1O.
