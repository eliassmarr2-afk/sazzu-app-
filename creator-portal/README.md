# Protocol Creative Insights — Creator Portal

**Phase:** 1N — Creator Portal frontend  
**Status:** CODE COMPLETE / RUNTIME UNVALIDATED  
**Theme:** dark only  
**Production:** not deployed  
**Paid Supabase development branch:** not created

## Product boundary

`creator-portal/` is the external Creator surface for Protocol Creative Insights.

It is intentionally separate from Protocol Data. A Creator is an external counterparty and never receives:

- Protocol Data internal analytics;
- internal notes/reviewer identities;
- `protocol_workspace_member` privileges;
- service-role credentials;
- private payment ciphertext;
- private Storage paths.

The portal is operational rather than analytical: opportunities, work, review, negotiation, payment and account state.

## Frozen visual contract

- dark-only at this stage;
- page background near `#0F0F10`;
- deep surfaces near `#090A0B`;
- cards near `#1A1B1E–#202227`;
- subtle borders near `#303238`;
- primary blue `#2479FF`;
- semantic colors only for state;
- white primary / gray secondary text;
- Montserrat-first typography;
- `border-radius: 5px`;
- mobile and desktop are first-class.

## Complete Creator lifecycle represented by the portal

```text
Protocol invitation
  → Supabase Auth
  → PCI bootstrap + exact legal acceptance
  → Creator ACTIVE
  → Opportunity / exact Brief
  → Participation
  → Submission DRAFT
  → immutable V1/V2
  → signed TUS + finalize
  → Review / changes
  → rights declaration
  → Protocol clearance
  → preselection
  → Conversation
  → immutable Formal Offer / counteroffer
  → atomic accept
  → Purchase + Payable + Rights pending_payment
  → payment destination confirmation
  → Protocol payout
  → partial/full payout ledger + proof
  → Payable paid
  → Rights activation remains backend-controlled
```

## 1N.1 — Dashboard

`creator-portal/index.html`

Responsive home with:

- open opportunities;
- work in review;
- requested changes;
- Creator rights actions;
- formal-offer attention;
- payment-destination attention;
- receivable amount.

The final receivable display uses authoritative `creator_payables().unpaid_amount` when live. `paid` and `voided` obligations do not inflate receivable. Multiple currencies are not incorrectly summed.

## 1N.2 — First activation / onboarding

`creator-portal/auth/accept-invitation/`

```text
Invite → authenticated user → PCI invitation bootstrap → exact required legal documents → acceptance → workspace relationship ACTIVE
```

The raw PCI invitation token is scrubbed from the address bar after bootstrap.

Invitation remains the only first-activation/linking route.

## 1N.3 — Opportunities

`creator-portal/opportunities/`

```text
Open opportunity / direct invite
  → exact frozen Brief
  → Participation ACTIVE
  → Submission DRAFT
```

Accepted participation keeps its exact Consignment revision even if Protocol later publishes another revision.

`slots_available` is communicated as the number of assets Protocol seeks to acquire, never fake remaining Creator seats.

## 1N.4 — Mis trabajos + media versions

`creator-portal/works/`

Provides:

- exact accepted brief context;
- Submission state;
- immutable V1/V2 lineage;
- MP4/MOV validation;
- signed resumable TUS upload;
- incremental SHA-256 Worker;
- backend finalize/Storage verification;
- Creator-visible review feedback only.

Upload rules include:

- `tus-js-client@4.3.1`;
- signed `x-signature`;
- `x-upsert:false`;
- 6 MiB chunks;
- fingerprint scoped by `submission_version_id`;
- SHA-256 incremental Worker using `hash-wasm@4.12.0`;
- reservation context only in `sessionStorage`;
- retries do not silently create another Version.

Full browser-loss recovery of a genuinely incomplete upload remains a runtime test item.

## 1N.5 — Rights declaration + clearance

Rights declaration is factual evidence about an exact Version; it is not the legal agreement and does not transfer ownership by itself.

Schema v1 covers:

- origin/authorship;
- third-party assets + authorization;
- music/audio + commercial-use confirmation;
- generative AI + tool;
- identifiable people + adult/permission confirmation;
- factual accuracy certification.

Current path:

`Version READY → Creator declaration → Protocol clearance → Creative preselection → Negotiation`

Creative Review and Rights Clearance remain independent tracks. Any existing Rights Grant locks declaration edits.

## 1N.6 — Conversations + Formal Offer

`creator-portal/conversations/`

Primary rule:

> Chat contextual is not contractual. A Formal Offer is a separate commercial object.

Formal Offer displays:

- amount/currency;
- proposed-by side;
- exact V number;
- filename;
- SHA-256;
- Version ID;
- expiry;
- rights snapshot;
- payment snapshot;
- bonus/performance snapshot;
- commercial terms.

Actions:

- message;
- reject;
- counteroffer;
- two-step accept.

Counteroffer preserves the exact Version/rights/payment/item snapshots. Only amount + optional Creator note change.

Accept calls the atomic 1J backend command:

`Offer accepted + Purchase agreed + Payable awaiting_confirmation + Rights pending_payment + Negotiation closed`.

It does not activate Rights.

Detailed gate: `creator-portal/conversations/README.md`.

## 1N.7 — Payments

`creator-portal/payments/`

The Creator can:

- create immutable payment-account records;
- deactivate old accounts;
- confirm an exact destination for an exact Payable;
- see confirmed/inflight/unpaid amounts;
- see partial payouts;
- open a private temporary payout proof.

The Creator cannot:

