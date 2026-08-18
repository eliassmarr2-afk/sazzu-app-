-- Protocol Creative Insights (PCI)
-- Phase 1I: worker command for formal offer expiration.
-- Intentionally stored in Git only; not scheduled/applied to production yet.

create or replace function pci_api.expire_due_purchase_offers(
  p_limit integer default 100,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_offer record;
  v_count integer := 0;
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_request_id uuid := coalesce(p_request_id, gen_random_uuid());
begin
  for v_offer in
    select po.offer_id, po.workspace_id, po.negotiation_id, po.creator_id
    from pci.purchase_offers po
    where po.status = 'sent'
      and po.expires_at is not null
      and po.expires_at <= now()
    order by po.expires_at
    limit v_limit
    for update skip locked
  loop
    update pci.purchase_offers
    set status = 'expired'
    where offer_id = v_offer.offer_id
      and status = 'sent';

    if found then
      v_count := v_count + 1;

      perform pci.append_event(
        v_offer.workspace_id,
        'worker', null, null,
        'purchase_offer', v_offer.offer_id,
        'offer.expired', 'sent', 'expired',
        v_request_id, null,
        jsonb_build_object('negotiation_id', v_offer.negotiation_id)
      );

      insert into pci.outbox (
        workspace_id, job_type, entity_type, entity_id, payload
      ) values (
        v_offer.workspace_id,
        'notify_offer_expired',
        'purchase_offer', v_offer.offer_id,
        jsonb_build_object(
          'creator_id', v_offer.creator_id,
          'negotiation_id', v_offer.negotiation_id
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'expired_count', v_count,
    'request_id', v_request_id
  );
end;
$$;

revoke all on function pci_api.expire_due_purchase_offers(integer,uuid) from public, anon, authenticated;
grant execute on function pci_api.expire_due_purchase_offers(integer,uuid) to service_role;

comment on function pci_api.expire_due_purchase_offers(integer,uuid) is
  'Idempotent worker batch that materializes sent->expired for due formal offers; scheduling is intentionally deferred.';