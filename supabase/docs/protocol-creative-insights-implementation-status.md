# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1N — Creator Portal frontend — IN PROGRESS / RUNTIME UNVALIDATED**

Backend phases through **1M** remain code-complete. Phase 1N is implementing the external Creator experience against that backend without touching production.

Current lifecycle represented in code:

`Protocol invitation → Supabase Auth → exact legal acceptance → Creator ACTIVE → opportunity/brief → participation → Submission → immutable V1/V2 upload → creative review/revisions → Creator rights declaration → Protocol rights clearance → preselection → negotiation/messages → immutable formal offer/counteroffer → atomic acceptance → Purchase + Payable + Rights pending_payment → Creator payment destination confirmation → Protocol manual payout → partial/full payout ledger → Payable paid → Rights active → Creative Asset provisioning → worker copy → Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## Architectural boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` and `authenticated` have no direct PCI business-table/function grants.
- Browser clients never receive `service_role`.
- Creator identity is derived server-side from Supabase Auth.
- Auth is not authorization; commercial commands require valid Creator/workspace state.
- Accepted briefs, versions, declarations, reviews, offers, purchases and payment evidence remain immutable/append-only where required.
- Production remains untouched until disposable-runtime validation and Creator Security Gate completion.

## API/machine surfaces

### `pci-admin-api`
Internal Protocol API for review, rights clearance, negotiation/offers, payment execution, playback and purchased assets.

### `pci-creator-api`
External Creator API for opportunities, participation, submissions, signed upload/finalization, rights declaration, negotiation/offers, payment destinations and payout visibility.

### `pci-onboarding-api`
Invitation/Auth/legal bootstrap only. No commercial commands.

### `pci-worker`
Internal machine-only outbox worker, currently including Creative Asset promotion.

## Creator Portal visual/product boundary

`creator-portal/` is separate from Protocol Data.

Frozen UI contract:

- dark mode only;
- near-black background;
- dark card surfaces;
- subtle gray borders;
- primary blue `#2479FF`;
- semantic state colors only;
- Montserrat-first typography;
- `border-radius: 5px`;
- desktop + mobile first-class;
- operational UX, not internal analytics.

Creators never receive Protocol Data's internal sidebar, ROAS/CPA/L1/L2/L3 analytics, internal notes or workspace-member capabilities.

## Phase 1N completed slices

### 1N.1 — Dashboard foundation

Desktop/mobile Creator shell, summary cards, `Requiere tu atención`, opportunities and safe demo/live hydration.

Dashboard calculates receivable net of confirmed payout allocations and avoids summing unlike currencies.

### 1N.2 — Auth/onboarding UX

`Invite → Auth → PCI bootstrap → exact legal acceptance → workspace relationship ACTIVE → Dashboard`

Browser uses only a Supabase publishable key. Raw invitation token is removed from the visible URL after bootstrap.

### 1N.3 — Opportunities → Brief → Participation → Submission DRAFT

Implemented safe opportunity search/filters, exact frozen brief, open join, invite-only acceptance, revision preservation, existing-Submission detection and DRAFT creation.

`slots_available` is communicated as the number of assets Protocol seeks to acquire, not fake remaining Creator seats.

### 1N.4 — Mis trabajos → V1/V2 → signed TUS → finalize

Implemented:

`DRAFT / CHANGES_REQUESTED → select MP4/MOV → validate → reserve exact Version → signed TUS + incremental SHA-256 → Storage verification → finalize → Version READY → Submission SUBMITTED`

V1 remains immutable when V2 is created.

Upload safeguards include signed `x-signature`, `x-upsert:false`, 6 MiB chunks, Version-scoped resume fingerprint, SHA-256 Web Worker and signed reservation only in `sessionStorage`.

Full browser-loss recovery for a genuinely incomplete TUS upload remains a runtime test-gate item.

### 1N.5 — Rights declaration + clearance/preselection context

Visible progression:

`Version READY → Creator factual rights/origin declaration → Protocol clearance → Creative preselection → ready for negotiation`

Rights declaration schema v1 validates origin/authorship, third-party assets/authorization, music/audio commercial use, generative AI/tool, identifiable adults/permissions and factual accuracy certification.

Missing/unexpected keys are rejected. The MVP excludes identifiable minors.

The declaration is evidence for an exact Version; it is not a transfer of rights. Any existing Rights Grant locks later edits.

