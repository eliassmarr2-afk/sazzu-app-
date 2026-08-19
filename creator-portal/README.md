# Protocol Creative Insights — Creator Portal

**Phase:** 1N — Creator Portal frontend  
**Status:** IN PROGRESS / RUNTIME UNVALIDATED  
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

The Creator dashboard is operational rather than analytical. It answers:

1. What opportunities can I take?
2. What is Protocol waiting for from me?
3. Is there an offer I need to answer?
4. Is there money waiting for me?

Internal ROAS/CPA/L1/L2/L3 and attribution analytics do not belong in this portal.

## Current surfaces

### `index.html` — Dashboard

Responsive Creator dashboard with:

- persistent desktop sidebar;
- compact mobile header + five-item bottom navigation;
- summary cards;
- `Requiere tu atención` queue;
- opportunity cards;
- live read-model hydration when demo mode is disabled.

Opportunity actions route to the exact brief. `changes_requested` attention actions route directly to the exact Submission in `works/`.

### `auth/accept-invitation/` — Auth/onboarding

Implements the 1M onboarding contract:

`Auth → PCI bootstrap → exact legal documents → acceptance → workspace relationship ACTIVE → Creator portal`

The raw PCI invitation token is removed from the visible URL after successful bootstrap. Legal-document links are restricted to `http:`, `https:` or safe relative/hash paths.

### `opportunities/` — Opportunities + exact Brief

Capabilities:

- Creator-safe opportunity list;
- search and participation-state filters;
- open vs invite-only distinction;
- exact brief detail;
- base acquisition price;
- target number of assets (`slots_available` is not presented as remaining seats);
- objective / angle / hook;
- technical format;
- acceptance criteria;
- rights package snapshot;
- performance-bonus policy;
- pre-purchase revision allowance;
- exact accepted revision.

Creator flow:

`Open consignment → Quiero participar → Participation ACTIVE`

or

`Invite-only participation → Aceptar invitación → Participation ACTIVE`

then

`Participation ACTIVE → Crear mi entrega → Submission DRAFT`

The page also reads existing Creator submissions and does not offer another accidental draft when a non-withdrawn Submission already exists.

### `works/` — Mis trabajos + version lineage

Responsive list/detail surface for Creator Submissions.

List:

- brief title from the exact accepted revision;
- concept label;
- current state;
- current version;
- filters for action / review / closed;
- search;
- direct navigation by `?id=<submission_id>`.

Detail:

- Submission state;
- exact accepted brief revision;
- concept note;
- immutable V1/V2/etc timeline;
- original filename;
- file size / duration / dimensions when known;
- SHA-256 fingerprint when finalized;
- technical invalidity when applicable;
- Creator-visible Review decisions and feedback only.

Internal summaries, operator identities and internal notes are not requested or rendered.

## Creator media upload flow

`works/` connects the existing 1G backend upload contract to the Creator UI.

```text
Submission DRAFT / CHANGES_REQUESTED
  ↓
select MP4 or MOV
  ↓
client validates type + <= 250 MiB
  ↓
read duration / dimensions
  ↓
reserve exact immutable Version
  ↓
backend returns signed TUS context
  ↓
SHA-256 incremental Worker + TUS upload run in parallel
  ↓
backend verifies exact Storage object / size / MIME
  ↓
finalize_submission_version
  ↓
Version READY
Submission SUBMITTED
```

For a requested revision:

```text
V1 READY
  ↓
CHANGES_REQUESTED
  ↓
V2 reserved on a new immutable path
  ↓
V2 READY
  ↓
SUBMITTED again
```

V1 is never overwritten.

### TUS transport

`upload-client.js` uses a pinned `tus-js-client@4.3.1` browser module.

Rules:

- direct Storage TUS endpoint supplied by `pci-creator-api`;
- signed token sent as `x-signature`;
- `x-upsert: false`;
- 6 MiB chunks from the server upload context;
- progress callbacks;
- retry delays;
- `findPreviousUploads()` / resume;
- custom fingerprint includes `submission_version_id` so the same local file cannot resume a different PCI version;
- fingerprint removed after successful upload.

### SHA-256

`hash-worker.js` calculates SHA-256 incrementally using `hash-wasm@4.12.0` in a Web Worker with 4 MiB slices.

The whole 250 MiB file is not intentionally loaded into the UI main thread just to calculate its fingerprint.

Hashing and TUS transfer run concurrently after the immutable version has been reserved.

