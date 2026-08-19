# Protocol Creative Insights — Phase 1O security baseline

**Date:** 2026-08-19  
**Project:** `cuuzsbhpjmjbbnghtiny`  
**Production mutation:** NONE  
**Paid development branch:** NOT CREATED

## Purpose

This file freezes the security state observed **before PCI is applied to any runtime**.

The purpose is attribution, not remediation:

- findings already present in the live legacy project are **baseline debt**;
- findings introduced by PCI in the disposable runtime are **PCI regressions** and must block rollout;
- Phase 1O must not blindly harden production while trying to validate PCI.

## Live preflight state

Read-only Supabase preflight confirmed:

- project status: `ACTIVE_HEALTHY`;
- region: `us-east-1`;
- PostgreSQL: 17.6.1.113;
- active development branches: **none**;
- PCI Edge Functions are not deployed to production;
- PCI migrations remain unapplied to production.

## Existing legacy security debt observed

Supabase Security Advisor reports a broad pre-existing `public` surface. The material classes are:

### 1. Public tables with RLS disabled

Examples observed include:

- `public.stg_product_skus_legacy`;
- `public.stg_product_bundles_legacy`;
- `public.stg_product_equivalencias_legacy`;
- `public.stg_product_constructor_packs_legacy`;
- `public.finance_payment_rules`;
- `public.product_variant_sku_mappings`;
- `public.protocol_simulated_sales`;
- `public.finance_manual_status_events`;
- `public.stg_product_legacy_rows`;
- `public.product_skus`;
- `public.product_offer_components`;
- `public.product_order_analysis_lines`;
- `public.product_offer_sets`;
- `public.shopify_order_line_snapshots`;
- `public.product_commercial_offers`;
- `public.product_shopify_variant_mappings`;
- `public.product_order_offer_matches`;
- `public.product_order_component_lines`;
- `public.product_sku_shopify_variant_links`;
- `public.finance_ingest_failures`.

This list is a baseline sample from the advisor output and must not be interpreted as a complete grant/access inventory.

### 2. SECURITY DEFINER / executable RPC exposure

Advisor output also reports many legacy functions executable by `anon` and/or `authenticated`, including mutating surfaces. Examples observed include:

- `public.protocol_logistics_order_update(...)`;
- `public.protocol_logistics_upsert_delivery_calendar(...)`;
- `public.protocol_logistics_upsert_shipping_rule(...)`;
- additional finance, product, UTM and support mutation RPCs.

Phase 1O must inventory legitimate callers before any revoke. **Do not globally revoke these functions in production as part of PCI validation.**

### 3. Other advisor classes

Pre-existing findings include:

- `security_definer_view` findings in `public`;
- mutable function `search_path` warnings;
- `rls_enabled_no_policy` informational findings;
- `pg_trgm` installed in `public`;
- leaked-password protection disabled.

PCI currently uses passwordless email Auth. Leaked-password protection becomes directly relevant if password Auth is enabled later, but the advisor warning remains part of the baseline.

## PCI security assertions that must remain true

The disposable runtime must prove independently of the legacy surface:

1. schema `pci` is private and never browser-exposed;
2. schema `pci_api` is only a narrow backend RPC surface;
3. `anon` and `authenticated` cannot directly read/write PCI business tables;
4. `anon` and `authenticated` cannot directly execute PCI business RPCs;
5. Creator browser receives no service-role/database/worker/payment-encryption/invitation-HMAC secret;
6. Creator A cannot read or mutate Creator B resources through PCI Edge Functions;
7. an authenticated Creator cannot gain `protocol_workspace_member` capabilities;
8. private Storage buckets stay private and signed contexts are object/owner scoped;
9. human Edge Functions verify JWT and re-derive actor identity server-side;
10. `pci-worker` is machine-only and secret protected;
11. commercial state transitions remain database-authoritative and idempotent.

## Security-gate interpretation

During disposable runtime validation:

- a **new PCI-specific advisor finding** is a fail until explained/fixed;
- a legacy finding reproduced unchanged from this baseline is not automatically a PCI regression;
- a legacy finding that becomes reachable from a normal Creator session is a **Creator Security Gate fail**, even if it pre-dates PCI;
- global production hardening remains a separate controlled project requiring an exact caller/grant inventory.

## Evidence required before any Creator pilot

Capture and retain:

- branch Security Advisor output after migrations;
- schema/table/function grants for `anon`, `authenticated`, `service_role` around `pci`/`pci_api`;
- Creator A/B BOLA test results;
- direct PostgREST attempts against `pci` and `pci_api`;
- Storage cross-owner/cross-path attempts;
- JWT/no-JWT Edge Function matrix;
- proof that no PCI secrets occur in Creator assets/logs/browser config;
- list of legacy `public` RPCs reachable by an authenticated Creator session, with disposition for each material mutation surface.

## Hard stop

No external Creator pilot and no production PCI deploy while the Creator Security Gate is unresolved.
