-- Protocol Creative Insights (PCI)
-- Phase 1O runtime hardening: internal PCI control-plane access is fail-closed.
--
-- During pilot/runtime validation, an active Protocol workspace membership alone is
-- not sufficient authorization for PCI internal APIs. Only owner/admin may cross
-- the shared internal operator guard. Analyst/viewer access can be added later to
-- narrowly scoped read models after an explicit permission matrix is approved.
--
-- Intentionally stored in Git and applied only to the disposable Phase 1O runtime.
-- Production remains untouched.

create or replace function pci.require_active_workspace_member(
  p_user_id uuid,
  p_workspace_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
begin
  if p_user_id is null or p_workspace_id is null then
    raise exception using errcode = '42501', message = 'pci_operator_context_required';
  end if;

  select pwm.role
  into v_role
  from public.protocol_workspace_members pwm
  where pwm.user_id = p_user_id
    and pwm.workspace_id = p_workspace_id
    and pwm.status = 'active'
  limit 1;

  if v_role is null or v_role not in ('owner', 'admin') then
    -- Deliberately do not reveal whether the membership exists or which role it has.
    raise exception using errcode = '42501', message = 'pci_workspace_access_denied';
  end if;
end;
$$;

revoke all on function pci.require_active_workspace_member(uuid,text)
  from public, anon, authenticated;
grant execute on function pci.require_active_workspace_member(uuid,text)
  to service_role;

comment on function pci.require_active_workspace_member(uuid,text) is
  'PCI pilot internal authorization gate. Requires an active Protocol workspace membership with owner/admin role; analyst/viewer are denied until explicit least-privilege read permissions are designed.';
