# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-19  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1N — Creator Portal frontend — IN PROGRESS / RUNTIME UNVALIDATED**

Backend phases through **1M** remain code-complete. Phase 1N is implementing the external Creator experience against that backend without touching production.

Current business lifecycle represented in code:

`Protocol invitation → Supabase Auth → exact legal acceptance → Creator ACTIVE → opportunity/brief → participation → Submission → immutable V1/V2 upload → review/revisions → preselection → rights clearance → negotiation → formal offer/counteroffer → atomic acceptance → Purchase + Payable + Rights pending_payment → payment destination confirmation → manual payout → Payable paid → Rights active → Creative Asset provisioning → worker copy → Asset available → Submission acquired → Purchase settled.`

Meta Ads execution remains explicitly out of scope.

## Architectural boundary

- `pci` is the private authoritative domain schema.
- `pci_api` is the minimal service-role-only RPC surface.
- Creator is an external counterparty, never a `protocol_workspace_member`.
- `anon` and `authenticated` have no direct PCI business-table/function grants.
- Browser clients never receive `service_role`.
- Creator identity is derived server-side from Supabase Auth.
- Auth is not authorization; commercial commands still require valid Creator/workspace state.
- Versions, accepted briefs, reviews, offers, purchases, payment evidence and events preserve immutable/append-only history where required.
- Production remains untouched until disposable-runtime validation and the Creator Security Gate are complete.

## API/machine surfaces

### `pci-admin-api`

Internal Protocol API for review, rights clearance, negotiation/offers, payment execution, playback and purchased assets.

### `pci-creator-api`

External Creator API for opportunities, participation, submissions, signed upload/finalization, rights declaration, negotiation/offers and payment actions/visibility.

### `pci-onboarding-api`

Invitation/Auth/legal bootstrap boundary only. It intentionally exposes no commercial commands.

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

Implemented desktop/mobile Creator shell, operational summary, attention queue, opportunity cards, safe demo/live hydration and partial-payout-aware receivable composition.

### 1N.2 — Auth/onboarding UX

Implemented:

`Invite → Auth → PCI bootstrap → exact legal acceptance → workspace relationship ACTIVE → Dashboard`

Browser uses only a Supabase publishable key. Raw PCI invitation token is removed from the visible URL after bootstrap.

### 1N.3 — Opportunities → Brief → Participation → Submission DRAFT

Implemented:

- Creator-safe opportunity list/search/filters;
- exact brief detail;
- open participation;
- explicit invite-only acceptance;
- exact accepted revision preservation;
- existing-Submission detection;
- Submission DRAFT creation;
- desktop/mobile navigation.

`slots_available` is rendered as the number of assets Protocol seeks to acquire, not fake remaining Creator seats.

### 1N.4 — Mis trabajos → V1/V2 → signed resumable upload → finalize

Implemented route:

`creator-portal/works/`

List/detail supports:

- exact accepted brief title/revision;
- Submission state;
- concept label/note;
- immutable V1/V2/etc timeline;
- original filename;
- size / duration / dimensions;
- finalized SHA-256 fingerprint;
- technical-invalid state;
- Creator-visible review decisions/feedback;
- no internal summaries/operator identity/internal notes.

Upload flow:

```text
DRAFT / CHANGES_REQUESTED
  ↓
select MP4/MOV
  ↓
client type/size validation
  ↓
read video metadata
  ↓
reserve exact immutable Version
  ↓
signed TUS context from pci-creator-api
  ↓
SHA-256 Worker + TUS transfer in parallel
  ↓
backend verifies exact Storage object, size and MIME
  ↓
finalize
  ↓
Version READY
Submission SUBMITTED
```

For a revision request:

`V1 remains immutable → reserve V2 on a new backend-generated path → V2 READY → SUBMITTED again`.

### Upload transport/retry design

