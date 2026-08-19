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
- mobile is first-class, not a desktop afterthought.

The portal remains operational rather than analytical. Internal ROAS/CPA/L1/L2/L3 and attribution analytics do not belong in this surface.

## Current Creator surfaces

### Dashboard

`creator-portal/index.html`

Responsive desktop/mobile home with:

- summary cards;
- `Requiere tu atención`;
- opportunities;
- missing/flagged rights actions;
- live formal-offer attention;
- payment-destination attention;
- partial-payout-aware receivable composition.

### Auth/onboarding

`creator-portal/auth/accept-invitation/`

`Auth → PCI bootstrap → exact legal documents → acceptance → workspace relationship ACTIVE → Creator portal`

The raw PCI invitation token is removed from the visible URL after bootstrap.

### Opportunities

`creator-portal/opportunities/`

`Open/direct invite → exact frozen Brief → Participation ACTIVE → Submission DRAFT`

Accepted brief revisions remain immutable from the Creator's perspective. `slots_available` is communicated as the number of assets Protocol seeks to acquire, never fake remaining Creator seats.

### Mis trabajos

`creator-portal/works/`

Provides:

- exact accepted brief context;
- Submission state;
- immutable V1/V2 lineage;
- signed resumable TUS upload;
- SHA-256 fingerprint;
- Creator-visible review feedback;
- rights declaration;
- rights clearance/preselection progression.

Internal review summaries, operator identities and internal notes are not rendered.

### Conversations

`creator-portal/conversations/`

Primary rule:

> Chat contextual is not contractual. A Formal Offer is a separate commercial object.

Desktop presents chat and Commercial Agreement as separate columns. Mobile presents the Commercial Agreement as an independent structured block above the chat, never as a message bubble.

The surface supports:

- negotiation list/search/filters;
- exact accepted brief title/revision;
- exact current Version context;
- Creator/Protocol message history;
- message composer for open negotiations;
- immutable offer history;
- formal offer detail;
- reject;
- counteroffer;
- two-step accept confirmation.

A Formal Offer displays:

- amount + currency;
- proposed-by side;
- exact Version number;
- exact filename;
- SHA-256 fingerprint;
- Version ID;
- expiry;
- rights-package snapshot;
- payment-terms snapshot;
- bonus/performance snapshot;
- other commercial terms.

Accepting uses the existing atomic 1J backend command. The frontend does not independently create Purchase, Payable or Rights records.

`Accept → Offer accepted + Purchase agreed + Payable awaiting_confirmation + Rights pending_payment + Negotiation closed`

Acceptance does **not** activate rights. Rights activation remains backend-controlled after confirmed payment.

## Creator media upload flow

```text
DRAFT / CHANGES_REQUESTED
  ↓
select MP4/MOV
  ↓
client validation + metadata
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

V1 is never overwritten by V2.

Upload rules include:

- `tus-js-client@4.3.1`;
- signed `x-signature`;
- `x-upsert:false`;
- 6 MiB chunks;
- custom fingerprint scoped to `submission_version_id`;
- SHA-256 incremental Worker using `hash-wasm@4.12.0`;
- signed reservation only in `sessionStorage`;
- retry behavior that does not silently create another Version.

Full browser-loss recovery remains a runtime test-gate item.

## Rights declaration / clearance

Rights declaration is factual evidence about an exact Version; it is not the legal agreement and does not transfer rights by itself.

Schema v1 covers:

- origin/authorship;
- third-party assets + authorization;
- music/audio + commercial-use confirmation;
- generative AI + tool;
- identifiable people + adult/permission confirmation;
- factual accuracy certification.

Missing/unexpected keys are rejected by PostgreSQL. The MVP does not accept identifiable minors.

Current visible progression:

`Video READY → Creator declaration → Rights clearance → Creative preselection → Negotiation`

Creative review and rights clearance remain separate tracks. Any existing Rights Grant locks the declaration against later editing.

## Conversations / Formal Offer invariants

Migration `20260819_054_pci_creator_negotiation_commercial_projection.sql` keeps negotiation reads Creator-safe while adding the exact commercial context required by the UI.

The Creator read model exposes no operator IDs or internal notes.

A live workspace offer can be accepted/rejected/countered only while:

- negotiation is open;
- offer status is `sent`;
- offer has not expired.

The frontend treats an elapsed `expires_at` as non-actionable even if the expiration worker has not persisted `expired` yet. The backend revalidates the state again on every command.

A Creator counteroffer preserves the exact Version, rights package, payment terms and item snapshot. Only amount + optional counter note change.

If the live offer was proposed by the Creator, the UI shows `esperando Protocol` and exposes no accept/reject/counter controls against the Creator's own proposal.

Dashboard offer alerts resolve `offer_id → negotiation_id` through the safe negotiation projection and open the exact conversation.

Detailed 1N.6 test gate: `creator-portal/conversations/README.md`.

## Frozen context invariants

- before participation: opportunity shows current published revision;
- invited/active participation: exact participation revision;
- Submission history always uses the participation revision;
- ready media byte identity remains immutable;
- formal offers reference the exact preselected READY Version;
- offer item snapshot preserves V#/SHA/filename through counteroffers;
- rights declaration locks after a Rights Grant exists.

## Browser/API boundary

Browser configuration may eventually contain only safe public values:

- Supabase URL;
- Supabase publishable key;
- PCI Edge Function URLs.

It must never contain service-role, invitation-HMAC, payment-encryption, worker or database secrets.

All commercial writes use authenticated Edge Functions. No direct browser business-table writes are introduced.

## Demo/runtime rule

`creator-portal/config.js` remains `demoMode:true` while PCI is runtime-unvalidated.

Before any real Creator pilot:

1. create the explicitly approved disposable Supabase runtime;
2. apply all PCI migrations/Functions;
3. configure only test publishable key + Function URLs;
4. switch demo off;
5. run Auth/onboarding adversarial tests;
6. test open/direct opportunity flows;
7. test V1/V2 TUS/retry/recovery;
8. test rights valid/invalid/resubmission/flag/complete/lock;
9. test negotiation/message/offer/counter/accept idempotency;
10. test Creator A/B cross-account/BOLA isolation;
11. run the Creator Security Gate before production.

## Phase 1N completed slices

- 1N.1 Dashboard desktop/mobile foundation;
- 1N.2 Auth invitation + legal onboarding UX;
- 1N.3 Opportunities → exact Brief → Participation → Submission DRAFT;
- 1N.4 Mis trabajos → V1/V2 → signed TUS → finalize → SUBMITTED;
- 1N.5 Creator rights declaration → clearance/preselection context;
- **1N.6 Conversations → messages → Formal Offer → reject/counter/two-step accept.**

Phase 1N remains **IN PROGRESS / RUNTIME UNVALIDATED**.

## Remaining Phase 1N work

- Payments + payment-account confirmation + payout history/proofs;
- My Account;
- complete route-level session/active-relationship gate consistency;
- final mobile interaction + accessibility pass.

## Next slice

**1N.7 — Payments + payment-account confirmation + payout history/proofs**

Target flow:

`Offer accepted → Purchase/Payable visible → awaiting_confirmation → select/create payout destination → ready_to_pay → Protocol transfers externally → payout history/proof → paid`.

The Creator frontend must never mark its own Payable paid or activate Rights. Those transitions remain authoritative backend operations.
