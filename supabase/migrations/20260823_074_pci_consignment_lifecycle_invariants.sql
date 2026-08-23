-- Protocol Creative Insights
-- 2.1I.2B.1A
-- Consignment lifecycle invariants + lifecycle read context.
--
-- No business data is mutated by this migration.


-- ================================================================
-- 1. ONE DRAFT REVISION PER CONSIGNMENT
-- ================================================================
--
-- An open/paused Consignment keeps its published revision in
-- current_revision_id while a future revision may exist as draft.
--
-- This index prevents ambiguous V2/V3 drafts.

create unique index
if not exists
pci_consignment_revisions_one_draft_per_consignment
on pci.consignment_revisions (
  consignment_id
)
where status='draft';


-- ================================================================
-- 2. ADMIN LIFECYCLE CONTEXT
-- ================================================================

create or replace function
pci_api.admin_consignment_lifecycle_context(
  p_actor_user_id uuid,
  p_workspace_id text,
  p_consignment_id uuid
)
returns jsonb
language plpgsql
stable
set search_path=''
as $$
declare
  v_consignment
    pci.consignments%rowtype;

  v_current
    pci.consignment_revisions%rowtype;

  v_draft
    pci.consignment_revisions%rowtype;

  v_active_current bigint;
  v_active_legacy bigint;

  v_invited_current bigint;
  v_invited_legacy bigint;
begin
  perform pci.require_active_workspace_member(
    p_actor_user_id,
    p_workspace_id
  );

  select *
  into v_consignment
  from pci.consignments c
  where c.workspace_id=
        p_workspace_id
    and c.consignment_id=
        p_consignment_id;

  if v_consignment.consignment_id
       is null
  then
    raise exception
      using
        errcode='P0002',
        message=
          'pci_consignment_not_found';
  end if;


  if v_consignment.current_revision_id
       is not null
  then
    select *
    into v_current
    from pci.consignment_revisions r
    where r.consignment_revision_id=
          v_consignment.current_revision_id
      and r.consignment_id=
          v_consignment.consignment_id;
  end if;


  select *
  into v_draft
  from pci.consignment_revisions r
  where r.consignment_id=
        v_consignment.consignment_id
    and r.status='draft'
  order by r.revision_number desc
  limit 1;


  select count(*)
  into v_active_current
  from pci.consignment_participations cp
  where cp.workspace_id=
        p_workspace_id
    and cp.consignment_id=
        p_consignment_id
    and cp.status='active'
    and cp.consignment_revision_id=
        v_consignment.current_revision_id;


  select count(*)
  into v_active_legacy
  from pci.consignment_participations cp
  where cp.workspace_id=
        p_workspace_id
    and cp.consignment_id=
        p_consignment_id
    and cp.status='active'
    and cp.consignment_revision_id
        is distinct from
        v_consignment.current_revision_id;


  select count(*)
  into v_invited_current
  from pci.consignment_participations cp
  where cp.workspace_id=
        p_workspace_id
    and cp.consignment_id=
        p_consignment_id
    and cp.status='invited'
    and cp.consignment_revision_id=
        v_consignment.current_revision_id;


  select count(*)
  into v_invited_legacy
  from pci.consignment_participations cp
  where cp.workspace_id=
        p_workspace_id
    and cp.consignment_id=
        p_consignment_id
    and cp.status='invited'
    and cp.consignment_revision_id
        is distinct from
        v_consignment.current_revision_id;


  return jsonb_build_object(
    'ok',
    true,

    'workspace_id',
    p_workspace_id,

    'consignment_id',
    v_consignment.consignment_id,

    'status',
    v_consignment.status,

    'visibility',
    v_consignment.visibility,

    'current_revision',
    case
      when v_current.consignment_revision_id
           is null
      then null
      else jsonb_build_object(
        'consignment_revision_id',
        v_current.consignment_revision_id,

        'revision_number',
        v_current.revision_number,

        'status',
        v_current.status,

        'title',
        v_current.title,

        'matching_tags',
        v_current.matching_tags,

        'published_at',
        v_current.published_at
      )
    end,

    'draft_revision',
    case
      when v_draft.consignment_revision_id
           is null
      then null
      else jsonb_build_object(
        'consignment_revision_id',
        v_draft.consignment_revision_id,

        'revision_number',
        v_draft.revision_number,

        'status',
        v_draft.status,

        'title',
        v_draft.title,

        'matching_tags',
        v_draft.matching_tags,

        'created_at',
        v_draft.created_at
      )
    end,

    'participation_binding',
    jsonb_build_object(
      'active_current_revision',
      v_active_current,

      'active_legacy_revision',
      v_active_legacy,

      'invited_current_revision',
      v_invited_current,

      'invited_legacy_revision',
      v_invited_legacy
    ),

    'allowed_actions',
    jsonb_build_object(

      'update_initial_draft',
      (
        v_consignment.status='draft'
        and
        v_current.status='draft'
      ),

      'publish_initial',
      (
        v_consignment.status='draft'
        and
        v_current.status='draft'
      ),

      'create_revision',
      (
        v_consignment.status
          in ('open','paused')
        and
        v_current.status='published'
        and
        v_draft.consignment_revision_id
          is null
      ),

      'update_revision_draft',
      (
        v_consignment.status
          in ('open','paused')
        and
        v_draft.consignment_revision_id
          is not null
      ),

      'publish_revision',
      (
        v_consignment.status
          in ('open','paused')
        and
        v_current.status='published'
        and
        v_draft.consignment_revision_id
          is not null
      ),

      'pause',
      v_consignment.status='open',

      'resume',
      v_consignment.status='paused',

      'close',
      v_consignment.status
        in ('open','paused'),

      'archive',
      v_consignment.status='closed'
    )
  );
end;
$$;


revoke all
on function
pci_api.admin_consignment_lifecycle_context(
  uuid,
  text,
  uuid
)
from public, anon, authenticated;

grant execute
on function
pci_api.admin_consignment_lifecycle_context(
  uuid,
  text,
  uuid
)
to service_role;