- `tus-js-client@4.3.1` pinned in browser module import;
- direct Storage resumable endpoint supplied by backend;
- signed `x-signature` token;
- `x-upsert: false`;
- 6 MiB chunks;
- progress + retry + `findPreviousUploads()` resume;
- custom TUS fingerprint includes `submission_version_id`, preventing one local file from resuming a different PCI version;
- SHA-256 calculated incrementally in `hash-worker.js` with `hash-wasm@4.12.0` and 4 MiB slices;
- hash and transfer run concurrently after reservation;
- browser does not intentionally materialize an entire 250 MiB file in the UI thread just for hashing.

A signed reservation is stored only in `sessionStorage` for its exact version. It records the expected local file and whether TUS completed.

Within that browser session:

- interrupted upload reuses the same version;
- same file is required to resume;
- successful transfer + failed finalize retries verification/finalize only;
- retries do not create V2/V3 accidentally.

If an `uploading` Version exists but its browser-side signed context is gone/expired, the frontend refuses to reserve another Version silently. Full browser/tab-loss recovery of an incomplete TUS upload remains an explicit **runtime test-gate item** and may require a narrow signed-context refresh route before pilot.

## Exact brief-revision invariant

A Creator must never have an accepted brief changed retroactively.

Projection rule now applies across Opportunities and My Work:

- before participation → current published revision;
- invited/active participation → exact `consignment_participations.consignment_revision_id`;
- Submission list/detail → exact participation revision forever.

Therefore Protocol publishing Rev.2 cannot rewrite a Submission created under Rev.1.

## 1N database support migrations

Added after backend Phase 1M:

- `20260819_047_pci_join_open_or_invited_consignment.sql`
- `20260819_048_pci_creator_opportunities_keep_active_invites.sql`
- `20260819_049_pci_submission_detail_frozen_brief_context.sql`
- `20260819_050_pci_creator_submissions_frozen_brief_projection.sql`

All previous PCI migrations `001–046` remain part of the branch.

None have been applied to production.

## Safe browser boundary

`creator-portal/config.js` remains `demoMode: true` while runtime validation is deferred.

Browser runtime may eventually contain only safe public config such as Supabase URL, publishable key and Edge Function URLs.

It must never contain service-role, PCI invitation-HMAC, payment-encryption, worker or database secrets.

Commercial writes continue through authenticated Edge Functions; no direct browser business-table writes were introduced.

## Validation status

Everything is still **Git-only / runtime-unvalidated**.

The following remain unproven until the concentrated disposable-runtime window:

- SQL compilation/migration ordering;
- Edge Function runtime;
- Auth redirect/onboarding email behavior;
- CORS;
- signed TUS against real private Storage;
- Storage MIME/size observations;
- resumable URL behavior on target mobile browsers;
- upload refresh/network-loss/full-browser-loss recovery;
- cross-account/BOLA attempts;
- payment encryption/decryption;
- worker asset promotion;
- end-to-end state transitions.

The paid Supabase development branch remains deliberately deferred. It must not be created without explicit cost confirmation/approval.

## Security gate before external Creator launch

No Creator pilot before:

1. approved disposable Supabase runtime;
2. all PCI migrations/functions applied successfully;
3. onboarding adversarial matrix;
4. Creator A/B cross-account/BOLA tests;
5. signed upload/read Storage isolation tests;
6. network-loss/retry/idempotency tests;
7. legacy public/authenticated RPC audit/hardening;
8. cron/secrets migration/rotation where required;
9. runtime deletion after validation;
10. explicit production approval.

## Next Phase 1N slice

**Creator rights declaration + review/preselection action context**

Why this is next:

A finalized Version can already become `READY` and receive review feedback, but the Creator still needs a clear UI to declare origin/rights for that exact Version. That declaration is a required bridge before Protocol can clear rights and issue a formal offer.

Target progression:

`Version READY → Creator rights declaration → clearance pending → Protocol review/preselection context → ready for Negotiation/Conversations frontend`.

After that, build **Conversations + formal offer/reject/counter/accept UX**, followed by Payments and Account.

Phase 1N remains **IN PROGRESS**.