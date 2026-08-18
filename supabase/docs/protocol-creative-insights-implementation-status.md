# Protocol Creative Insights — Implementation checkpoint

**Date:** 2026-08-18  
**Git branch:** `feature/protocol-creative-insights-backend`  
**Production status:** NOT APPLIED  
**Paid Supabase branch:** NOT CREATED

## Current technical phase

**FASE 1G — Creator Upload/API + first internal receive/view slice**

The current vertical slice is intentionally limited to:

`Protocol creates/publishes consignment → Creator sees opportunity → joins → creates submission → reserves immutable version → signed TUS upload → backend verifies Storage object → version ready/submission submitted → Protocol sees review queue → Protocol opens signed playback URL.`

Review decisions, negotiation, offers, purchases, payouts and rights activation are not part of the active implementation slice yet.

## Frozen architecture already represented in code

- `pci` is the private authoritative schema.
- `pci_api` is the minimal backend command/query surface.
- Creator identities are not `protocol_workspace_members`.
- All commercial objects carry workspace ownership; external objects resolve creator ownership.
- Direct browser mutation of PCI business tables is forbidden.
- `anon` and `authenticated` receive no direct PCI table/function access.
- PCI business mutations use service-role backend commands, state validation, idempotency receipts and append-only events.
- Submitted files and acquired assets use different private Storage buckets.
- Immutable creative versions never overwrite an existing Storage object.
- Large creative uploads use signed resumable TUS uploads; `upsert=false`.

## Migrations currently implemented

1. `20260818_001_pci_foundation_schema.sql`
2. `20260818_002_pci_security_invariants.sql`
3. `20260818_003_pci_commercial_domain.sql`
4. `20260818_004_pci_operator_commands.sql`
5. `20260818_005_pci_creator_submission_commands.sql`
6. `20260818_006_pci_storage_buckets.sql`
7. `20260818_007_pci_creator_finalize_and_read_models.sql`
8. `20260818_008_pci_creator_upload_invalidation.sql`
9. `20260818_009_pci_admin_review_read_models.sql`

## Edge Functions currently implemented in Git

### `pci-creator-api`

JWT required at deployment.

Current routes:

- `GET /v1/opportunities`
- `POST /v1/consignments/:consignment_id/join`
- `POST /v1/submissions`
- `GET /v1/submissions`
- `GET /v1/submissions/:submission_id`
- `POST /v1/submissions/:submission_id/versions`
- `POST /v1/versions/:submission_version_id/finalize`

Upload reservation returns a 2-hour signed Storage upload token for the exact reserved path and the direct Supabase TUS endpoint. TUS chunk size is fixed to 6 MiB. No upsert is allowed.

Finalization verifies the exact Storage object before marking a version ready. Missing/incomplete uploads remain resumable. An object proven technically invalid is recorded as `invalid` with an audit event.

### `pci-admin-api`

JWT required at deployment.

Current routes:

- `GET /v1/workspaces/:workspace_id/review-queue`
- `GET /v1/workspaces/:workspace_id/submissions/:submission_id`
- `POST /v1/workspaces/:workspace_id/versions/:submission_version_id/playback`

Playback returns a private signed URL with a 10-minute lifetime. The browser never gets permanent bucket access.

## Required deployment configuration — do not apply to production yet

Before these Edge Functions can invoke `pci_api` through PostgREST, `pci_api` must be included in the project's exposed API schemas. This does **not** expose the authoritative `pci` schema and does not grant access to `anon` or `authenticated`; grants remain service-role-only.

Both Edge Functions must be deployed with JWT verification enabled.

Expected environment configuration:

- `PCI_CREATOR_ALLOWED_ORIGINS`
- `PCI_ADMIN_ALLOWED_ORIGINS`
- normal Supabase Edge secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

No production configuration is changed at this checkpoint.

## Validation status

The code is versioned in Git but migrations and functions have **not yet been executed against a disposable Supabase environment**. Therefore SQL/runtime integration is not considered validated yet.

A paid Supabase development branch was deliberately deferred. When testing becomes necessary, create a temporary branch, apply migrations, execute adversarial creator/operator tests, and delete the branch when finished.

## Security gate still required before any real Creator session

External launch remains blocked until the legacy project's broad authenticated/public RPC surface is audited and hardened. PCI's own private boundary does not by itself make unrelated legacy RPCs safe for external authenticated users.

## Next technical block

**FASE 1H — Review workflow + revision cycle**

Target slice:

`Protocol starts review → requests changes / preselects / rejects → visible feedback is separated from internal notes → Creator sees change request → uploads V2 → Protocol receives V2 with preserved lineage.`

After 1H, proceed to negotiation and formal offer/purchase workflow. Meta Ads execution remains explicitly out of scope.
