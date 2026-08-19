# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase development branch:** NOT CREATED

## Current technical phase

**FASE 1N — Creator Portal frontend — CODE COMPLETE / RUNTIME UNVALIDATED**

Backend phases through **1M** remain code-complete. Phase 1N now represents the complete external Creator journey in code, from invitation/returning login through delivery, commercial agreement and payment visibility.

No PCI migration, Edge Function or Creator Portal configuration has been applied to production.

## Complete lifecycle represented in code

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

Meta Ads execution remains explicitly out of scope.

## Frozen security/architecture boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` / `authenticated` have no direct PCI business-table/function grants.
- Browser never receives `service_role`.
- Creator identity derives server-side from Supabase Auth.
- Auth is not authorization.
- Workspace-sensitive commands re-check the exact active `workspace_creators` relationship server-side.
- Browser route guard is UX/defense-in-depth only and never replaces backend authorization.
- Brief revisions, READY Versions, Review history, rights evidence, offers, purchases and payment evidence retain immutable/append-only behavior where required.
- Production remains blocked until disposable-runtime validation + Creator Security Gate.

## Machine/API surfaces

### `pci-admin-api`
Protocol-only review, clearance, negotiation/offers, payment execution, playback and purchased-asset operations.

### `pci-creator-api`
Creator opportunities, participation, submissions, signed upload/finalize, rights declaration, negotiations/offers, payment destinations and payout visibility.

### `pci-onboarding-api`
Invitation/Auth/legal bootstrap only. No commercial operations.

### `pci-worker`
Internal secret-protected machine surface for outbox side effects, currently including Creative Asset promotion.

## Creator Portal visual contract

`creator-portal/` is independent from Protocol Data.

Frozen:

- dark-only;
- near-black page background;
- dark card surfaces;
- subtle gray borders;
- primary `#2479FF`;
- semantic state colors only;
- Montserrat-first typography;
- `border-radius: 5px`;
- desktop + mobile first-class;
- task-oriented, not internal analytics.

Creators do not receive Protocol Data ROAS/CPA/L1/L2/L3, internal notes, internal operator identity or workspace-member capabilities.

## Phase 1N completed slices

### 1N.1 — Dashboard

Responsive desktop/mobile Dashboard with opportunities, review/change attention, rights actions, Formal Offer attention and payment actions.

Dashboard live receivable now has a final authoritative override based on `creator_payables().unpaid_amount`:

- `paid` and `voided` excluded;
- confirmed partial payouts reduce receivable;
- unlike currencies are not incorrectly summed.

### 1N.2 — First activation / Auth onboarding

`creator-portal/auth/accept-invitation/`

`Invite → authenticated user → PCI bootstrap → exact required legal documents → acceptance → workspace relationship ACTIVE`.

The raw PCI invitation token is removed from the visible URL after successful bootstrap.

Invitation remains the only path that can create/link the first PCI Creator identity.

### 1N.3 — Opportunities → Brief → Participation

Creator-safe opportunity list/detail, direct/open participation, exact accepted Brief revision, and Submission DRAFT creation.

`slots_available` is represented as assets Protocol seeks to acquire, not fake remaining seats.

### 1N.4 — Mis trabajos → V1/V2 → TUS/finalize

`DRAFT / CHANGES_REQUESTED → select media → reserve exact Version → signed TUS + incremental SHA-256 → backend Storage verification → finalize → READY/SUBMITTED`.

V1 is never overwritten by V2.

Upload safeguards:

- signed `x-signature`;
- `x-upsert:false`;
- 6 MiB chunks;
- resume fingerprint scoped to exact `submission_version_id`;
- SHA-256 Worker;
- signed reservation only in `sessionStorage`;
- retry/finalize behavior avoids accidental extra Versions.

Full browser-loss recovery of a genuinely incomplete upload remains runtime-unvalidated.

### 1N.5 — Rights declaration / clearance

Creator factual declaration schema v1 covers:

- authorship/origin;
- third-party assets/authorization;
- music/audio commercial rights;
- generative AI/tool;
- identifiable adults/permission;
- factual accuracy certification.

`Version READY → declaration → Rights Clearance → creative preselection → negotiation`.

Creative Review and Rights Clearance remain separate tracks. Rights declaration locks after any Rights Grant exists.

