# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1N — Creator Portal frontend — IN PROGRESS / RUNTIME UNVALIDATED**

Backend phases through **1M** remain code-complete. Phase 1N is implementing the external Creator experience against that backend without touching production.

Current lifecycle represented in code:

`Protocol invitation → Supabase Auth → exact legal acceptance → Creator ACTIVE → opportunity/brief → participation → Submission → immutable V1/V2 upload → creative review/revisions → Creator rights declaration → Protocol rights clearance → preselection → negotiation → immutable formal offer/counteroffer → atomic acceptance → Purchase + Payable + Rights pending_payment → payment destination confirmation → manual payout → Payable paid → Rights active → Creative Asset provisioning → worker copy → Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## Architectural boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` and `authenticated` have no direct PCI business-table/function grants.
- Browser clients never receive `service_role`.
- Creator identity is derived server-side from Supabase Auth.
- Auth is not authorization; commercial commands require valid Creator/workspace state.
- Accepted brief revisions, media versions, declarations, reviews, offers, purchases and payment evidence retain immutable/append-only history where required.
- Production remains untouched until disposable-runtime validation and the Creator Security Gate are complete.

## API/machine surfaces

### `pci-admin-api`
Internal Protocol API for review, rights clearance, negotiation/offers, payments, playback and purchased assets.

### `pci-creator-api`
External Creator API for opportunities, participation, submissions, signed upload/finalization, rights declaration, negotiation/offers and payment actions/visibility.

### `pci-onboarding-api`
Invitation/Auth/legal bootstrap only. It intentionally exposes no commercial commands.

### `pci-worker`
Internal machine-only surface for outbox side effects, currently Creative Asset promotion.

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

Implemented desktop/mobile Creator shell, summary cards, `Requiere tu atención`, opportunities and demo/live safe hydration.

The Dashboard composes safe read models and calculates receivable net of confirmed payout allocations. Multiple currencies are not incorrectly summed.

### 1N.2 — Auth/onboarding UX

Implemented:

`Invite → Auth → PCI bootstrap → exact legal acceptance → workspace relationship ACTIVE → Dashboard`

Browser uses only a Supabase publishable key. Raw PCI invitation token is removed from the visible URL after bootstrap.

### 1N.3 — Opportunities → Brief → Participation → Submission DRAFT

Implemented Creator-safe opportunity search/filters, exact accepted brief, open join, invite-only acceptance, exact revision preservation, existing-Submission detection and DRAFT creation.

`slots_available` is shown as the number of assets Protocol seeks to acquire, not fake remaining Creator seats.

### 1N.4 — Mis trabajos → V1/V2 → signed TUS → finalize

Implemented:

`DRAFT / CHANGES_REQUESTED → select MP4/MOV → validate → reserve exact Version → signed TUS + incremental SHA-256 → backend Storage verification → finalize → Version READY → Submission SUBMITTED`

For requested revisions, V1 remains immutable and V2 gets a new backend-generated path.

Upload safeguards include:

- `tus-js-client@4.3.1`;
- signed `x-signature` token;
- `x-upsert:false`;
- 6 MiB chunks;
- resume fingerprint scoped by `submission_version_id`;
- SHA-256 Web Worker using `hash-wasm@4.12.0`;
- signed reservation only in `sessionStorage`;
- retry/finalize semantics that do not create accidental V2/V3.

Full browser-loss recovery for a genuinely incomplete TUS transfer remains a runtime test-gate item.

### 1N.5 — Rights declaration + review/preselection context

Implemented inside `creator-portal/works/`.

Visible progression:

```text
Version READY
  ↓
Creator rights/origin declaration
  ↓
Protocol rights clearance
  ↓
Creative preselection
  ↓
Ready for negotiation
```

Creative review and rights clearance remain separate tracks. Preselection is not a purchase and does not bypass clearance.

When the Submission is `changes_requested`, the portal does not ask the Creator to declare the old version that must be replaced; declaration is requested after the replacement V becomes READY.

#### Rights declaration schema v1

The database now validates a strict factual schema:

- Creator authorship/origin;
- third-party assets + authorization;
- music/audio source + commercial-use confirmation;
- generative-AI use + tool;
- identifiable people + adult/permission confirmations;
- factual accuracy certification.

