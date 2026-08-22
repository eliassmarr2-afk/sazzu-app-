-- Protocol Creative Insights
-- Phase 2.1E.1A hotfix 2
-- Buyer-blind negotiation list precedence fix.
--
-- Runtime finding:
-- Parenthesize JSON access before jsonb key deletion.
-- No lifecycle, authorization or detail projection changes.

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
        - array[
            'workspace_id',
            'latest_message',
            'live_offer'
          ]::text[]
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
              (x.item->'latest_message')
              - array['sender_type']::text[]
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
              (x.item->'live_offer')
              - array['proposed_by_type']::text[]
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

comment on function
pci_api.creator_negotiations(uuid)
is
  'Buyer-blind Creator negotiation list. JSON access is explicitly parenthesized before key deletion.';
