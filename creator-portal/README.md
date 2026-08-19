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

Responsive Creator dashboard with desktop sidebar, compact mobile header + bottom navigation, summary cards, `Requiere tu atención`, opportunities and live read-model hydration.

Attention can now include:

- requested creative changes;
- missing rights declaration on the current READY version;
- `flagged` rights clearance requiring Creator correction;
- live formal offer;
- payment-destination confirmation.

Rights actions route directly to the exact Submission in `works/`.

### `auth/accept-invitation/` — Auth/onboarding

Implements:

`Auth → PCI bootstrap → exact legal documents → acceptance → workspace relationship ACTIVE → Creator portal`

The raw PCI invitation token is removed from the visible URL after successful bootstrap. Legal-document links are restricted to `http:`, `https:` or safe relative/hash paths.

### `opportunities/` — Opportunities + exact Brief

Capabilities:

- Creator-safe opportunity list;
- search and participation-state filters;
- open vs invite-only distinction;
- exact accepted brief detail;
- base acquisition price;
- target number of assets (`slots_available` is not presented as remaining seats);
- objective / angle / hook;
- technical format;
- acceptance criteria;
- rights package snapshot;
- performance-bonus policy;
- pre-purchase revision allowance.

Creator flow:

`Open consignment → Quiero participar → Participation ACTIVE`

or

`Invite-only participation → Aceptar invitación → Participation ACTIVE`

then

`Participation ACTIVE → Crear mi entrega → Submission DRAFT`

The page reads existing submissions and avoids accidental duplicate drafts.

### `works/` — Mis trabajos + version lineage

Responsive list/detail surface for Creator Submissions.

List:

- exact accepted brief title/revision;
- concept label;
- current state;
- current version;
- filters/search;
- direct navigation by `?id=<submission_id>`.

Detail:

- Submission state;
- exact accepted brief revision;
- immutable V1/V2/etc timeline;
- original filename;
- file size / duration / dimensions;
- finalized SHA-256;
- technical invalidity;
- Creator-visible Review decisions/feedback only;
- Creator rights declaration + clearance state for the exact current version.

Internal summaries, reviewer identities and internal notes are not requested or rendered.

## Creator media upload flow

```text
DRAFT / CHANGES_REQUESTED
  ↓
select MP4/MOV
  ↓
client validation + video metadata
  ↓
reserve exact immutable Version
  ↓
signed TUS context
  ↓
SHA-256 Worker + TUS transfer in parallel
  ↓
backend verifies exact Storage object / size / MIME
  ↓
finalize
  ↓
Version READY
Submission SUBMITTED
```

For a requested revision:

`V1 remains immutable → reserve V2 on a new path → V2 READY → SUBMITTED again`.

### Upload transport/retry

- `tus-js-client@4.3.1`;
- direct Storage resumable endpoint;
- signed `x-signature` token;
- `x-upsert: false`;
- 6 MiB chunks;
- progress/retry/`findPreviousUploads()`;
- custom fingerprint includes `submission_version_id`;
- SHA-256 calculated incrementally in `hash-worker.js` using `hash-wasm@4.12.0` with 4 MiB slices;
- hash and upload run concurrently;
- signed reservation lives only in `sessionStorage` for the exact version.

Within the same browser session, retries reuse the same version. Successful transfer + failed finalize retries verification/finalize only.

If an `uploading` Version exists but browser signed context is gone/expired, the UI refuses to silently create another version. Full browser-loss recovery remains a runtime test-gate item and may require a narrow signed-context refresh route before pilot.

## 1N.5 — Creator rights declaration + review/preselection context

Rights declaration is factual evidence about an exact immutable `submission_version_id`; it is not the versioned legal agreement and does not transfer rights by itself.

Current visible progression:

```text
Video READY
  ↓
Creator declaration
  ↓
Rights clearance
  ↓
Creative preselection
  ↓
Negotiation
```

Creative review and rights clearance are distinct tracks. A version can be preselected while clearance is still pending, but a formal offer cannot advance until the required clearance is complete.

If the Submission is `changes_requested`, the portal does not ask the Creator to spend time declaring the old version that must be replaced. The rights form appears for the new exact READY version.

### Rights declaration schema v1

PostgreSQL validates a strict schema, not merely a non-empty JSON object.

Sections:

- `origin`: Creator authorship/origin confirmation;
- `third_party_assets`: whether external assets are present and authorization confirmation;
- `music_audio`: use, source and commercial-use confirmation;
- `ai`: whether generative AI was used, tool and optional description;
- `people`: identifiable-person presence, adult confirmation and commercial permission;
- `certification`: factual completeness/accuracy confirmation.

Unexpected or missing keys are rejected by the database schema-v1 guard. The frontend performs matching usability validation before calling the command.

The MVP does not accept material with identifiable minors.

### Clearance visibility

`creator_submission_detail()` now returns for Creator-owned versions:

- the Creator's own rights declaration;
- declaration submission timestamp;
- `rights_declaration_locked` boolean;
- rights clearance status;
- Creator-facing clearance history/reason.

It never returns `reviewed_by`, internal notes or internal review summaries.

A `flagged` clearance reason is intentionally Creator-facing corrective feedback. Protocol-private analysis belongs in `pci.internal_notes`.

After any Rights Grant exists, the declaration is locked by the database and the UI no longer offers editing.

If a declaration is edited before that lock, clearance returns to `pending` and Protocol must review it again.

### Save/refresh failure semantics

A successful declaration POST is treated as success immediately in the portal. The UI updates its local copy to `pending` before attempting a fresh read.

Therefore a later GET/read failure cannot incorrectly tell the Creator that the declaration failed or encourage an unnecessary re-submit.

## Frozen brief context invariants

Creator history never changes retroactively when Protocol publishes a later Consignment revision.

- before participation: opportunity shows current published revision;
- `invited` / `active` participation: opportunity shows `consignment_participations.consignment_revision_id`;
- Submission list/detail always resolve the exact participation revision.

A Submission created under Rev.1 remains visibly Rev.1 after Protocol publishes Rev.2.

## Browser/API boundary

`config.js` may eventually contain only safe public runtime configuration: Supabase URL, publishable key and PCI Edge Function URLs.

It must never contain service-role, invitation-HMAC, payment-encryption, worker or database secrets.

Commercial writes continue through authenticated Edge Functions; no direct browser business-table writes were introduced.

The rights module is separated from TUS/upload transport so rights-form evolution cannot interfere with media transfer logic.

## Dashboard live-data composition

The dashboard composes existing safe Creator read models.

- open opportunities = current opportunity projection;
- in review = `submitted` / `under_review` submissions;
- changes requested = `changes_requested` submissions;
- rights action = current READY version is missing declaration or clearance is `flagged`;
- amount receivable = unpaid obligation minus confirmed payout allocations;
- multiple currencies are never incorrectly summed.

The work-list read model exposes only minimum rights-action fields; it intentionally does not return the full declaration to Dashboard.

## Demo/runtime rule

`config.js` remains `demoMode: true` while PCI is runtime-unvalidated.

Before any real Creator pilot:

1. create the explicitly approved disposable Supabase runtime;
2. apply all PCI migrations and Edge Functions;
3. configure only the test publishable key + test function URLs;
4. set `demoMode: false`;
5. run onboarding/Auth adversarial tests;
6. test opportunity/open/direct-invite flows;
7. test V1/V2 TUS and retry/recovery cases;
8. test rights schema valid/invalid payloads, resubmission, flagged/complete clearance and Rights Grant lock;
9. test Creator A cannot read/modify Creator B rights evidence;
10. run Creator Security Gate before production.

## Phase 1N completed slices

- Dashboard desktop/mobile foundation;
- Auth invitation + legal onboarding UX;
- Dashboard live read-model composition;
- Opportunities → exact Brief → Participation → Submission DRAFT;
- Mis trabajos → Submission detail → V1/V2 → signed resumable upload → finalize → SUBMITTED;
- Creator-visible creative Review feedback;
- **Creator rights declaration → clearance context → preselection/commercial-readiness path**;
- Dashboard rights-action queue.

Phase 1N remains **IN PROGRESS / RUNTIME UNVALIDATED**.

## Remaining Phase 1N work

- Conversations + formal-offer distinction;
- Offer detail / reject / counter / accept UX;
- Payments + payment-account confirmation + payout history/proofs;
- My Account;
- complete route-level session/active-relationship gate consistency;
- final mobile interaction + accessibility pass.

## Next slice

**Conversations + formal offer UX**

Target distinction:

`chat contextual ≠ contractual offer`

The Creator must be able to talk with Protocol without confusing a message with an acquisition commitment, while a formal offer displays exact Version, price, currency, expiry, rights/payment snapshots and explicit `accept / reject / counter` actions.