The frontend performs matching local validation before sending the command.

The declaration is evidence about an exact `submission_version_id`. It is not the Creator legal agreement and does not transfer rights by itself.

Any existing Rights Grant locks the declaration against further edits.

Editing before that lock resets clearance to `pending`, requiring Protocol review again.

#### Creator-safe clearance projection

`creator_submission_detail()` now returns:

- Creator's own declaration;
- declaration submission timestamp;
- `rights_declaration_locked`;
- current clearance status;
- append-only Creator-facing clearance history/reason.

It does not return Protocol reviewer identity, internal notes or internal summaries.

A `flagged` clearance reason is explicitly Creator-facing corrective feedback. Private analysis belongs in `pci.internal_notes`.

#### Dashboard rights actions

`creator_submissions()` exposes only minimum list-safe rights state, not the declaration JSON.

Dashboard `Requiere tu atención` now includes:

- missing declaration on current READY version;
- `flagged` clearance requiring Creator correction.

A normal `pending` clearance after declaration is not shown as Creator work because the next action belongs to Protocol.

#### Save/refresh semantics

After a declaration command returns success, the UI immediately reflects `pending`. A later GET refresh failure cannot falsely report that the declaration failed.

## Exact brief/version invariants retained

- Before participation → current published Consignment revision.
- Invited/active participation → exact `consignment_participations.consignment_revision_id`.
- Submission list/detail → exact participation revision forever.
- V1/V2 media byte identity remains immutable after READY.
- A formal offer can reference only the exact current READY version explicitly preselected by Protocol.
- Rights declaration becomes immutable once any Rights Grant exists.

## New Phase 1N support migrations

After backend Phase 1M:

- `20260819_047_pci_join_open_or_invited_consignment.sql`
- `20260819_048_pci_creator_opportunities_keep_active_invites.sql`
- `20260819_049_pci_submission_detail_frozen_brief_context.sql`
- `20260819_050_pci_creator_submissions_frozen_brief_projection.sql`
- `20260819_051_pci_creator_rights_declaration_v1_and_safe_projection.sql`
- `20260819_052_pci_creator_rights_declaration_required_keys_hardening.sql`
- `20260819_053_pci_creator_submissions_rights_action_projection.sql`

All prior PCI migrations `001–046` remain part of the branch.

None have been applied to production.

## Safe browser boundary

`creator-portal/config.js` remains `demoMode:true` while runtime validation is deferred.

Browser config may eventually contain only Supabase URL, publishable key and Edge Function URLs.

It must never contain service-role, PCI invitation-HMAC, payment-encryption, worker or database secrets.

Commercial writes continue through authenticated PCI Edge Functions. No direct browser business-table writes were added.

## Validation status

Everything remains **Git-only / runtime-unvalidated**.

The concentrated disposable-runtime window still must prove:

- SQL compilation and migration order;
- Edge Function runtime/CORS;
- Auth redirects and onboarding email behavior;
- signed TUS against private Storage;
- MIME/size observations;
- mobile resumable behavior;
- network/refresh/full-browser-loss upload recovery;
- rights schema valid/invalid payloads;
- rights resubmission/flagged/complete/lock behavior;
- Creator A/B cross-account/BOLA isolation;
- payment encryption/decryption;
- asset worker promotion;
- complete state-transition/idempotency lifecycle.

The paid Supabase development branch remains deliberately deferred and must not be created without explicit cost confirmation/approval.

## Security gate before external Creator launch

No Creator pilot before disposable-runtime validation, adversarial Auth/BOLA/Storage tests, legacy public/authenticated RPC audit/hardening, secret/cron cleanup where required, runtime deletion after testing and explicit production approval.

## Next Phase 1N slice

**1N.6 — Conversations + formal offer UX**

Primary UX rule:

> Chat contextual is not contractual. A formal offer is a distinct commercial object.

Target Creator flow:

`Preselected + clearance complete → Negotiation → messages → formal offer card → exact Version/price/currency/rights/payment/expiry → accept / reject / counter`.

The UI must make it visually impossible to confuse a chat message with a binding acquisition offer.

After that: Payments + payment-account confirmation/history, My Account, route/security consistency and final mobile/accessibility pass.

Phase 1N remains **IN PROGRESS / RUNTIME UNVALIDATED**.