- create a payout;
- confirm a payout;
- mark a Payable paid;
- activate Rights.

Exact CBU/CVU/account identifiers are encrypted in `pci-creator-api` before persistence. Later reads expose only safe masked data.

Migration `20260819_055_pci_creator_payment_ledger_projection.sql` keeps PostgreSQL authoritative for:

- `confirmed_amount`;
- `inflight_amount`;
- `unpaid_amount`;
- `remaining_to_schedule`.

Detailed gate: `creator-portal/payments/README.md`.

## 1N.8 — Returning Auth + route guard + Mi Cuenta

### Returning Creator login

`creator-portal/auth/sign-in/`

First activation and recurring login are intentionally different:

```text
FIRST TIME
Protocol invitation → Auth → PCI bootstrap/legal activation

RETURNING CREATOR
no session → Magic Link → existing Auth user → PCI state check → safe internal return
```

Returning Magic Link uses Supabase Auth `signInWithOtp()` with `shouldCreateUser:false` so login cannot create a new user.

The deployed Magic Link callback must be explicitly allowed in Supabase Auth URL configuration during runtime setup.

The UI gives a generic delivery response and does not intentionally enumerate whether an email is a Creator account.

### Shared route guard

`creator-portal/route-guard.js`

Guarded before business modules load:

- Dashboard;
- Opportunities;
- Mis trabajos;
- Conversations;
- Payments;
- Mi Cuenta.

State behavior:

- no valid session → returning sign-in;
- Auth user not linked → no commercial access;
- linked but onboarding incomplete → onboarding;
- Creator active + at least one active workspace relationship → portal;
- global restricted/suspended/closed → blocked;
- no active relationship and only blocked relationship → blocked.

Multi-workspace behavior deliberately mirrors backend authorization semantics:

- an active relationship is not globally blocked by an unrelated restricted relationship;
- an invited relationship can still complete onboarding even if another relationship is restricted;
- workspace-specific business commands continue to re-check exact server-side relationship state.

The browser guard is UX/defense-in-depth. It never replaces backend authorization.

### Safe return

The attempted internal route is kept only in `sessionStorage`.

Return validation requires:

- same origin;
- inside the actual deployed Creator Portal root;
- not an Auth route.

No access token, invite token, bank identifier or business payload is stored as return state.

### Content-flash protection

Commercial `.pci-app` shells remain hidden while `data-pci-access=checking` so logged-out/blocked users should not see demo/business markup before the guard resolves.

### Mi Cuenta

`creator-portal/account/`

Shows only safe Creator-owned data:

- display name;
- authenticated email;
- masked Creator ID;
- Creator state;
- workspace relationships;
- activation-document snapshots/accepted state;
- masked payment accounts;
- support routes;
- sign-out.

No self-edit UI is invented for identity fields because there is no dedicated safe backend mutation command yet.

### Accessibility/mobile final layer

`creator-portal/accessibility.css`

Includes:

- keyboard `:focus-visible`;
- iOS/Android safe-area handling;
- dialog viewport limits;
- reduced-motion support;
- mobile drawer/bottom-nav safe areas;
- blocked-state accessibility focus.

Detailed gate: `creator-portal/phase-1n8-access-account-test-gate.md`.

## Browser/API boundary

Safe browser config may contain only:

- Supabase URL;
- publishable key;
- PCI public Edge Function URLs.

It must never contain:

- service-role;
- invitation HMAC key;
- payment encryption key;
- worker secret;
- database credentials.

Commercial writes continue through authenticated Edge Functions. No browser-direct PCI business-table mutations were introduced.

## Frozen history/integrity rules

- published/accepted Brief snapshots are not retroactively rewritten;
- ready media Versions are byte-immutable;
- V1 is never overwritten by V2;
- internal Review notes never enter Creator projections;
- rights declaration locks after Rights Grant creation;
- Formal Offer is immutable commercial evidence;
- chat cannot change offer terms;
- payment destination confirmation freezes a per-Payable snapshot;
- payout confirmation remains Protocol/backend-only;
- Rights activation remains payment/backend-controlled.

## Demo/runtime rule

`creator-portal/config.js` remains `demoMode:true`.

Phase 1N being code-complete does **not** authorize a Creator pilot.

Before any external Creator:

1. explicitly approve a disposable Supabase runtime;
2. apply the PCI migrations and Functions there;
3. configure Auth Site/redirect URLs and test SMTP/email behavior;
4. configure only test publishable/runtime URLs in the browser;
5. switch demo off in the disposable runtime only;
6. run onboarding + returning-login tests;
7. run all route/state/BOLA tests;
8. run TUS/Storage/retry tests;
9. run rights/review/offer/payment tests;
10. run worker/asset settlement tests;
11. complete the Creator Security Gate;
12. delete the disposable runtime after the validation window.

Production remains untouched until explicit approval.

## Phase status

Completed in code:

- 1N.1 Dashboard;
- 1N.2 invitation/Auth onboarding;
- 1N.3 Opportunities/Brief/Participation;
- 1N.4 Mis trabajos/V1/V2/TUS;
- 1N.5 Rights declaration/clearance;
- 1N.6 Conversations/Formal Offer;
- 1N.7 Payments;
- 1N.8 returning Auth/route guard/Mi Cuenta/mobile-accessibility consistency.

**FASE 1N — CODE COMPLETE / RUNTIME UNVALIDATED.**

## Next technical phase

Proposed next phase:

**FASE 1O — Disposable runtime validation + Creator Security Gate**

No paid Supabase branch/runtime is to be created without explicit cost confirmation and user approval.
