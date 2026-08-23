-- Protocol Creative Insights (PCI)
-- 2.1L.3 · Authorized operator read wrapper for Consignment matching candidates.
-- Runtime-test first. No production deployment in this phase.

create or replace function pci_api.admin_consignment_matching_candidates(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  if p_consignment_id is null then
    raise exception
      using errcode = '22023',
      message = 'pci_consignment_matching_context_required';
  end if;

  if not exists (
    select 1
    from pci.consignments c
    where c.workspace_id = p_workspace_id
      and c.consignment_id = p_consignment_id
  ) then
    raise exception
      using errcode = 'P0002',
      message = 'pci_consignment_not_found';
  end if;

  v_items := pci.consignment_matching_candidates(
    p_workspace_id,
    p_consignment_id
  );

  return jsonb_build_object(
    'ok', true,
    'workspace_id', p_workspace_id,
    'consignment_id', p_consignment_id,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function pci_api.admin_consignment_matching_candidates(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function pci_api.admin_consignment_matching_candidates(
  uuid,
  text,
  uuid
) to service_role;

comment on function pci_api.admin_consignment_matching_candidates(
  uuid,
  text,
  uuid
) is
  'Authorized operator read: returns ranked Consignment matching candidates for one workspace-scoped Consignment.';
