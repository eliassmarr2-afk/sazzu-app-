# Protocol Creative Insights — Creator Portal

**Phase:** 1N — Frontend foundation + Auth/onboarding UX  
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

## Current routes/files

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

### `auth/accept-invitation/index.html`

Onboarding UX for the 1M Auth/bootstrap contract.

State machine:

`loading → auth-required / bootstrap → terms → ready`

Error is a separate terminal/retry state.

The invitation token is removed from the visible URL after a successful PCI bootstrap.

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

Browser auth/API adapter.

Current real read mapping:

- `GET pci-onboarding-api/v1/creator/state`
- `GET pci-creator-api/v1/opportunities`
- `GET pci-creator-api/v1/submissions`
- `GET pci-creator-api/v1/negotiations`
- `GET pci-creator-api/v1/payables`

Current onboarding commands:

- `POST pci-onboarding-api/v1/creator/bootstrap`
- `POST pci-onboarding-api/v1/creator/invitations/:id/legal-acceptances`

Supabase Auth in browser uses a publishable key with session persistence, token refresh and URL-session detection. Human JWTs are still verified server-side by the Edge Functions.

## Dashboard live-data composition

No new dashboard RPC was introduced in 1N foundation.

The UI composes the existing safe Creator read models in parallel:

- open opportunity count = current `creator_opportunities` items;
- in-review count = submissions in `submitted` / `under_review`;
- changes count = submissions in `changes_requested`;
- receivable = non-paid/non-cancelled Creator payables;
- attention = change requests + live workspace offers + payment-destination confirmations needed.

If multiple currencies are simultaneously outstanding, the summary does not add unlike currencies; it displays `Ver pagos` instead.

## Demo/runtime rule

`config.js` currently has `demoMode: true`.

This is deliberate while PCI remains runtime-unvalidated. The approved UI is usable for visual development without connecting to production.

When a disposable Supabase runtime is available:

1. set a publishable key and test URLs;
2. set `demoMode: false`;
3. run the 1M onboarding test gate;
4. verify dashboard read-model hydration;
5. do not point this frontend at production until the Creator Security Gate passes.

## Remaining Phase 1N work

The shell and onboarding foundation do **not** close 1N yet.

Remaining Creator screens:

- Opportunity list + exact brief detail + join action;
- My Work list + submission detail + V1/V2 timeline + upload/finalize UX;
- Review feedback + requested-change flow;
- Conversations + formal-offer distinction;
- Offer detail / reject / counter / accept UX;
- Payments + payment-account confirmation + payout history/proofs;
- My Account;
- route-level session guard and active-relationship gate;
- mobile interaction pass and accessibility pass.

The next frontend slice should be **Opportunities → Brief → Join → Create Submission**, because it is the first task a newly activated Creator performs.
