# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1N — Creator Portal frontend — IN PROGRESS / RUNTIME UNVALIDATED**

Backend phases through **1M** remain code-complete. Phase 1N is now implementing the external Creator experience against that backend without touching production.

Current end-to-end business lifecycle represented in code:

`Protocol invitation → Supabase Auth → exact legal acceptance → Creator ACTIVE → opportunity/brief → participation → Submission → immutable V1/V2 upload → review/revisions → preselection → rights clearance → negotiation → formal offer/counteroffer → atomic acceptance → Purchase + Payable + Rights pending_payment → payment destination confirmation → manual payout → Payable paid → Rights active → Creative Asset provisioning → worker copy → Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## Architectural boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` and `authenticated` have no direct PCI business-table/function grants.
- Browser clients never receive `service_role`.
- Creator identity is derived server-side from Supabase Auth.
- A valid Auth session is authentication only; it is not PCI authorization.
- Commercial history and accepted snapshots remain immutable/append-only where required.
- Production remains untouched until disposable-runtime validation and the Creator Security Gate are complete.

## API/machine surfaces

### `pci-admin-api`

Internal Protocol business API for review, clearance, negotiation/offers, payments, playback and purchased assets.

### `pci-creator-api`

External Creator business API for opportunities, participation, submissions, upload/finalization, rights declaration, negotiation/offers and payment visibility/actions.

### `pci-onboarding-api`

Identity/bootstrap boundary for invitation, Auth linkage, exact legal acceptance and workspace activation. It intentionally exposes no commercial commands.

### `pci-worker`

Internal machine-only surface for non-transactional outbox side effects, currently Creative Asset promotion.

## Creator Portal boundary

`creator-portal/` is a completely separate external surface from Protocol Data.

Frozen UI contract:

- dark mode only;
- near-black page/background surfaces;
- card surfaces around `#1A1B1E`–`#202227`;
- subtle gray borders;
- primary blue `#2479FF`;
- semantic green / amber / purple / red for state only;
- Montserrat-first typography;
- `border-radius: 5px`;
- desktop and mobile treated as first-class layouts;
- operational UX, not internal analytics.

A Creator must never receive Protocol Data's internal sidebar, ROAS/CPA/L1/L2/L3 analytics, internal notes or workspace-member permissions.

## Phase 1N completed slices

### 1N.1 — Dashboard foundation

Implemented:

- desktop Creator sidebar;
- mobile header + fixed bottom navigation + drawer;
- operational summary cards;
- `Requiere tu atención` queue;
- opportunity cards;
- demo/live data adapter;
- dashboard composition from existing safe Creator read models;
- partial-payout-aware `Por cobrar` amount;
- multiple currencies are never incorrectly summed.

### 1N.2 — Auth/onboarding UX

Implemented:

`Invite → Auth session → PCI bootstrap → exact legal documents → acceptance → workspace active → Creator dashboard`

Browser uses only a Supabase publishable key. Raw PCI invitation token is removed from the visible URL after successful bootstrap and is never intentionally persisted to localStorage/analytics/logs.

### 1N.3 — Opportunities → Brief → Participation → Submission DRAFT

Implemented route:

`creator-portal/opportunities/`

List supports:

- safe opportunity read model;
- search;
- filters: all / available / participating / invitations;
- open vs invite-only state;
- responsive desktop/mobile cards.

Exact brief shows:

- objective;
- creative angle;
- hook guidance;
- format requirements;
- acceptance criteria;
- rights package snapshot;
- bonus policy;
- base acquisition price;
- target number of assets;
- closing date;
- allowed pre-purchase revision rounds.

Creator actions:

`open consignment → Quiero participar → Participation ACTIVE`

or

`invite-only participation → Aceptar invitación → Participation ACTIVE`

then

`Participation ACTIVE → Crear mi entrega → Submission DRAFT`

The page also reads existing submissions and does not offer another accidental draft after refresh when a non-withdrawn Submission already exists for that brief.

## Exact brief-revision invariant

Phase 1N exposed and fixed an important read-model edge case.

`consignment_participations.consignment_revision_id` is the accepted brief snapshot.

Current projection rule:

- before participation: Creator sees current published revision;
- participation `invited` or `active`: Creator sees the exact participation revision.

Therefore Protocol publishing Rev.2 later cannot silently rewrite a Creator's accepted Rev.1 brief.

Invite-only opportunities remain visible after `invited → active` so the Creator can return to the accepted brief and continue the work.

`join_consignment()` now supports both open consignments and explicit invite-only acceptance while preserving idempotent retries and the exact accepted revision.

## Opportunity/slot semantics

`slots_available` is treated as the number of assets Protocol seeks to acquire, **not** as a live count of remaining Creator seats.

Creator UI therefore uses wording such as:

`Protocol busca 2 activos`

and does not manufacture real-time scarcity.

## Safe browser API adapter

`creator-portal/api-client.js` currently maps safe reads for:

- onboarding state;
- opportunities;
- submissions;
- negotiations;
- payables;
- payouts.

Creator commands currently used by the frontend include:

- onboarding bootstrap;
- legal acceptance;
- join/accept consignment participation;
- create Submission DRAFT.

Mutations send the same UUID in the `Idempotency-Key` header and payload.

## Demo/runtime rule

`creator-portal/config.js` currently keeps `demoMode: true`.

This is deliberate because PCI is still runtime-unvalidated.

No frontend file contains service-role, invitation HMAC, payment encryption or worker secrets.

## Latest database support added during 1N

- `20260819_047_pci_join_open_or_invited_consignment.sql`
  - open join + explicit invite-only acceptance;
  - exact revision preservation;
  - idempotent retry hardening.
- `20260819_048_pci_creator_opportunities_keep_active_invites.sql`
  - accepted direct opportunities remain visible;
  - accepted participation revision is projected instead of silently switching to current revision.

All prior PCI migrations `001–046` remain part of the branch and have not been applied to production.

## Validation status

Everything remains **Git-only**.

Migrations and Edge Functions have not yet been executed against a disposable Supabase runtime. SQL compilation, Auth, Storage, TUS, CORS, encrypted payment data and browser↔Edge integration therefore still require runtime validation.

The paid Supabase development branch remains deliberately deferred until the frontend/backend are ready for a concentrated test window.

## Security gate still required before external Creator launch

No Creator pilot should begin until:

1. disposable Supabase runtime is created;
2. all PCI migrations/functions are applied;
3. onboarding adversarial matrix passes;
4. Creator A/B cross-account/BOLA tests pass;
5. Storage signed-upload/read isolation passes;
6. legacy public/authenticated RPC exposure is audited;
7. cron/secrets are moved/rotated safely where required;
8. runtime is deleted after the validation window;
9. production deployment receives explicit approval.

## Next Phase 1N slice

**Mis trabajos → Submission detail → V1/V2 timeline → signed TUS upload → finalize**

Target flow:

`Submission DRAFT → choose MP4/MOV → reserve exact version → signed TUS upload → progress/resume → finalize against Storage → Version READY → Submission SUBMITTED`

For a requested revision:

`CHANGES_REQUESTED → upload V2 → V1 remains immutable → V2 READY → Submission SUBMITTED`

This is the next technical movement. Phase 1N remains **IN PROGRESS** until the rest of the Creator workflow screens are built and the route/security/mobile accessibility pass is complete.