### 1N.6 — Conversations + Formal Offer

`creator-portal/conversations/`

Rule:

> Chat contextual is not contractual. Formal Offer is a distinct commercial object.

Formal Offer shows exact amount/currency, V number, filename, SHA-256, Version ID, expiry, rights/payment/bonus/commercial snapshots.

Creator can message, reject, counter or two-step accept a live Protocol offer.

Counteroffer preserves exact Version/item/rights/payment snapshots; only amount + optional Creator note change.

Atomic acceptance remains backend-owned:

`Offer accepted + Purchase agreed + Payable awaiting_confirmation + Rights pending_payment + Negotiation closed`.

### 1N.7 — Payments

`creator-portal/payments/`

Creator can create/deactivate immutable payment destinations, confirm an exact destination for one Payable, inspect partial/full payout progress and access a private proof URL.

Creator cannot create/confirm payouts, mark a Payable paid or activate Rights.

Migration `20260819_055_pci_creator_payment_ledger_projection.sql` makes PostgreSQL authoritative for:

- confirmed amount;
- inflight amount;
- unpaid amount;
- remaining unscheduled amount;
- masked frozen payment destination;
- exact purchased Creative/Version context.

Exact account identifiers are AES-GCM encrypted in `pci-creator-api` before PostgreSQL persistence and are not returned to Creator reads.

Each Payable confirmation freezes append-only evidence of the exact destination.

Payout proof is ownership-checked and delivered through a private signed Storage URL valid for 10 minutes.

### 1N.8 — Returning Auth + route guard + Mi Cuenta + final UI consistency

#### Returning Creator login

New route:

`creator-portal/auth/sign-in/`

First activation and returning login are intentionally separate:

```text
FIRST ACTIVATION
Protocol invitation → Auth → PCI invitation bootstrap/legal acceptance

RETURNING CREATOR
no usable session → Magic Link → existing Auth user only → PCI state check → safe internal return
```

Returning login uses Supabase Auth `signInWithOtp()` with `shouldCreateUser:false`; recurring login cannot create a new Auth user.

The runtime deployment must explicitly allow the deployed sign-in callback in Supabase Auth URL configuration.

The visible Magic Link request response remains generic and does not intentionally disclose whether an email maps to a Creator account.

#### Shared route/session guard

New common gate:

`creator-portal/route-guard.js`

Business page modules are loaded only after `requirePortalAccess()` succeeds.

Guarded surfaces:

- Dashboard;
- Opportunities;
- Mis trabajos;
- Conversations;
- Payments;
- Mi Cuenta.

State behavior:

- no valid session → returning sign-in;
- Auth account not linked to Creator → no commercial access;
- linked Creator with incomplete invitation/legal activation → onboarding;
- Creator global `active` + at least one `workspace_creator active` → portal;
- Creator global `restricted/suspended/closed` → blocked;
- no active workspace and only blocked relationships → blocked.

Multi-workspace rules:

- one active workspace + another restricted workspace does not globally block the Creator;
- an invited relationship can still reach onboarding even if an unrelated relationship is restricted;
- exact workspace authorization remains backend-enforced for every business command.

#### Safe internal return

The guard stores only an internal route in `sessionStorage`.

A return must be:

- same origin;
- below the actual deployed Creator Portal root;
- outside Auth routes.

No Auth token, invitation token, payment identifier or business payload is stored as return state.

#### Pre-auth content flash

`config.js` marks non-Auth surfaces `data-pci-access=checking` synchronously and the shared accessibility layer hides `.pci-app` until the guard resolves.

Logged-out/blocked Creators therefore should not see pre-rendered demo/business shell content before redirect/block resolution.

#### Mi Cuenta

New route:

`creator-portal/account/`

Shows only Creator-owned safe data:

- display name;
- authenticated email;
- masked Creator ID;
- Creator status;
- workspace relationship state;
- activation-document snapshot/accepted state;
- masked payment accounts;
- support/navigation;
- logout to recurring sign-in.

No profile editing is invented because no dedicated backend self-update command exists yet.

#### Mobile/accessibility final layer

New global `creator-portal/accessibility.css` adds:

- keyboard `:focus-visible`;
- reduced-motion support;
- iOS/Android safe-area handling;
- dialog viewport limits;
- mobile drawer/bottom-nav safe area;
- accessible blocked-state focus.