Creator-safe detail exposes declaration/clearance history without reviewer identities, internal notes or internal summaries.

Dashboard attention includes missing declaration and `flagged` clearance, but not ordinary `pending` clearance after Creator submission.

### 1N.6 — Conversations + Formal Offer UX

Implemented route `creator-portal/conversations/`.

Product rule:

> Chat contextual is not contractual. A Formal Offer is a distinct commercial object.

Desktop separates chat and Commercial Agreement into different columns. Mobile renders the Formal Offer as a structured commercial block, never a message bubble.

Formal Offer displays amount/currency, proposed-by side, exact Version, filename, SHA-256, expiry, rights snapshot, payment snapshot, bonus/performance snapshot and commercial terms.

Creator can message, reject, counter and two-step accept a live workspace offer.

Counteroffer preserves exact Version, item terms, rights/payment snapshots; only amount + optional note change.

A Creator counteroffer is shown as waiting for Protocol and exposes no self-action buttons.

Acceptance uses the atomic 1J command:

`Offer accepted + Purchase agreed + Payable awaiting_confirmation + Rights pending_payment + Negotiation closed`.

The UI never claims Rights are active immediately after acceptance.

### 1N.7 — Payments + payment destination + payout history/proofs

Implemented route `creator-portal/payments/`.

Creator flow:

```text
Offer ACCEPTED
  ↓
Purchase AGREED
  ↓
Payable AWAITING_CONFIRMATION
  ↓
create/select payment account
  ↓
confirm exact destination for exact Payable
  ↓
READY_TO_PAY
  ↓
Protocol transfer
  ↓
Payout INITIATED / Payable PROCESSING
  ↓
Payout CONFIRMED
  ↓
partial → remaining obligation continues
full → Payable PAID
```

The Creator cannot create/confirm a Payout, mark a Payable paid or activate Rights.

#### Payment account security

Payment account identity is reusable but immutable after creation. Changed data means new account + optional deactivation of the old one.

Exact account identifiers are encrypted inside `pci-creator-api` with AES-GCM and `PCI_PAYMENT_DATA_KEY` before PostgreSQL storage.

Creator read models expose only masked fields: provider, type, holder, masked document, alias and last 4.

The exact identifier is not persisted in browser `localStorage`/`sessionStorage` and is never returned by Creator reads.

Each Payable confirmation creates append-only evidence and freezes the exact destination snapshot for that obligation.

Reconfirmation is allowed while still `ready_to_pay`; once payment is `processing`, the Creator UI no longer offers destination changes.

#### Authoritative Creator payment ledger

Migration `20260819_055_pci_creator_payment_ledger_projection.sql` makes PostgreSQL project per Payable:

- total amount due;
- confirmed amount;
- inflight amount;
- unpaid amount;
- amount still not scheduled;
- masked frozen destination;
- latest confirmation;
- Purchase + purchased Creative/Version context.

`confirmed_amount` counts only allocations attached to `confirmed` payouts. `initiated` is separate. Failed/reversed payouts do not count as received money.

Partial payments are therefore visible explicitly rather than hidden behind one generic status.

#### Payout proofs

Creator payout history includes provider/method, amount/currency, provider reference, timestamps, masked destination, obligation/creative context and proof availability.

Proof access uses ownership-checked `creator_payout_proof_context()` and a signed private Storage URL valid for 10 minutes. Normal reads expose neither bucket/path nor ciphertext.

#### Currency handling

Payment overview does not add unlike currencies together. Multiple currencies are displayed as separate totals.

#### Mutation retries

Payment commands use `Idempotency-Key`.

The browser payments adapter keeps the same key in memory for the same command+payload across ambiguous/network retries and releases it after a conclusive result. Exact banking identifiers are not persisted for retry purposes.

A complete page/browser loss after an account-create commit whose response was lost remains a runtime test-gate case. If materially reproducible, correct remediation is server-side payment-destination fingerprint/deduplication rather than persisting raw identifiers client-side.

#### Navigation

Dashboard `CONFIRMÁ TU COBRO` routes to the exact `payments/?id=<payable_id>` and highlights that obligation.

A temporary safe navigation shim in `config.js` normalizes remaining legacy `#pagos/#conversaciones` anchors. It derives the portal root from the actual `config.js` URL and therefore does not assume a deployment path.

