-- Protocol Creative Insights
-- Phase 2.1E.1A
-- Buyer-blind Creator negotiation projections.
--
-- Security boundary:
-- - Creator never receives workspace_id from Negotiations.
-- - Internal workspace/operator concepts are projected as "buyer".
-- - Raw commercial_terms_snapshot is not exposed.
-- - Raw item_terms_snapshot is not exposed.
-- - Creator sees an intentionally neutral counterparty identity.
--
-- No commercial lifecycle or command semantics are changed.

create or replace function pci_api.creator_negotiations(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_items jsonb;
begin
  v_creator := pci.require_active_creator(
    p_actor_user_id
  );

  v_result :=
    pci.creator_negotiations_core_1o(
      p_actor_user_id
    );

  select coalesce(
    jsonb_agg(
      (
        x.item
        - 'workspace_id'
        - 'latest_message'
        - 'live_offer'
      )
      ||
      jsonb_build_object(
        'counterparty',
        jsonb_build_object(
          'type', 'verified_buyer',
          'display_name',
            'Comprador verificado por Protocol',
          'identity_disclosed', false
        ),

        'latest_message',
        case
          when x.item->'latest_message'
            is null
            or jsonb_typeof(
              x.item->'latest_message'
            ) = 'null'
          then null

          else
            (
              x.item->'latest_message'
              - 'sender_type'
            )
            ||
            jsonb_build_object(
              'sender_type',
              case
                when
                  x.item->'latest_message'
                    ->>'sender_type'
                    = 'operator'
                then 'buyer'

                else
                  x.item->'latest_message'
                    ->>'sender_type'
              end
            )
        end,

        'live_offer',
        case
          when x.item->'live_offer'
            is null
            or jsonb_typeof(
              x.item->'live_offer'
            ) = 'null'
          then null

          else
            (
              x.item->'live_offer'
              - 'proposed_by_type'
            )
            ||
            jsonb_build_object(
              'proposed_by_type',
              case
                when
                  x.item->'live_offer'
                    ->>'proposed_by_type'
                    = 'workspace'
                then 'buyer'

                else
                  x.item->'live_offer'
                    ->>'proposed_by_type'
              end
            )
        end
      )
      order by x.ord
    ),
    '[]'::jsonb
  )
  into v_items
  from jsonb_array_elements(
    coalesce(
      v_result->'items',
      '[]'::jsonb
    )
  )
  with ordinality as x(item, ord)
  where exists (
    select 1
    from pci.workspace_creators wc
    where
      wc.creator_id =
        v_creator.creator_id
      and wc.workspace_id =
        x.item->>'workspace_id'
      and wc.status in (
        'active',
        'restricted'
      )
  );

  return jsonb_build_object(
    'ok', true,
    'items', v_items
  );
end;
$$;


create or replace function
pci_api.creator_negotiation_detail(
  p_actor_user_id uuid,
  p_negotiation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator pci.creators%rowtype;
  v_result jsonb;
  v_workspace_id text;
  v_messages jsonb;
  v_offers jsonb;
begin
  v_creator := pci.require_active_creator(
    p_actor_user_id
  );

  select n.workspace_id
  into v_workspace_id
  from pci.negotiations n
  where
    n.negotiation_id =
      p_negotiation_id
    and n.creator_id =
      v_creator.creator_id;

  if v_workspace_id is null then
    raise exception
      using
        errcode = 'P0002',
        message = 'pci_negotiation_not_found';
  end if;

  perform pci.require_creator_workspace_access(
    v_creator.creator_id,
    v_workspace_id,
    'read'
  );

  v_result :=
    pci.creator_negotiation_detail_core_1o(
      p_actor_user_id,
      p_negotiation_id
    );

  -- Public messages expose only buyer/creator,
  -- never operator identity concepts.
  select coalesce(
    jsonb_agg(
      (
        m.item
        - 'sender_type'
      )
      ||
      jsonb_build_object(
        'sender_type',
        case
          when
            m.item->>'sender_type'
              = 'operator'
          then 'buyer'

          else
            m.item->>'sender_type'
        end
      )
      order by m.ord
    ),
    '[]'::jsonb
  )
  into v_messages
  from jsonb_array_elements(
    coalesce(
      v_result->'messages',
      '[]'::jsonb
    )
  )
  with ordinality as m(item, ord);

  -- Public offers preserve contractual terms,
  -- but remove raw internal commercial metadata.
  select coalesce(
    jsonb_agg(
      (
        o.item
        - 'proposed_by_type'
        - 'commercial_terms_snapshot'
        - 'items'
      )
      ||
      jsonb_build_object(
        'proposed_by_type',
        case
          when
            o.item->>'proposed_by_type'
              = 'workspace'
          then 'buyer'

          else
            o.item->>'proposed_by_type'
        end,

        'counter_note',
        nullif(
          o.item
            #>> '{commercial_terms_snapshot,creator_counter_note}',
          ''
        ),

        'items',
        (
          select coalesce(
            jsonb_agg(
              i.item
                - 'item_terms_snapshot'
              order by i.ord
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(
            coalesce(
              o.item->'items',
              '[]'::jsonb
            )
          )
          with ordinality
            as i(item, ord)
        )
      )
      order by o.ord
    ),
    '[]'::jsonb
  )
  into v_offers
  from jsonb_array_elements(
    coalesce(
      v_result->'offers',
      '[]'::jsonb
    )
  )
  with ordinality as o(item, ord);

  return
    (
      v_result
      - 'negotiation'
      - 'messages'
      - 'offers'
    )
    ||
    jsonb_build_object(
      'counterparty',
      jsonb_build_object(
        'type', 'verified_buyer',
        'display_name',
          'Comprador verificado por Protocol',
        'identity_disclosed', false
      ),

      'negotiation',
      (
        coalesce(
          v_result->'negotiation',
          '{}'::jsonb
        )
        - 'workspace_id'
      ),

      'messages',
      v_messages,

      'offers',
      v_offers
    );
end;
$$;


comment on function
pci_api.creator_negotiations(uuid)
is
  'Buyer-blind Creator negotiation list. Workspace identity is used internally for authorization but is never projected to Creator clients.';


comment on function
pci_api.creator_negotiation_detail(uuid,uuid)
is
  'Buyer-blind Creator negotiation detail. Counterparty is intentionally represented as a verified Protocol buyer and internal workspace/operator metadata is excluded.';
