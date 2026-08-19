# Protocol Creative Insights — Creator Portal

**Phase:** 1N — Creator Portal frontend  
**Status:** IN PROGRESS  
**Theme:** dark only  
**Production:** not deployed

## Product boundary

This directory is the external Creator surface for Protocol Creative Insights.

It is intentionally separate from Protocol Data's internal panel. A Creator is an external counterparty and must never receive the Protocol Data sidebar, internal analytics, operator notes, workspace-member permissions or service-role credentials.

## Approved visual contract

The Creator Portal belongs to the same visual family as current Protocol Data while being less dense and more task-oriented.

Frozen base tokens:

- dark-only for the current product stage;
- page background near `#0F0F10`;
- sidebar/deep surface near `#090A0B` / `#0B0C0E`;
- card surfaces near `#1A1B1E`–`#202227`;
- subtle borders near `#303238`;
- primary action blue `#2479FF`;
- semantic green / amber / purple / red only for state;
- white primary text, quiet gray secondary text;
- `border-radius: 5px` as the interface standard;
- Montserrat-first font stack;
- no decorative glassmorphism or large-radius consumer-app cards;
- mobile is first-class, not a desktop afterthought.

The Creator dashboard is deliberately operational rather than analytical. It answers:

1. What opportunities can I take?
2. What is Protocol waiting for from me?
3. Is there an offer I need to answer?
4. Is there money waiting for me?

Internal ROAS/CPA/L1/L2/L3 and attribution analytics do not belong in this portal.

## Current surfaces

### `index.html`

Approved responsive Creator Dashboard shell.

Desktop:

- persistent Creator-specific sidebar;
- summary cards;
- `Requiere tu atención` queue;
- opportunity cards.

Mobile:

- compact top bar;
- 2×2 summary grid;
- condensed attention cards;
- horizontally scrollable opportunity cards;
- fixed five-item bottom navigation;
- drawer for account/support secondary navigation.

Dashboard opportunity actions now route to the exact brief using `?id=<consignment_id>`.

### `auth/accept-invitation/index.html`

Onboarding UX for the 1M Auth/bootstrap contract.

State machine:

`loading → auth-required / bootstrap → terms → ready`

Error is a separate terminal/retry state.

The raw PCI invitation token is removed from the visible URL after successful bootstrap. Legal-document links are restricted to `http:`, `https:` or safe relative/hash paths.

### `opportunities/index.html`

Responsive opportunity list + exact brief surface.

List capabilities:

- current Creator-safe opportunities;
- search by brief/product/angle;
- filters for all / not joined / participating / direct invitations;
- explicit distinction between open consignments and invite-only opportunities;
- no false real-time scarcity copy: `slots_available` is presented as how many assets Protocol seeks, not as remaining Creator seats.

Exact brief capabilities:

- objective;
- creative angle;
- hook guidance;
- format requirements;
- acceptance criteria;
- exact rights package snapshot;
- performance bonus policy;
- base acquisition price;
- target number of assets;
- close date;
- pre-purchase revision allowance;
- exact revision number accepted by the Creator.

Creator actions:

`Open consignment → Quiero participar → Participation ACTIVE`

or

`Invite-only participation → Aceptar invitación → Participation ACTIVE`

then

`Participation ACTIVE → Crear mi entrega → Submission DRAFT`

The page also reads existing Creator submissions. After refresh, if a non-withdrawn Submission already exists for the brief, the UI shows its current state instead of offering another accidental draft.

### `config.js`

Safe browser runtime scaffold only.

It may eventually contain:

- Supabase project URL;
- Supabase **publishable** key;
- Edge Function public URLs.

It must never contain:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `PCI_INVITATION_TOKEN_KEY`;
- `PCI_PAYMENT_DATA_KEY`;
- `PCI_WORKER_SECRET`;
- any database/service secret.

### `api-client.js`

Browser Auth/API adapter. Human JWTs are still validated server-side by PCI Edge Functions.

Current Creator reads:

- `GET pci-onboarding-api/v1/creator/state`
- `GET pci-creator-api/v1/opportunities`
- `GET pci-creator-api/v1/submissions`
- `GET pci-creator-api/v1/negotiations`
- `GET pci-creator-api/v1/payables`
- `GET pci-creator-api/v1/payouts`

Current Creator commands used by the Portal:

- `POST pci-onboarding-api/v1/creator/bootstrap`
- `POST pci-onboarding-api/v1/creator/invitations/:id/legal-acceptances`
- `POST pci-creator-api/v1/consignments/:id/join`
- `POST pci-creator-api/v1/submissions`

Mutation calls generate a browser UUID idempotency key and send the same value in `Idempotency-Key` and the JSON payload.

Supabase Auth in browser uses only a publishable key with session persistence, token refresh and URL-session detection.

## Opportunity revision invariant

A Creator must never have an accepted brief changed retroactively.

`creator_opportunities()` now follows this projection rule:

- before participation: show the current published Consignment revision;
- participation `invited` or `active`: show `consignment_participations.consignment_revision_id` exactly.

Therefore, if Protocol publishes Rev.2 after a Creator accepted Rev.1, that Creator continues seeing Rev.1 for the accepted participation. A new invitation/re-participation contract is required to bind a different revision where applicable.

Invite-only opportunities remain visible after acceptance (`invited → active`) so the Creator can return to the brief and continue the Submission flow.

## Dashboard live-data composition

No new dashboard RPC was introduced in 1N foundation. The UI composes the existing safe Creator read models in parallel.

- open opportunities = current `creator_opportunities` items;
- in review = submissions in `submitted` / `under_review`;
- changes requested = submissions in `changes_requested`;
- attention = change requests + live workspace offers + payment-destination confirmations needed;
- amount receivable = each non-paid/non-cancelled Payable minus allocations belonging to **confirmed** payouts for that exact Payable.

This means a partially paid obligation does not inflate the Creator's `Por cobrar` metric back to its original amount.

If multiple currencies are simultaneously outstanding, the dashboard never adds unlike currencies. It displays `Ver pagos` instead.

## Demo/runtime rule

`config.js` currently has `demoMode: true`.

This is deliberate while PCI remains runtime-unvalidated. The approved UI is usable for visual development without connecting to production.

When a disposable Supabase runtime is available:

1. set a publishable key and test URLs;
2. set `demoMode: false`;
3. run the 1M onboarding test gate;
4. verify Dashboard and Opportunities read-model hydration;
5. exercise open join, direct-invite acceptance and Submission creation idempotency;
6. verify accepted revision persistence after a newer Consignment revision is published;
7. do not point this frontend at production until the Creator Security Gate passes.

## Phase 1N completed slices

- Dashboard desktop/mobile foundation;
- Auth invitation + legal onboarding UX;
- Dashboard live read-model composition;
- **Opportunities → exact Brief → Join/Accept invitation → Submission DRAFT**.

Phase 1N is still **IN PROGRESS**.

## Remaining Phase 1N work

- My Work list + submission detail + V1/V2 timeline + upload/finalize UX;
- Review feedback + requested-change flow;
- Conversations + formal-offer distinction;
- Offer detail / reject / counter / accept UX;
- Payments + payment-account confirmation + payout history/proofs;
- My Account;
- global route-level session guard and active-relationship gate (currently enforced by onboarding and the Opportunities route, not yet every screen);
- mobile interaction pass and accessibility pass.

## Next slice

**Mis trabajos → Submission detail → Upload V1/V2 → Finalize**

This connects the next Creator-facing surface to the signed TUS upload/finalization backend already built in the earlier backend phases.