# Protocol Creative Insights — Phase 1O disposable runtime validation runbook

**Status:** PREPARED / NOT STARTED  
**Production:** DO NOT MUTATE  
**Paid Supabase development branch:** NOT CREATED  
**Branch under test:** `feature/protocol-creative-insights-backend`

## Objective

Validate the complete PCI lifecycle against a real disposable Supabase runtime and prove the Creator Security Gate before any production rollout.

This phase is intentionally destructive/adversarial. Passing code review is not sufficient.

## Hard-stop rules

1. Do not create a paid runtime before current cost is retrieved and explicitly approved by the user.
2. Do not apply PCI migrations or Functions to production during this phase.
3. Do not merge `master` or open a production rollout as part of runtime validation.
4. Use test-only Auth identities, payment destinations, proof files and creative media.
5. Never place production secrets in browser config or test evidence.
6. Delete the disposable runtime immediately after evidence capture and verify no development branch remains.
7. A Creator A/B authorization failure, secret leak, direct PCI table access, cross-owner Storage access or incorrect rights/payment transition is a hard fail.

## Phase 1O stages

### Stage 0 — Preflight and cost gate

Before resource creation:

- confirm live project is healthy;
- confirm there are no existing development branches;
- freeze the legacy security baseline;
- retrieve current Supabase branch/runtime cost;
- agree on a short test window;
- receive explicit user approval for the quoted cost and branch creation.

Current preflight already confirms project healthy and no active development branch. Cost remains intentionally unqueried/unapproved.

### Stage 1 — Create disposable branch

Only after approval:

- create one development branch from project `cuuzsbhpjmjbbnghtiny`;
- record branch ID/ref, creation timestamp and quoted cost;
- verify branch is isolated from production writes;
- never point Creator Portal test config at production by mistake.

### Stage 2 — Database migration compile/order

Apply PCI migrations sequentially:

`001 → ... → 055`

For every migration:

- capture success/failure;
- stop on first SQL error;
- do not skip a failed migration;
- verify expected `pci` / `pci_api` objects exist;
- verify no unintended public grants are introduced.

Post-migration assertions:

- all PCI tables have RLS enabled;
- no `anon` / `authenticated` direct PCI business-table privileges;
- no `anon` / `authenticated` direct PCI RPC execution;
- service role has required backend privileges;
- immutable/append-only triggers exist;
- expected private Storage buckets exist with correct size/MIME constraints.

### Stage 3 — Edge Functions and secrets

Deploy test versions of:

- `pci-admin-api` — JWT verification enabled;
- `pci-creator-api` — JWT verification enabled;
- `pci-onboarding-api` — JWT verification enabled;
- `pci-worker` — machine-only, no public browser use, protected by `PCI_WORKER_SECRET`.

Configure branch-only/test-only values for:

- `PCI_CREATOR_ALLOWED_ORIGINS`;
- `PCI_ADMIN_ALLOWED_ORIGINS`;
- `PCI_ONBOARDING_ALLOWED_ORIGINS`;
- `PCI_CREATOR_APP_URL`;
- `PCI_INVITATION_TOKEN_KEY`;
- `PCI_PAYMENT_DATA_KEY`;
- `PCI_WORKER_SECRET`.

Never copy these values into Creator Portal source, screenshots or logs.

### Stage 4 — Auth and email configuration

Configure only disposable-runtime/test URLs:

- Site URL / redirect allowlist;
- invitation callback;
- returning Magic Link callback;
- Creator Portal origin allowlists.

Test both distinct Auth flows:

```text
FIRST ACTIVATION
Protocol invitation → Auth → PCI bootstrap → legal acceptance → ACTIVE

RETURNING CREATOR
Magic Link → existing Auth user only (`shouldCreateUser:false`) → state check → safe return
```

Adversarial tests:

- unknown email cannot create a user through returning login;
- wrong email cannot consume another Creator invitation;
- wrong Auth user cannot bootstrap invitation;
- expired/revoked invitation rejected;
- duplicate/replayed bootstrap idempotent;
- email scanner/prefetch-safe behavior assessed;
- raw PCI invitation token scrubbed and absent from logs/analytics after bootstrap;
- safe return cannot become an open redirect.

### Stage 5 — Seed actors and workspace

Create only test actors:

- Protocol operator with legitimate active workspace membership;
- Creator A;
- Creator B;
- optional Creator C for restricted/suspended tests.

Create/publish exact test legal documents and one or more test consignments.

No real client/Creator data is required.

### Stage 6 — Opportunity / Submission happy path

Prove:

- open opportunity visibility;
- invite-only opportunity visibility;
- exact revision snapshot;
- open join;
- direct invite acceptance;
- Submission DRAFT creation;
- max submission/version limits;
- Creator B cannot manipulate Creator A participation/submission IDs.

### Stage 7 — Private TUS upload

Use disposable MP4/MOV samples and prove:

- exact signed path;
- 6 MiB chunks;
- `x-signature` accepted;
- `x-upsert:false` prevents overwrite;
- correct MIME/size validation;
- SHA-256 matches finalized object;
- V1 READY immutable;
- V2 creates a new version, never overwrites V1.

Recovery matrix:

- transient network interruption;
- retry in same page;
- refresh with sessionStorage reservation;
- TUS completed but finalize response lost;
- browser/tab fully closed while upload incomplete.

The final case determines whether a narrow upload-context regeneration endpoint is required for an existing `uploading` Version.

### Stage 8 — Review and rights

Protocol-side review:

- submitted → under_review;
- changes_requested → V2;
- preselected / rejected;
- Creator sees only published feedback/reason/timestamps;
- internal notes/operator identities remain hidden.

