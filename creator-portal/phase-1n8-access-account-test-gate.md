# Protocol Creative Insights — Phase 1N.8 access/account test gate

**Status:** CODE COMPLETE / RUNTIME UNVALIDATED  
**Production:** not deployed  
**Paid Supabase development branch:** not created

## Scope

Phase 1N.8 closes the Creator Portal frontend foundation with:

- returning-Creator Magic Link sign-in;
- shared route/session/onboarding guard;
- blocked Creator/workspace states;
- safe internal return routing;
- My Account;
- final direct navigation cleanup;
- authoritative Dashboard receivable display;
- shared mobile safe-area / focus / reduced-motion layer.

The browser guard is an early UX/defense layer only. It never replaces server-side PCI authorization.

## Auth boundary

Two flows are intentionally distinct.

### First activation

```text
Protocol invitation
  → Supabase Auth invitation/session
  → PCI invitation bootstrap
  → exact legal acceptances
  → Creator/workspace relationship ACTIVE
```

### Returning Creator

```text
Creator opens PCI
  → no valid session
  → /auth/sign-in/
  → Supabase Auth Magic Link
  → existing Auth user only (`shouldCreateUser:false`)
  → session restored
  → PCI onboarding state checked
  → return to original safe internal route
```

The returning login must never create a new Auth user. Initial creation/linking remains invitation-controlled.

Before runtime, Supabase Auth URL configuration must explicitly allow the deployed `/auth/sign-in/` callback URL.

## Shared route guard

Commercial surfaces load through guarded entrypoints:

- Dashboard;
- Opportunities;
- Mis trabajos;
- Conversations;
- Payments;
- My Account.

Business page modules are imported only after the guard succeeds.

Expected state matrix:

| Auth / PCI state | Expected result |
|---|---|
| no valid Auth session | returning sign-in |
| valid Auth user, not linked to PCI Creator | no commercial access; sign-in surface explains invitation is required |
| linked Creator, onboarding relationship `invited` | onboarding/legal flow |
| Creator `active` + at least one workspace relationship `active` | Creator Portal allowed |
| Creator global `restricted` | block commercial portal |
| Creator global `suspended` | block commercial portal |
| Creator global `closed` | block commercial portal |
| no active workspace + workspace `restricted/suspended/closed` | blocked state |
| one active workspace + another restricted workspace | portal allowed; workspace-level backend authz remains authoritative |
| one invited workspace + another restricted workspace, no active workspace | onboarding remains reachable for the invited relationship |

## Runtime Auth tests

### A. Returning Creator happy path

1. Start from an ACTIVE Creator with no browser session.
2. Open `/works/?id=<owned_submission>`.
3. Guard stores only the safe internal return path.
4. User is redirected to `/auth/sign-in/`.
5. Request Magic Link with the Creator email.
6. Confirm no new Auth user is created.
7. Open the Magic Link.
8. Supabase restores session on `/auth/sign-in/`.
9. PCI state is read.
10. User returns to the exact owned work route.

Expected: no invitation token is needed for recurring access.

### B. Unknown email / enumeration resistance

1. Request a Magic Link for an email not registered as a Creator/Auth user.
2. Observe user-visible response.

Expected:

- UI remains generic: if the account is enabled, instructions will arrive;
- no Creator existence, status or workspace information is disclosed;
- `shouldCreateUser:false` prevents automatic signup.

### C. Redirect allowlist

Verify deployed `/auth/sign-in/` is in Supabase Auth allowed redirect URLs.

Expected: Magic Link returns only to an explicitly configured PCI URL.

### D. Expired/invalid Auth session

Test expired access token with valid refresh token and with unusable refresh token.

Expected:

- guard may recover via `refreshSession()`;
- one server-side onboarding-state retry is permitted after 401;
- unusable session routes to returning sign-in;
- business modules are not imported before access resolves.

### E. Unlinked Auth account

Use a valid Supabase Auth account whose user ID is not bound to `pci.creators.auth_user_id`.

Expected: no PCI business reads/writes; sign-in surface explains that first activation requires Protocol invitation.

