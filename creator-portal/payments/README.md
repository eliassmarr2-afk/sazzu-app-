# PCI Creator Portal — Payments / Phase 1N.7

**Status:** CODE COMPLETE / RUNTIME UNVALIDATED  
**Production:** not deployed  
**Supabase paid development branch:** not created

## Product rule

The Creator can choose where to receive money and can see the payment ledger.

The Creator cannot:

- create a payout;
- mark a payout confirmed;
- mark a Payable paid;
- activate Rights;
- modify a frozen payment-destination snapshot after transfer execution begins.

Those remain authoritative Protocol/backend operations.

## Creator flow

```text
Offer ACCEPTED
  ↓
Purchase AGREED
  ↓
Payable AWAITING_CONFIRMATION
  ↓
Creator creates/selects payment account
  ↓
Creator confirms exact destination for this Payable
  ↓
Payable READY_TO_PAY
  ↓
Protocol executes external transfer
  ↓
Payout INITIATED
Payable PROCESSING
  ↓
Protocol confirms real transfer
  ↓
Payout CONFIRMED
  ↓
partial → Payable READY_TO_PAY for remaining balance
full → Payable PAID
  ↓
Rights activation remains backend-only
```

## Payment accounts

Payment accounts are reusable identity records but are immutable after creation.

Changing banking/wallet details means:

`create a new payment account → optionally deactivate the old account`.

The exact account identifier enters `pci-creator-api` only during account creation. The Edge Function encrypts it with AES-GCM using `PCI_PAYMENT_DATA_KEY` before PostgreSQL receives it.

Creator read models return only:

- provider;
- account type;
- holder name;
- masked holder document;
- alias;
- identifier last 4;
- active/inactive status.

They never return:

- `account_identifier_ciphertext`;
- the exact account identifier;
- encryption material.

The account form does not persist exact CBU/CVU/account identifiers in `localStorage` or `sessionStorage`.

## Per-Payable confirmation

Confirming a payment account means:

> Use this exact destination for this exact obligation.

It does **not** mean the Creator confirms receipt of money.

Each confirmation creates append-only `pci.payable_payment_confirmations` evidence and freezes an exact payment-account snapshot into the Payable.

A Creator may reconfirm while the Payable is still `ready_to_pay`. Once payment execution is `processing`, the current Creator UX no longer offers destination changes.

## Authoritative balance projection

Migration `20260819_055_pci_creator_payment_ledger_projection.sql` makes PostgreSQL calculate per Payable:

- `amount_due`;
- `confirmed_amount` = allocations whose Payout is `confirmed`;
- `inflight_amount` = allocations whose Payout is `initiated`;
- `unpaid_amount` = `amount_due - confirmed_amount`;
- `remaining_to_schedule` = `amount_due - confirmed_amount - inflight_amount`.

Failed/reversed payouts do not count as confirmed money.

The frontend displays partial payment explicitly instead of collapsing it into one generic state.

Example:

```text
Amount due        ARS 100,000
Confirmed          ARS 40,000
In transfer        ARS 30,000
Unpaid             ARS 60,000
Still unscheduled  ARS 30,000
```

## Payout history

Creator payout history is read-only and includes:

- payout status;
- provider/method;
- amount/currency;
- provider reference;
- transfer/confirmation/failure/reversal timestamps;
- masked frozen destination;
- Payable/Purchase context;
- purchased creative / exact Version context;
- proof availability.

A payout proof is never public. `pci-creator-api` first proves payout ownership and then issues a signed Storage URL valid for 10 minutes.

The browser receives neither the private bucket path nor general Storage access.

## Currency handling

The Payments overview does not add unlike currencies together.

If one currency is present, the metric is formatted normally. If several currencies exist, each currency total is rendered separately.

## Mutation idempotency

Payment mutation commands use `Idempotency-Key`.

The Payments browser adapter keeps the same key **in memory** for the same mutation+payload when a request fails without a conclusive response. This improves retry behavior without persisting exact bank identifiers.

The key is released after success or a conclusive domain/client error.

A full page/browser loss immediately after an account-creation commit whose response was lost is still a runtime/test-gate case. We deliberately do not solve that by storing raw financial identifiers in browser persistence.

If runtime testing demonstrates a material duplicate-account risk, the correct follow-up is server-side destination fingerprint/deduplication, not persistence of the exact identifier in the browser.

## Dashboard integration

`CONFIRMÁ TU COBRO` routes directly to:

`payments/?id=<payable_id>`

The exact Payable is highlighted and scrolled into view.

Legacy `#pagos` / `#conversaciones` navigation placeholders are temporarily normalized by `config.js`, deriving the portal root from the actual `config.js` URL rather than assuming a deployment path.

## Runtime test gate

Before any Creator pilot, validate at minimum:

### Account security

A. create Mercado Pago account with alias only;  
B. create account with exact CBU/CVU only;  
C. create with alias + identifier;  
D. reject account without alias or identifier;  
E. verify exact identifier never returns in reads/logs/UI;  
F. verify ciphertext is present only in private backend state;  
G. deactivate account and verify it disappears from selectable active destinations;  
H. verify old Payable snapshots remain historically intact after deactivation.

### Confirmation lifecycle

I. `awaiting_confirmation → ready_to_pay`;  
J. reconfirm a different active account while still `ready_to_pay`;  
K. verify append-only confirmation history;  
L. verify `processing/paid` cannot be changed by Creator;  
M. Creator A cannot confirm Creator B Payable/account;  
N. double-click confirmation does not create financial divergence;  
O. lost HTTP response retries with the same idempotency key during the same page session.

### Ledger correctness

P. zero payout;  
Q. one full confirmed payout;  
R. one partial confirmed payout;  
S. confirmed + initiated partial payouts;  
T. failed payout does not reduce confirmed balance;  
U. reversed payout no longer counts as confirmed;  
V. several currencies are never summed together;  
W. `voided` Payable does not count as receivable in final Dashboard consistency pass.

### Proof access

X. proof unavailable returns controlled error;  
Y. Creator can open only proof belonging to own payout;  
Z. signed URL expires after configured 10-minute window;  
AA. no storage bucket/path is exposed in normal payout reads.

### Failure/retry

AB. `PCI_PAYMENT_DATA_KEY` unavailable → account create fails closed;  
AC. backend commit + network response loss during account creation;  
AD. full page refresh after ambiguous account-creation result; evaluate whether server-side dedupe fingerprint is required before pilot;  
AE. duplicate/deferred payout updates remain reconciled from authoritative PostgreSQL reads.

## Known deferred cleanup

The older Dashboard aggregation currently excludes legacy `cancelled` but still needs the canonical `voided` exclusion folded into the final Phase 1N consistency pass. Payments itself uses the authoritative 1N.7 ledger fields and does not depend on that Dashboard calculation.

## Next Phase 1N slice

**1N.8 — My Account + route/session/active-relationship consistency + final mobile/accessibility pass.**
