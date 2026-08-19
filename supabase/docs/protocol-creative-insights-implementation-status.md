# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1N — Creator Portal frontend — IN PROGRESS / RUNTIME UNVALIDATED**

Backend phases through **1M** remain code-complete. Phase 1N is implementing the external Creator experience against that backend without touching production.

Current lifecycle represented in code:

`Protocol invitation → Supabase Auth → exact legal acceptance → Creator ACTIVE → opportunity/brief → participation → Submission → immutable V1/V2 upload → creative review/revisions → Creator rights declaration → Protocol rights clearance → preselection → negotiation/messages → immutable formal offer/counteroffer → atomic acceptance → Purchase + Payable + Rights pending_payment → payment destination confirmation → manual payout → Payable paid → Rights active → Creative Asset provisioning → worker copy → Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## Architectural boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` and `authenticated` have no direct PCI business-table/function grants.
- Browser clients never receive `service_role`.
- Creator identity is derived server-side from Supabase Auth.
- Auth is not authorization; commercial commands require valid Creator/workspace state.
- Accepted brief revisions, versions, declarations, reviews, offers, purchases and payment evidence remain immutable/append-only where required.
- Production remains untouched until disposable-runtime validation and Creator Security Gate completion.

## API/machine surfaces

### `pci-admin-api`
Internal Protocol API for review, rights clearance, negotiation/offers, payments, playback and purchased assets.

### `pci-creator-api`
External Creator API for opportunities, participation, submissions, signed upload/finalization, rights declaration, negotiation/offers and payment actions/visibility.

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

Dashboard calculates receivable net of confirmed payout allocations and never sums unlike currencies.

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

Upload safeguards:

- `tus-js-client@4.3.1`;
- signed `x-signature`;
- `x-upsert:false`;
- 6 MiB chunks;
- resume fingerprint scoped by `submission_version_id`;
- SHA-256 Web Worker with `hash-wasm@4.12.0`;
- signed reservation only in `sessionStorage`;
- retries/finalize do not create accidental V2/V3.

Full browser-loss recovery for a genuinely incomplete TUS upload remains a runtime test-gate item.

### 1N.5 — Rights declaration + clearance/preselection context

Visible progression:

`Version READY → Creator factual rights/origin declaration → Protocol clearance → Creative preselection → ready for negotiation`

Creative review and rights clearance remain separate tracks.

Rights declaration schema v1 validates:

- origin/authorship;
- third-party assets + authorization;
- music/audio + commercial-use confirmation;
- generative AI + tool;
- identifiable people + adult/permission confirmation;
- factual accuracy certification.

Missing/unexpected keys are rejected. The MVP excludes identifiable minors.

The declaration is evidence for an exact Version; it is not a transfer of rights. Any existing Rights Grant locks later edits.

Creator-safe detail exposes declaration/clearance history without reviewer identities, internal notes or internal summaries.

Dashboard attention includes missing declaration and `flagged` clearance, but not ordinary `pending` clearance after Creator submission.

### 1N.6 — Conversations + Formal Offer UX

Implemented route:

`creator-portal/conversations/`

Primary product rule:

> Chat contextual is not contractual. A Formal Offer is a distinct commercial object.

Desktop separates chat and Commercial Agreement into different columns. Mobile renders the Formal Offer as a structured commercial block above chat, never as a message bubble.

Conversation list/detail supports:

- exact accepted brief title/revision;
- exact current Version context;
- Creator-safe message history;
- message composer for open negotiations;
- live-offer action state;
- immutable offer history.

Formal Offer UI displays:

- amount/currency;
- proposed-by side;
- exact Version number;
- filename;
- SHA-256;
- Version identifier;
- expiry;
- rights snapshot;
- payment snapshot;
- bonus/performance snapshot;
- commercial terms.

Actions:

- message;
- reject live workspace offer;
- counter live workspace offer;
- two-step accept confirmation.

Creator counteroffer preserves exact Version, item terms, rights and payment snapshots; only amount + optional note change.

A live Creator counteroffer renders as `esperando Protocol` and exposes no action buttons against the Creator's own offer.

A `sent` offer whose `expires_at` is already elapsed is treated as expired/non-actionable by frontend even before the expiration worker persists the state. Backend revalidates on command execution.

Acceptance uses the existing atomic 1J command:

`Offer accepted + Purchase agreed + Payable awaiting_confirmation + Rights pending_payment + Negotiation closed`

The Creator UI cannot independently create those objects and does not claim Rights are active after acceptance.

Dashboard `OFERTA PENDIENTE` resolves the offer to the exact negotiation before navigation.

Detailed 1N.6 test gate lives in `creator-portal/conversations/README.md`.

## Exact brief/version/commercial invariants retained

- before participation → current published Consignment revision;
- invited/active participation → exact participation revision;
- Submission list/detail → exact participation revision forever;
- media byte identity immutable after READY;
- formal offer references only exact current READY version preselected by Protocol;
- offer item carries V#/SHA/filename snapshot through counteroffers;
- rights declaration immutable after any Rights Grant;
- chat messages cannot mutate offer terms;
- acceptance remains an atomic backend transaction.

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

Migrations `052` and `053` were explicitly re-read after a compare display anomaly and contain the expected SQL.

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
- MIME/size observations;
- mobile resumable upload behavior;
- network/refresh/full-browser-loss recovery;
- rights schema/clearance/lock behavior;
- negotiation message idempotency;
- expired/superseded/live offer behavior;
- counteroffer snapshot preservation;
- atomic acceptance retry/double-click/lost-response behavior;
- Creator A/B cross-account/BOLA isolation;
- payment encryption/decryption;
- payout lifecycle;
- asset worker promotion;
- full state-transition lifecycle.

A local automated JavaScript syntax check for the new Conversations files was attempted but not executed because the container could not retrieve the GitHub branch directly in that environment. The files received connected/manual review only; this does not change `RUNTIME UNVALIDATED` status.

The paid Supabase development branch remains deliberately deferred and must not be created without explicit cost confirmation/approval.

## Security gate before external Creator launch

No Creator pilot before disposable-runtime validation, Auth/BOLA/Storage adversarial tests, legacy public/authenticated RPC audit/hardening, secret/cron cleanup where required, runtime deletion after testing and explicit production approval.

## Next Phase 1N slice

**1N.7 — Payments + payment-account confirmation + payout history/proofs**

Target Creator flow:

`Offer accepted → Purchase/Payable visible → awaiting_confirmation → create/select payout destination → confirm exact destination → ready_to_pay → Protocol transfer → payout history/proof → paid`.

The Creator frontend must never set a Payable to `paid` or activate Rights. Those transitions remain authoritative backend operations.

After 1N.7: My Account, route/session/active-relationship consistency and final mobile/accessibility pass.

Phase 1N remains **IN PROGRESS / RUNTIME UNVALIDATED**.