Detailed financial/security test gate lives in `creator-portal/payments/README.md`.

## Exact commercial/financial invariants retained

- before participation → current published Consignment revision;
- invited/active participation → exact participation revision;
- Submission list/detail → exact participation revision forever;
- media byte identity immutable after READY;
- formal offer references only exact current READY/preselected/cleared Version;
- offer item carries V#/SHA/filename snapshot through counteroffers;
- rights declaration immutable after any Rights Grant;
- chat messages cannot mutate offer terms;
- offer acceptance remains atomic backend transaction;
- payment destination confirmation is append-only and Payable-scoped;
- only confirmed payouts reduce confirmed balance;
- Creator cannot mark payment as completed or activate Rights.

## Phase 1N support migrations after backend Phase 1M

- `20260819_047_pci_join_open_or_invited_consignment.sql`
- `20260819_048_pci_creator_opportunities_keep_active_invites.sql`
- `20260819_049_pci_submission_detail_frozen_brief_context.sql`
- `20260819_050_pci_creator_submissions_frozen_brief_projection.sql`
- `20260819_051_pci_creator_rights_declaration_v1_and_safe_projection.sql`
- `20260819_052_pci_creator_rights_declaration_required_keys_hardening.sql`
- `20260819_053_pci_creator_submissions_rights_action_projection.sql`
- `20260819_054_pci_creator_negotiation_commercial_projection.sql`
- `20260819_055_pci_creator_payment_ledger_projection.sql`

All previous PCI migrations remain in the branch. None have been applied to production.

## Safe browser boundary

`creator-portal/config.js` remains `demoMode:true` while runtime validation is deferred.

Browser config may contain only Supabase URL, publishable key and Edge Function public URLs.

It must never contain service-role, invitation-HMAC, payment-encryption, worker or database secrets.

Commercial writes continue through authenticated PCI Edge Functions. No direct browser business-table writes were added.

## Validation status

Everything remains **Git-only / runtime-unvalidated**.

The concentrated disposable-runtime window still must prove:

- SQL compilation/migration ordering;
- Edge Function runtime/CORS;
- Auth redirect/onboarding email behavior;
- private signed TUS Storage behavior;
- network/refresh/full-browser-loss upload recovery;
- rights schema/clearance/lock behavior;
- negotiation message idempotency;
- expired/superseded/live offer behavior;
- counteroffer snapshot preservation;
- atomic acceptance retry/double-click/lost-response behavior;
- payment AES-GCM encryption/decryption;
- account create/reconfirm/deactivate behavior;
- partial/full/failed/reversed payout accounting;
- payout proof access/expiry;
- payment account ambiguous-response/full-page-loss behavior;
- Creator A/B cross-account/BOLA isolation across every new surface;
- asset worker promotion;
- full state-transition lifecycle.

No local automated JS/runtime validation is being claimed. Connected/manual code review does not change `RUNTIME UNVALIDATED` status.

The paid Supabase development branch remains deliberately deferred and must not be created without explicit cost confirmation/approval.

## Known Phase 1N cleanup item

The older Dashboard receivable helper still excludes legacy `cancelled`; its canonical `voided` exclusion must be folded into the final consistency pass. The Payments page itself uses authoritative 1N.7 ledger fields and is not affected by that helper.

## Security gate before external Creator launch

No Creator pilot before disposable-runtime validation, Auth/BOLA/Storage/payment adversarial tests, legacy public/authenticated RPC audit/hardening, secret/cron cleanup where required, runtime deletion after testing and explicit production approval.

## Next Phase 1N slice

**1N.8 — My Account + route/session/active-relationship consistency + final mobile/accessibility pass**

Target:

- build Creator account/profile surface from existing safe identity/legal/payment metadata;
- unify all navigation paths and remove compatibility placeholders where possible;
- apply consistent authenticated/ACTIVE relationship gate to every Creator route;
- correct final Dashboard financial/state edge cases including `voided`;
- keyboard/focus/dialog/accessibility review;
- mobile safe-area, sticky controls and long-content review;
- freeze the Creator Portal frontend contract before disposable runtime validation.

After 1N.8, Phase 1N can be considered **CODE COMPLETE / RUNTIME UNVALIDATED** and the next major move should be the explicitly approved disposable-runtime validation window, not additional production coding.