Current main navigation uses direct routes for Dashboard, Opportunities, Mis trabajos, Conversations, Payments, Mi Cuenta and Support. `config.js` keeps a compatibility normalization layer only as defense for stale cached markup.

Detailed 1N.8 gate:

`creator-portal/phase-1n8-access-account-test-gate.md`.

## Phase 1N support migrations

After backend Phase 1M:

- `20260819_047_pci_join_open_or_invited_consignment.sql`
- `20260819_048_pci_creator_opportunities_keep_active_invites.sql`
- `20260819_049_pci_submission_detail_frozen_brief_context.sql`
- `20260819_050_pci_creator_submissions_frozen_brief_projection.sql`
- `20260819_051_pci_creator_rights_declaration_v1_and_safe_projection.sql`
- `20260819_052_pci_creator_rights_declaration_required_keys_hardening.sql`
- `20260819_053_pci_creator_submissions_rights_action_projection.sql`
- `20260819_054_pci_creator_negotiation_commercial_projection.sql`
- `20260819_055_pci_creator_payment_ledger_projection.sql`

No new database migration was required for 1N.8; it consumes the existing secure Auth/onboarding/payment read models.

All migrations remain Git-only and unapplied to production.

## Browser secret boundary

`creator-portal/config.js` remains `demoMode:true`.

Permitted eventual browser values:

- Supabase project URL;
- publishable key;
- public PCI Edge Function URLs.

Forbidden:

- service-role key;
- invitation-HMAC key;
- payment AES-GCM key;
- worker secret;
- database credentials.

Commercial writes remain authenticated Edge Function calls. No browser-direct PCI business-table writes were added.

## Validation status

**CODE COMPLETE does not mean runtime validated or production ready.**

No local automated JavaScript/runtime validation is being claimed. Connected/manual code review does not change the runtime status.

A concentrated disposable-runtime validation must still prove:

### SQL / Functions

- migration compile/order `001–055`;
- Edge Function boot/runtime/CORS;
- correct PostgREST schema exposure;
- all command idempotency/invariants.

### Auth / onboarding / returning login

- invitation email behavior;
- Magic Link template and callback allowlist;
- `shouldCreateUser:false` does not create unknown users;
- session restore/refresh;
- safe route return;
- no open redirect;
- global/workspace state matrix;
- Creator A/B/BOLA isolation.

### Media

- signed private TUS;
- MIME/size observations;
- mobile resume/retry;
- refresh/full-browser-loss cases.

### Review / rights / negotiation

- V1/V2 review transitions;
- rights schema invalid/valid/resubmit/flag/complete/lock;
- message idempotency;
- offer expiry/supersession;
- counteroffer snapshot preservation;
- atomic accept duplicate/lost-response behavior.

### Payments

- AES-GCM encryption/decryption;
- payment account create/deactivate/reconfirm;
- partial/full/failed/reversed payout accounting;
- proof ownership/expiry;
- ambiguous-response account-create behavior.

### Assets

- Payable paid → Rights active transaction;
- asset provisioning/outbox;
- worker stale-lock/retry;
- cross-bucket copy verification;
- asset available → Submission acquired → Purchase settled.

### UX / mobile

- keyboard focus;
- dialogs;
- reduced motion;
- safe areas;
- no pre-auth business-content flash;
- mobile navigation/forms/uploads.

## Creator Security Gate before any pilot

No external Creator pilot until the disposable runtime proves the complete flow and the legacy public/authenticated Supabase surface is audited/hardened safely.

Security gate still includes:

- exact externally exposed API/schema allowlist;
- legacy public RPC/grant inventory;
- PCI private ownership verification;
- strict Storage access tests;
- adversarial Creator A/B/Protocol tests;
- secret/cron cleanup where required;
- leaked-password protection if password Auth is ever enabled;
- delete disposable runtime after validation;
- explicit production approval.

Do not blindly harden the live legacy project.

## Next technical phase

**FASE 1O — Disposable Supabase runtime validation + Creator Security Gate**

This phase should begin by planning the validation window and confirming current branch/runtime cost. It must **not** create a paid Supabase branch/runtime until the user explicitly approves the cost and creation.

After 1O succeeds, the next decision is a controlled production rollout/pilot—not more speculative Creator frontend construction.
