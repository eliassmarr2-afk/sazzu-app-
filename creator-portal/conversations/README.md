# PCI Creator Portal — Conversations + Formal Offer

**Phase:** 1N.6  
**Status:** CODE COMPLETE / RUNTIME UNVALIDATED  
**Production:** not deployed

## Product rule

> Chat contextual is not contractual. A Formal Offer is a separate commercial object.

The Creator UI must never render a formal offer as a chat bubble or imply that conversational text changed the acquisition terms.

## Surface

Route:

`creator-portal/conversations/`

Desktop:

- negotiation list;
- Creator/Protocol message thread;
- separate sticky Commercial Agreement panel;
- Formal Offer actions in the commercial panel only.

Mobile:

- negotiation list/detail navigation;
- commercial object rendered as a distinct block above the chat;
- fixed portal bottom navigation remains available;
- offer actions remain outside message bubbles.

## Creator-safe negotiation projection

Migration `20260819_054_pci_creator_negotiation_commercial_projection.sql` enriches the existing safe read model with:

- exact accepted Consignment revision title/number;
- exact current Version context;
- current Version filename and SHA-256;
- live offer summary;
- live offer exact item Version/SHA snapshot;
- latest safe message;
- Creator-action-required signal;
- offer history with immutable terms snapshots.

It still excludes:

- operator user IDs;
- internal notes;
- internal review summaries;
- Protocol-only commercial analysis.

## Formal Offer visual contract

A Formal Offer card displays:

- explicit `OFERTA FORMAL · DOCUMENTO COMERCIAL` label;
- amount + currency;
- proposed-by side;
- exact Version number;
- exact filename;
- SHA-256 fingerprint;
- Version identifier;
- expiry;
- rights-package snapshot;
- payment-terms snapshot;
- bonus/performance snapshot;
- other commercial terms;
- immutable offer history.

The card is deliberately more structured and visually separate than normal messages.

## Actions

### Message

`POST /v1/negotiations/:id/messages`

A message is conversational only. It cannot mutate Offer, Purchase, Payable, Rights Grant or asset state.

### Reject

`POST /v1/offers/:id/reject`

Only a live workspace offer can be rejected by the Creator. Rejection preserves the offer and chat history.

### Counter

`POST /v1/offers/:id/counter`

The Creator may change only:

- total amount;
- optional counter note.

The backend preserves the same exact Version, item snapshot, rights package, payment terms and base commercial terms. The parent offer becomes `superseded` and the Creator counteroffer becomes the only live offer.

### Accept

`POST /v1/offers/:id/accept`

The UI requires a second confirmation screen showing amount + Version + SHA + expiry again.

Acceptance executes the already-built atomic 1J command:

`Offer accepted + Purchase agreed + base Payable awaiting_confirmation + Rights Grant pending_payment + Negotiation closed`

No UI code creates those records independently.

Acceptance does **not** mean Rights are active. Rights remain `pending_payment` until the payment lifecycle confirms the base Payable as paid.

## Expiry behavior

The frontend evaluates `expires_at` even if the expiration worker has not yet persisted `status=expired`.

Therefore a technically `sent` offer whose expiry is already in the past:

- renders as expired;
- exposes no accept/reject/counter actions;
- cannot be mistaken for a live proposal.

The backend still revalidates expiry on every commercial command.

## Counteroffer behavior

If the live offer was proposed by the Creator:

- it renders as `Tu contraoferta está enviada`;
- the Creator gets no accept/reject/counter buttons against their own proposal;
- Protocol must answer before another live offer exists.

## Dashboard integration

Dashboard `OFERTA PENDIENTE` actions resolve the safe `offer_id → negotiation_id` relation through `creator_negotiations()` and open the exact conversation.

The demo dataset uses a fixed mapping only for local visual development.

## Required runtime tests

Before external pilot, test at minimum:

1. Creator A opens only their own negotiation.
2. Creator A cannot query Creator B negotiation ID (BOLA test).
3. Creator A cannot send a message to Creator B negotiation.
4. Message body empty / >5000 is rejected.
5. Double-click/retry on message returns one logical result through idempotency.
6. Workspace live offer renders exact V/SHA from offer item snapshot, not mutable current UI state.
7. Offer expiring while page is open becomes non-actionable after refresh/re-render.
8. Creator cannot accept their own counteroffer.
9. Creator cannot reject their own counteroffer.
10. Creator counteroffer preserves exact Version/rights/payment snapshots.
11. Lost HTTP response after successful counteroffer retry does not create a second live offer.
12. Lost HTTP response after successful acceptance retry returns the same Purchase.
13. Double-click Accept cannot create duplicate Purchase/Payable/Rights Grant.
14. Acceptance on expired/superseded/rejected offer returns conflict and UI refreshes state.
15. Acceptance creates Purchase + Payable + pending-payment Rights atomically.
16. Negotiation is closed after successful acceptance.
17. Accepted offer remains visible in immutable history.
18. Closing a negotiation disables the message composer.
19. Mobile layout keeps Formal Offer visually separate from chat.
20. No operator IDs/internal notes appear in network response or DOM.

## Next Creator Portal slice

**1N.7 — Payments + payment-account confirmation + payout history/proofs**

Target progression:

`Offer accepted → Purchase/Payable visible → awaiting_confirmation → Creator selects/creates payout destination → ready_to_pay → Protocol transfer → payout history/proof → paid`.

Rights activation/asset provisioning continues to be backend-controlled and must not be simulated by the Creator frontend.
