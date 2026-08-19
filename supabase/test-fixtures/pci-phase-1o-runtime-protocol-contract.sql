-- Protocol Creative Insights — Phase 1O disposable-runtime Protocol contract fixture
-- TEST ONLY. Never apply to production.
--
-- The clean Free Supabase project used for Phase 1O does not inherit the legacy
-- Protocol Data schema. PCI migrations reference the workspace/membership contract,
-- so this fixture recreates only that minimal structural dependency, with no
-- production rows or business data.

create table if not exists public.protocol_workspaces (
  workspace_id text primary key,
  name text not null,
  status text not null default 'active'
    check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.protocol_workspace_members (
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  workspace_id text not null references public.protocol_workspaces(workspace_id) on update cascade on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner','admin','analyst','viewer')),
  status text not null default 'active'
    check (status in ('active','invited','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

comment on table public.protocol_workspaces is
  'Phase 1O TEST fixture matching the production Protocol workspace contract. No production data.';
comment on table public.protocol_workspace_members is
  'Phase 1O TEST fixture matching the production Protocol membership contract. No production data.';
