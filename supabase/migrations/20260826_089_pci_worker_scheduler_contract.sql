-- Protocol Creative Insights (PCI)
-- Phase 2.1U.1: portable scheduler contract for pci-worker.
-- Installs the required scheduler/network extensions and exposes the Vault-backed
-- scheduler secret only to service_role. Environment-specific URL/scheduling
-- configuration lives outside the normal migrations directory.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function pci_api.worker_scheduler_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets ds
  where ds.name = 'pci_worker_scheduler_secret'
  order by ds.created_at desc
  limit 1;
$$;

revoke all on function pci_api.worker_scheduler_secret() from public, anon, authenticated;
grant execute on function pci_api.worker_scheduler_secret() to service_role;

comment on function pci_api.worker_scheduler_secret() is
  'Returns the Vault-backed pci-worker scheduler secret to service_role only. Used by the worker to authenticate scheduled invocations without exposing the existing manual worker secret.';