## Onboarding regression tests

- New invitation still uses `/auth/accept-invitation/`, not returning sign-in.
- Raw PCI invitation token remains scrubbed from address bar after bootstrap.
- Required legal-document snapshot remains exact.
- Active relation after all required acceptance still reaches portal.
- Guard return storage contains no invitation token, bank data, access token or business payload.

## Open-redirect / return-route tests

Attempt to seed `pci_creator_return_to_v1` with:

- `https://evil.example/`;
- `//evil.example/`;
- another same-origin application outside the Creator Portal root;
- `/auth/sign-in/`;
- `/auth/accept-invitation/`;
- valid PCI internal routes with query IDs.

Expected:

- external/out-of-root/auth targets are rejected;
- only same-origin paths below the actual deployed Creator Portal root can be restored;
- return state lives in `sessionStorage`, not URL parameters or persistent storage.

## Multi-workspace guard tests

Create fixtures for:

1. workspace A active + workspace B restricted;
2. workspace A invited + workspace B restricted, with no active workspace;
3. workspace A closed only;
4. two active workspaces.

Expected:

- case 1: portal remains accessible through active relationship;
- case 2: invited relationship can complete onboarding;
- case 3: blocked surface;
- case 4: portal allowed; each business command still enforces its own workspace relationship server-side.

## Blocked-state tests

For global Creator and workspace states `restricted`, `suspended`, `closed`:

- no business page module should load;
- no commercial data should be rendered from preexisting demo markup;
- status page must not expose internal reason/notes;
- display name is HTML-escaped;
- sign-out works and routes to returning sign-in.

## Content-flash test

With slow network throttling:

1. request a guarded commercial page while logged out;
2. request it as a blocked Creator.

Expected: `.pci-app` remains hidden while `data-pci-access=checking`; demo/business content must not flash before redirect/block resolution.

## My Account tests

Verify My Account exposes only:

- Creator display name;
- authenticated email;
- masked Creator ID;
- Creator status;
- workspace relationship status/activation date;
- current onboarding legal-document snapshots/accepted state;
- masked payment-account fields.

It must not expose:

- payment ciphertext;
- exact CBU/CVU/account identifiers after creation;
- service-role or other secrets;
- operator identities;
- internal notes;
- internal security/status reasons.

No profile-edit controls are provided until a dedicated backend command exists.

## Navigation tests

Desktop + mobile:

- Inicio;
- Oportunidades;
- Mis trabajos;
- Conversaciones;
- Pagos;
- Mi cuenta;
- Soporte.

Expected: direct routes work without legacy hash placeholders. The compatibility shim may remain as defense for old cached markup but must not be required by current main surfaces.

## Dashboard financial consistency

`dashboard-payment-ledger.js` must use `creator_payables().unpaid_amount` where available.

Test:

- partial confirmed payout;
- inflight payout;
- fully paid Payable;
- `voided` Payable;
- multiple currencies.

Expected:

- `paid`/`voided` do not inflate receivable;
- confirmed partial payouts reduce receivable;
- inflight does not count as confirmed receipt;
- unlike currencies display `Ver pagos` instead of an invalid sum.

## Mobile / accessibility pass

Test at minimum:

- iPhone-style top/bottom safe areas;
- Android small viewport;
- keyboard-open states on forms/dialogs;
- bottom nav remains usable;
- mobile drawer closes and restores body scroll;
- focus-visible ring for keyboard users;
- dialogs stay within `100dvh`;
- `prefers-reduced-motion: reduce` removes nonessential motion;
- interactive controls meet practical touch size expectations;
- no critical content depends on hover.

## Remaining runtime-only uncertainty

This phase is code-complete, not runtime-validated.

The disposable runtime must still prove:

- actual Supabase Magic Link email template/redirect behavior;
- Auth rate-limit behavior;
- session restoration with the deployed web origin;
- CORS for onboarding/creator APIs;
- browser/mobile focus behavior;
- complete A/B Creator authorization isolation.

No production rollout is permitted solely because this frontend gate exists.
