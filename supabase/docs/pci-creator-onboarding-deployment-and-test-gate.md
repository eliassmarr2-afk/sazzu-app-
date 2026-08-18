# Protocol Creative Insights — Creator onboarding deployment & test gate

**Phase:** 1M  
**Production:** do not apply yet  
**Purpose:** deployment requirements and disposable-runtime test matrix for Creator invitation/Auth/bootstrap.

## Security boundary

The onboarding flow has a deliberately separate trust boundary:

`pci-onboarding-api` handles only identity bootstrap, invitation administration and legal acceptance.

It does **not** expose submission, review, negotiation, offer, purchase, payout or asset commands.

After onboarding is complete, normal Creator activity returns to `pci-creator-api`, whose business commands continue to require an active Creator and an active `workspace_creators` relationship.

A valid Supabase session alone is never sufficient authorization.

## Expected lifecycle

```text
Protocol operator
  -> publishes required legal-document version(s)
  -> creates PCI invitation
  -> PCI persists token hash + exact legal requirements snapshot
  -> Supabase sends invite / Magic Link
Creator
  -> authenticates with Supabase Auth
  -> sends raw PCI invitation token to pci-onboarding-api
  -> backend derives token SHA-256 and binds auth.users.id to pci.creator_id
  -> invitation becomes accepted
  -> workspace_creator remains invited
  -> Creator accepts each exact legal-document ID/hash from invitation snapshot
  -> all required documents accepted
  -> creator pending -> active (if this is the first workspace)
  -> workspace_creator invited -> active
  -> business APIs become usable for that workspace
```

## Invitation token

The raw PCI invitation token is never stored in PostgreSQL.

The Edge Function derives it deterministically with HMAC-SHA256 using:

- `PCI_INVITATION_TOKEN_KEY`;
- `workspace_id`;
- normalized invited email;
- the operator request `Idempotency-Key`.

PostgreSQL stores only SHA-256 of the resulting raw token.

This provides deterministic retry behavior: if the database commit succeeds but the HTTP response is lost, retrying the same operator command with the same idempotency key regenerates the same token and does not orphan the stored invitation.

A different idempotency key produces a different invitation token.

The token must never be written to application logs, analytics payloads, error monitoring breadcrumbs, events, command receipts, user metadata or database metadata.

## Required Edge configuration

`pci-onboarding-api` must deploy with JWT verification enabled.

Required secrets/configuration:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — Edge only; never browser-exposed
- `PCI_CREATOR_APP_URL`
- `PCI_INVITATION_TOKEN_KEY` — high-entropy independent secret
- `PCI_ONBOARDING_ALLOWED_ORIGINS`

`pci_api` must be included in the project's Data API exposed schemas for Edge RPC invocation. The authoritative `pci` schema remains private.

No `anon` or `authenticated` direct grants to PCI domain tables/functions are introduced.

## Supabase Auth configuration required before a real invite

Do not configure production yet. In the disposable runtime/pilot environment:

1. Add the Creator application's callback/accept-invitation URL to Supabase Auth **Additional Redirect URLs**.
2. Keep email authentication enabled.
3. Existing users must use Magic Link with `shouldCreateUser:false`; the public Creator frontend must never use passwordless login as an implicit self-signup route.
4. Configure a custom SMTP provider before external pilot use. Supabase's built-in mailer is suitable for development/best-effort testing, not the intended production delivery path.
5. Review and brand both **Invite user** and **Magic Link** email templates.
6. Disable email click tracking/link rewriting in the SMTP/email provider for Auth messages.

## Email-prefetch protection

Some mail-security systems prefetch links. Supabase documents that directly following `ConfirmationURL` can consume an Auth confirmation link before the human user clicks it.

For external pilot/production, do not use an email template whose visible CTA performs irreversible confirmation merely by a GET request that an email scanner can follow.

Preferred pattern for PCI:

1. Email CTA opens a PCI-controlled intermediate confirmation page.
2. The intermediate page does **not** call `verifyOtp` or follow the actual Supabase confirmation link automatically on page load.
3. The page requires an explicit human action (for example, **Continuar a Protocol Creative Insights**) before completing Auth verification.
4. The page must have analytics/session-replay/error breadcrumbs disabled for query parameters containing Auth or PCI invitation material.
5. Once the PCI invitation token is read by the Creator app, immediately remove it from the visible URL with `history.replaceState` and keep it only in short-lived in-memory/session state until bootstrap completes.
6. Never persist the invitation token in `localStorage`.

The exact email template and callback implementation must be verified against the disposable Auth environment before production configuration is changed.

## Legal-document publication rule

PCI intentionally ships with **no fabricated legal terms**.

Before a real Creator can be invited, Protocol must publish at least one real `creator_legal_documents` row marked `required_for_activation=true`.

Each published document stores:

- workspace;
- document type;
- version;
- title;
- SHA-256 of the exact legal artifact/text;
- content reference;
- published timestamp.

An invitation snapshots the exact required document IDs/versions/hashes. A later publication of newer terms does not rewrite an already issued invitation or an already accepted legal record.

Final legal text must be reviewed by qualified counsel before external launch.

## Frontend rules

The future Creator portal must use a Supabase **publishable** key only.

Never expose:

- service-role key;
- `PCI_INVITATION_TOKEN_KEY`;
- payment encryption key;
- private Storage credentials.

On the invitation callback page:

1. obtain the authenticated Supabase session;
2. extract and immediately remove the PCI token from the URL;
3. call `POST /v1/creator/bootstrap` with a new idempotency UUID;
4. render the exact `required_legal_documents` returned by the backend;
5. submit each acceptance using the exact `legal_document_id` and `document_hash`;
6. call `GET /v1/creator/state` after each acceptance;
7. enter the normal PCI application only when the target relationship reports `active`.

The UI must not infer activation locally.

## Disposable runtime test matrix

The following tests are mandatory before an external Creator session.

### A. New Creator happy path

- Publish test legal document A v1.
- Invite a never-before-seen email.
- Assert one `creators` row with `pending` status.
- Assert one `workspace_creators` row with `invited` status.
- Assert one pending invitation and no raw token in DB/event logs.
- Complete Supabase invite Auth.
- Bootstrap with correct PCI token.
- Assert `auth_user_id` linked but workspace relationship still `invited`.
- Attempt `pci-creator-api` business operation before legal acceptance: must fail.
- Accept A v1 exact hash.
- Assert Creator and relationship become `active`.
- Assert business read now succeeds.

### B. Multiple required documents

- Publish A v1 and B v1 as required.
- Invite Creator.
- Bootstrap.
- Accept A only: relationship must remain `invited`.
- Accept B: relationship becomes `active`.
- Verify both acceptances are append-only.

### C. Exact legal snapshot

- Create invitation while A v1 is published.
- Publish A v2 after the invitation.
- Invitation must still require A v1 exact ID/hash.
- Accepting A v2 against that invitation must fail.
- A v1 acceptance must succeed even though A v2 is now current, because the invitation froze v1.

### D. Wrong authenticated email

- Invite `creator-a@example.test`.
- Authenticate as `creator-b@example.test`.
- Submit A's raw PCI token.
- Bootstrap must return forbidden and must not link either identity.

### E. Wrong Auth user for an Auth-snapshotted invitation

- Deliver invitation and persist its Auth user ID snapshot.
- Attempt bootstrap with another authenticated UUID even if an email collision is simulated.
- Must fail `pci_creator_invitation_user_mismatch`.

### F. Token replay

- Bootstrap once correctly.
- Retry with same authenticated user: may return the same accepted onboarding context idempotently; it must not create another Creator or relationship.
- Attempt the same token with a different authenticated user: must fail.
- Legal acceptance must remain single-evidence per exact Creator/document.

### G. Operator idempotency / lost response

- Send invite command with idempotency key K.
- Simulate response loss after DB commit.
- Retry with K.
- Assert same invitation ID and no second email if delivery was already marked sent.
- Assert the deterministically regenerated raw token matches the original token.

### H. New idempotency key supersedes pending invitation

- Invite with K1.
- Re-invite before bootstrap with K2.
- K1 invitation becomes `revoked`.
- K2 is the only pending invitation.
- Old K1 token must fail bootstrap.

### I. Bootstrap already in progress

- Bootstrap invitation successfully, leaving relationship `invited` pending legal acceptance.
- Operator tries to create a fresh invitation for the same relationship.
- Must fail `pci_creator_invitation_bootstrap_in_progress`.

### J. Expired invitation

- Create short-lived test invitation.
- Move test clock / expire record in disposable fixture.
- Bootstrap after `expires_at`: must fail even if the materialized status is still `pending`.
- Run `worker_expire_creator_invitations`.
- Assert status becomes `expired`.

### K. Revoked invitation

- Operator explicitly revokes pending invitation.
- Token must no longer bootstrap.
- Revocation must preserve historical row/event.

### L. Email delivery failure

- Force Auth mail delivery failure.
- Invitation becomes revoked with `delivery_status=failed`.
- No active workspace relationship is created.
- Re-invite later with a new idempotency key must create a new invitation.

### M. Existing global Creator, new workspace

- Creator already has `auth_user_id` and active relationship in workspace A.
- Invite same Creator email to workspace B.
- Delivery uses Magic Link with `shouldCreateUser:false`.
- No second `creators` row is created.
- Workspace A remains unchanged.
- Workspace B remains `invited` until B's exact legal snapshot is accepted.

### N. Cross-workspace/BOLA tests

- Workspace A operator cannot list/revoke workspace B invitation.
- Creator A cannot use an invitation intended for Creator B.
- Creator with active A relationship but invited B relationship cannot access B business resources before B activation.
- No request may supply a trusted `creator_id` to bypass server-derived identity.

### O. Suspended/restricted/closed actors

- Suspended or closed Creator cannot be newly activated.
- Restricted/suspended/closed workspace relationship cannot be silently re-invited.
- Existing business denial remains effective even with a valid Auth session.

### P. Legal evidence immutability

- Attempt to UPDATE/DELETE an acceptance after insert: must fail.
- Attempt to alter published legal document text/hash/version: must fail.
- Publishing a new version supersedes the old published document instead of rewriting it.

### Q. Secret/data leakage

Inspect Edge logs, events, command receipts and API responses. Assert absence of:

- raw PCI invitation token;
- Supabase access/refresh token;
- service-role key;
- `PCI_INVITATION_TOKEN_KEY`;
- Auth confirmation URL/token hash;
- exact bank/CVU data from unrelated phases.

## Exit criteria for Phase 1M runtime validation

Phase 1M can move from `RUNTIME UNVALIDATED` only when:

- all migrations through 1M apply cleanly in disposable Supabase;
- Auth invite + existing-user Magic Link paths work;
- every test A–Q above passes;
- database/security advisors are reviewed;
- no onboarding route bypasses Creator/workspace legal activation gates;
- Auth redirect/template behavior is verified with the actual pilot domain;
- the disposable environment is deleted after validation.