Rights declaration:

- missing required keys rejected;
- unexpected keys rejected;
- valid schema v1 accepted;
- flagged Creator-visible reason;
- resubmission resets clearance to pending;
- complete clearance;
- declaration locked once Rights Grant exists;
- identifiable-minor case rejected by MVP policy.

### Stage 9 — Negotiation and Formal Offer

Prove:

- one open negotiation per Submission;
- messages are evidence only and cannot mutate terms;
- exact preselected READY/cleared Version required;
- only one live sent offer;
- formal offer immutable;
- Creator reject;
- Creator counteroffer preserves exact Version/rights/payment/bonus snapshots;
- expired offer non-actionable even before expiration worker materializes status;
- replaced/superseded offer non-actionable.

Atomic accept matrix:

- normal accept;
- double-click;
- same idempotency retry;
- response lost after DB commit;
- Creator B tries Creator A offer ID.

Expected atomic result:

`Offer accepted + Purchase agreed + base Payable awaiting_confirmation + Rights pending_payment + negotiation closed`.

### Stage 10 — Payment account and Payable

Prove:

- payment identifier encrypted before PostgreSQL persistence;
- exact identifier never returned by Creator reads;
- masked fields only;
- account records immutable;
- changed destination = new account;
- deactivate account;
- Payable-scoped confirmation evidence append-only;
- reconfirm while `ready_to_pay`;
- no destination change once `processing`;
- Creator cannot create/confirm Payout or mark Payable paid.

Ambiguous-response test:

- account-create DB commit succeeds but client response is lost;
- determine whether server-side safe fingerprint/deduplication is required.

Do not solve this by persisting raw bank identifiers in browser storage.

### Stage 11 — Manual payouts / ledger / proofs

Test:

- full payout;
- partial payout;
- second payout for remainder;
- failed payout;
- reversed payout before rights activation;
- reversal/incident behavior after rights leave pending-payment;
- only confirmed allocations reduce confirmed balance;
- initiated allocations remain inflight;
- failed/reversed allocations do not count as received;
- private payout proof ownership check;
- signed proof URL expiry.

### Stage 12 — Rights activation / Creative Asset worker

On full base Payable payment prove in the same DB transaction:

- exact Purchase/Offer/Submission/Version/clearance/hash validation;
- Rights moves `pending_payment → active`;
- Creative Asset moves to `provisioning`;
- outbox promotion job created.

Worker tests:

- valid `PCI_WORKER_SECRET` required;
- server-side cross-bucket copy;
- source/target object checks;
- retry;
- stale lock recovery;
- max-attempt failure;
- manual retry;
- successful asset `available`;
- all purchased assets available → Submission `acquired` + Purchase `settled`.

### Stage 13 — Creator Security Gate

Use a normal Creator JWT, not service role.

Attempt deliberately:

- direct REST reads/writes to `pci`;
- direct RPC calls to `pci_api`;
- Creator A reads/updates Creator B resources by ID;
- cross-workspace opportunity/submission/offer/payment access;
- private Storage paths for another Creator;
- admin endpoints from Creator JWT;
- worker without/with incorrect secret;
- spoofed actor IDs in payloads;
- browser requests without JWT;
- CORS from unapproved origins.

Also inventory the cloned legacy `public` surface reachable by a normal authenticated Creator. Any dangerous legacy mutation reachable solely because the Creator now has an authenticated Supabase session is a Creator Security Gate blocker even if it predates PCI.

Do not globally revoke legacy functions during this test. Record exact function/grant/caller disposition first.

### Stage 14 — UX / desktop / mobile

With `demoMode:false` verify:

- no business-content flash while route guard checks;
- session expiry → recurrent sign-in;
- safe return to exact work/payment/conversation;
- restricted/suspended/closed behavior;
- multi-workspace active/invited/restricted matrix;
- dialogs/focus/keyboard;
- reduced motion;
- iPhone/Android safe areas;
- long briefs/messages/legal docs;
- mobile MP4/MOV selection/upload/resume;
- empty/error/loading states.

### Stage 15 — Advisor diff and evidence

Run Security Advisor on the disposable runtime.

Classify each finding:

- `PRE-EXISTING LEGACY BASELINE`;
- `NEW PCI FINDING`;
- `LEGACY FINDING NOW REACHABLE BY CREATOR`.

A new PCI security finding or dangerous legacy reachability is a fail until resolved.

Evidence bundle should include:

- migration result matrix;
- Function deployment/config matrix (secret values redacted);
- Auth flow matrix;
- lifecycle entity IDs/test timestamps;
- BOLA/access matrix;
- TUS/recovery matrix;
- payment/rights/worker matrix;
- advisor diff;
- unresolved defects and severity.

## Pass criteria

Phase 1O passes only when:

- complete happy path reaches Purchase `settled`;
- no unauthorized Creator cross-account/workspace access exists;
- no direct browser PCI table/RPC access exists;
- no browser/server secret leak exists;
- payment/rights invariants hold under retry/failure;
- upload recovery has an explicit supported outcome;
- all high/critical defects are closed;
- Creator Security Gate has an explicit disposition for material legacy authenticated exposure.

## Teardown

Immediately after evidence capture:

1. delete the disposable development branch;
2. verify branch deletion completed;
3. call branch listing again and confirm no paid development branch remains;
4. remove/rotate any temporary test secrets if applicable;
5. keep only redacted evidence and code fixes in Git.

## Current gate

**STOP HERE until current Supabase branch/runtime cost is retrieved and explicitly approved by the user.**

Creating the paid development branch is not authorized by this document.