### Upload retry state

A signed upload reservation is kept only in `sessionStorage`, scoped to the exact `submission_version_id`, with:

- signed upload context;
- expected local filename / size / lastModified / MIME;
- creation time;
- whether the TUS transfer completed.

It is never stored in `localStorage` and must never be logged.

Within the same browser tab/session:

- a failed/interrupted TUS upload reuses the same reserved version;
- the same local file is required for resume;
- a completed upload with failed `finalize` retries only hash/verification/finalization;
- no new V2/V3 is reserved merely because the first HTTP response was lost.

If a Version is already `uploading` but the browser no longer has a usable signed reservation (for example after a full browser/tab loss or token expiry), the current frontend **does not reserve another version silently**. It asks for the same file and can attempt backend finalization if the object had actually completed.

A fully interrupted upload after complete loss of the browser-side signed context still requires runtime validation and likely a narrow signed-context refresh route before external pilot. This is deliberately tracked rather than hidden.

## Frozen brief context invariants

Creator work history must never change retroactively when Protocol publishes a later Consignment revision.

Current read rules:

- before participation: opportunity shows current published revision;
- participation `invited` / `active`: opportunity shows `consignment_participations.consignment_revision_id`;
- Submission list/detail always resolve the exact participation revision.

Therefore a Submission created under Rev.1 remains visibly Rev.1 even if Protocol later publishes Rev.2.

## Browser/API boundary

`config.js` may eventually contain only safe public runtime configuration:

- Supabase project URL;
- Supabase **publishable** key;
- PCI Edge Function public URLs.

It must never contain:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `PCI_INVITATION_TOKEN_KEY`;
- `PCI_PAYMENT_DATA_KEY`;
- `PCI_WORKER_SECRET`;
- any database/service secret.

`api-client.js` currently uses safe Creator reads and commands through PCI Edge Functions only. Mutation calls generate a UUID idempotency key and send the same value in `Idempotency-Key` and JSON.

No Creator frontend performs direct commercial table writes.

## Dashboard live-data composition

The dashboard composes existing safe Creator read models rather than introducing a broad dashboard RPC.

- open opportunities = current `creator_opportunities` items;
- in review = submissions in `submitted` / `under_review`;
- changes requested = submissions in `changes_requested`;
- attention = change requests + live workspace offers + payment-destination confirmations needed;
- amount receivable = each non-paid/non-cancelled Payable minus allocations belonging to confirmed payouts for that exact Payable.

A partially paid obligation therefore does not inflate `Por cobrar` back to the original amount. Multiple currencies are never summed together.

## Demo/runtime rule

`config.js` remains `demoMode: true` while PCI is runtime-unvalidated.

Before any real Creator pilot:

1. create the explicitly approved disposable Supabase runtime;
2. apply all PCI migrations and Edge Functions;
3. configure only the test publishable key + test function URLs;
4. set `demoMode: false`;
5. run 1M onboarding/Auth adversarial tests;
6. test open + invite-only opportunity flows;
7. test V1/V2 reservation, TUS resume, Storage verification and finalize;
8. test refresh during upload, network loss, lost HTTP response, finalize retry and full tab/browser loss;
9. verify no duplicate Version can be created from retries;
10. run Creator Security Gate before pointing the portal to production.

## Phase 1N completed slices

- Dashboard desktop/mobile foundation;
- Auth invitation + legal onboarding UX;
- Dashboard live read-model composition;
- Opportunities → exact Brief → Join/Accept invitation → Submission DRAFT;
- **Mis trabajos → Submission detail → V1/V2 timeline → signed resumable upload → finalize → SUBMITTED**;
- Creator-visible Review feedback inside Submission timeline.

Phase 1N remains **IN PROGRESS / RUNTIME UNVALIDATED**.

## Remaining Phase 1N work

- Creator rights-declaration UX on finalized versions;
- Review/preselection next-action UX;
- Conversations + formal-offer distinction;
- Offer detail / reject / counter / accept UX;
- Payments + payment-account confirmation + payout history/proofs;
- My Account;
- complete route-level session/active-relationship gate consistency;
- final mobile interaction + accessibility pass.

## Next slice

**Creator rights declaration + review/preselection action context**

This is the missing Creator-facing bridge between a finalized version and the commercial flow. Once rights are declared and Protocol clears/preselects the exact version, the following slice can build Conversations + formal offers without skipping a required business state.