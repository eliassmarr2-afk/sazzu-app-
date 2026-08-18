# Protocol Creative Insights — Backend Foundation

**Status:** Git-only development. Not deployed.  
**Branch:** `agent/pci-backend-foundation`  
**Date:** 2026-08-18

This document describes the first executable backend foundation for Protocol Creative Insights (PCI). It implements the frozen Phase 0 operating policy and the Phase 1A–1E architecture decisions without changing the production Supabase database.

## Safety status

At this stage:

- No PCI migration has been applied to production.
- No PCI Edge Function has been deployed.
- No paid Supabase development branch has been created.
- No external creator account has been enabled.
- Production tables, RPCs and Storage buckets have not been modified by this branch.

The files in this branch are implementation candidates that must be executed and tested in an isolated Supabase environment before production use.

## Architecture boundary

- `pci` is the private authoritative schema.
- `pci_api` is the narrow server-side command/query schema.
- `anon` and `authenticated` receive no direct access to PCI schemas/tables/functions.
- Human HTTP access goes through JWT-protected Edge Functions.
- Edge Functions resolve the authenticated user and call `pci_api` with `service_role`.
- PostgreSQL functions re-check ownership/state and perform business mutations transactionally.
- Creator users are not rows in `protocol_workspace_members`.
- Protocol operators use existing workspace roles. Writes currently require `owner` or `admin`.

## Migration order

Migrations are intentionally chronological and must be executed in filename order:

1. `20260818_001_pci_foundation.sql` — private schemas, creator/workspace identity, consignments, revisions, participation, submissions/versions, negotiations shell, events, outbox and command receipts.
2. `20260818_002_pci_foundation_hardening.sql` — actor/idempotency invariants and hash-index correction.
3. `20260818_003_pci_vertical_slice_commands.sql` — first transactional commands/read models.
4. `20260818_004_pci_storage_foundation.sql` — five private PCI buckets and service-role-only Storage policies.
5. `20260818_005_pci_read_model_hardening.sql` — exact brief-revision history and opportunity restrictions.
6. `20260818_006_pci_upload_submission_lifecycle.sql` — upload confirmation, technical processing, rights declaration and formal submission.
7. `20260818_007_pci_creator_onboarding.sql` — invitation-based creator onboarding.
8. `20260818_008_pci_onboarding_idempotency_fix.sql` — safe invitation-claim replay.
9. `20260818_009_pci_worker_replay_hardening.sql` — worker result integrity.
10. `20260818_010_pci_review_workflow.sql` — immutable review history, internal notes and review state transitions.
11. `20260818_011_pci_review_reason_codes.sql` — structured rejection/change reasons.
12. `20260818_012_pci_policy_hardening.sql` — creator-visible structured feedback and stale-invitation protection.
13. `20260818_013_pci_invitation_creation_guard.sql` — blocks new invitations for globally restricted/suspended/closed creators.

Before the first isolated test we may squash/rewrite these Git-only migrations into a cleaner initial migration set because none of them has been applied to a shared database yet.

## Edge Functions

### `pci-admin-api`

JWT required.

Implemented routes:

- `POST /v1/consignments`
- `POST /v1/consignments/:id/publish`
- `POST /v1/creators/invitations`
- `GET /v1/review-queue?workspace_id=...`
- `GET /v1/submissions/:id?workspace_id=...`
- `POST /v1/submissions/:id/review/start`
- `POST /v1/submissions/:id/review/decision`

Mutating routes require a UUID `Idempotency-Key` header.

### `pci-creator-api`

JWT required.

Implemented routes:

- `GET /v1/onboarding/invitations`
- `POST /v1/onboarding/invitations/:id/claim`
- `GET /v1/opportunities`
- `GET /v1/submissions/:id`
- `POST /v1/consignments/:id/join`
- `POST /v1/participations/:id/submissions`
- `POST /v1/submissions/:id/versions/prepare`
- `POST /v1/submission-versions/:id/rights`
- `POST /v1/submission-versions/:id/upload-complete`
- `POST /v1/submissions/:id/submit`

The creator submission detail read model intentionally does not select internal review assessment or internal notes.

## First vertical slice

The first integration test should execute this exact lifecycle:

1. Protocol owner/admin prepares a Creator invitation.
2. Creator signs into Supabase Auth and verifies the invited email.
3. Creator lists and claims the pending PCI invitation.
4. Protocol creates a draft consignment and revision 1.
5. Protocol publishes the consignment.
6. Creator lists opportunities and joins.
7. Creator creates a submission.
8. Creator prepares V1 upload; backend reserves an immutable Storage path and returns a signed upload token.
9. Browser uploads directly to `pci-submissions` with TUS. Do not use upsert.
10. Creator calls upload-complete; PostgreSQL verifies the reserved path against `storage.objects` and queues technical analysis.
11. Trusted worker analyzes the object and records SHA-256/media metadata, moving `processing -> ready` (or `invalid`).
12. Creator submits the rights/origin declaration for the exact version.
13. When technical status is `ready` and rights clearance is `complete`, Creator formally submits it for review.
14. Protocol starts review.
15. Protocol chooses one of: request changes, preselect, reject.
16. Creator reads its submission and sees only explicitly publishable reason/feedback.
17. If changes are requested, Creator reserves/uploads V2 and repeats the submission cycle without overwriting V1.

## Storage

Private buckets declared by migration:

- `pci-submissions`
- `pci-assets`
- `pci-rights-documents`
- `pci-payout-proofs`
- `pci-message-attachments`

No general creator Storage policy is created. Upload authorization is scoped to one backend-generated path via signed upload token.

`pci-submissions` currently uses a 250 MiB object ceiling for the MVP and allows MP4, MOV, JPEG, PNG and WEBP.

The application authorization stored with an upload reservation is currently one hour. A Storage-signed token may have a different physical validity period; PCI's database authorization remains the business boundary and upload confirmation rejects objects created after the reservation deadline.

## Review reason codes

Structured reason codes currently supported:

- `brief_mismatch`
- `quality_insufficient`
- `weak_hook`
- `confusing_execution`
- `rights_issue`
- `incomplete_material`
- `late_submission`
- `strategy_mismatch`
- `other`

For `changes_requested` and `rejected`, a reason code is mandatory and is creator-visible even when no free-text feedback is supplied.

## Deployment prerequisites — do not skip

Before deploying these functions or accepting a real creator:

1. Create a temporary isolated Supabase branch/environment and execute all migrations there.
2. Run migration syntax/integrity tests and destructive transition tests.
3. Add `pci_api` to Supabase Data API exposed schemas so server-side `.schema('pci_api').rpc(...)` calls can resolve it. **Do not expose `pci`.**
4. Configure `PCI_ALLOWED_ORIGINS` for the real Protocol Data and Protocol Creative origins.
5. Deploy both human Edge Functions with JWT verification enabled.
6. Implement/test the trusted media-analysis worker rather than faking technical metadata.
7. Complete the Creator Security Gate on legacy `public` RPCs/grants before issuing the first external authenticated creator session.
8. Enforce current PCI legal-terms acceptance before commercial participation.
9. Add rights-document evidence flow for licensed third-party content before allowing those declarations to become `complete`.

## Deliberately not implemented yet

- Negotiation messages and attachments.
- Formal purchase offers/counteroffers.
- Purchases.
- Payment accounts, payables and payouts.
- Acquired-rights grants.
- Creative Asset promotion into `pci-assets`.
- Disputes/incidents.
- Creator performance / bonuses.
- UTM, Meta execution or campaign activation.

Those will be added as later vertical slices on top of this foundation.
