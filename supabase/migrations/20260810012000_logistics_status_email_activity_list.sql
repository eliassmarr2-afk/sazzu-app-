/* ==========================================================
   Protocol Data · Logística · Actividad de emails
   RPC de lectura para interfaz interna.

   Seguridad:
   - sólo authenticated
   - anon/public sin EXECUTE
   - requiere auth.uid()
   - no expone payloads ni datos internos de Brevo
   ========================================================== */

create or replace function
  public.protocol_logistics_status_email_activity_list(
    input_tracking_ids text[]
  )
returns jsonb

language plpgsql
security definer
set search_path = ''

as $function$

declare
  v_tracking_ids text[];

begin

  /* --------------------------------------------------------
     Exigir sesión real de Protocol Data.
     -------------------------------------------------------- */

  if auth.uid() is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;


  /* --------------------------------------------------------
     Normalizar tracking IDs.

     Máximo 100 por request para coincidir con la carga
     actual de Pedidos.
     -------------------------------------------------------- */

  select
    coalesce(
      array_agg(x.tracking_id),
      array[]::text[]
    )
  into v_tracking_ids

  from (
    select distinct
      upper(btrim(value)) as tracking_id

    from unnest(
      coalesce(
        input_tracking_ids,
        array[]::text[]
      )
    ) as value

    where
      value is not null
      and btrim(value) <> ''

    limit 100
  ) as x;


  if cardinality(v_tracking_ids) = 0 then
    return jsonb_build_object(
      'status', 'ok',
      'items', '[]'::jsonb
    );
  end if;


  /* --------------------------------------------------------
     Sólo resumen seguro para UI.

     NO se exponen:
     - payload del webhook
     - headers
     - recipient_email
     - reason/provider metadata
     - secretos
     -------------------------------------------------------- */

  return jsonb_build_object(

    'status',
    'ok',

    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(

            'tracking_id',
            e.tracking_id,

            'to_status',
            e.to_status,

            'status',
            e.status,

            'sent_at',
            e.sent_at,

            'delivered_at',
            e.delivered_at,

            'first_opened_at',
            e.first_opened_at,

            'last_opened_at',
            e.last_opened_at,

            'open_count',
            coalesce(e.open_count, 0),

            'first_clicked_at',
            e.first_clicked_at,

            'last_clicked_at',
            e.last_clicked_at,

            'click_count',
            coalesce(e.click_count, 0),

            'last_clicked_url',
            e.last_clicked_url,

            'delivery_event',
            e.delivery_event,

            'delivery_event_at',
            e.delivery_event_at,

            'last_provider_event',
            e.last_provider_event,

            'last_provider_event_at',
            e.last_provider_event_at
          )

          order by
            e.tracking_id,
            coalesce(
              e.sent_at,
              e.created_at
            ) desc
        )

        from public.protocol_logistics_status_email_events e

        where
          upper(e.tracking_id)
            = any(v_tracking_ids)

          and e.to_status in (
            'despachado',
            'en_camino',
            'entregado'
          )
      ),
      '[]'::jsonb
    )
  );

end;

$function$;


/* ----------------------------------------------------------
   Privilegios.
   ---------------------------------------------------------- */

revoke all
on function
  public.protocol_logistics_status_email_activity_list(text[])
from public;


revoke all
on function
  public.protocol_logistics_status_email_activity_list(text[])
from anon;


revoke all
on function
  public.protocol_logistics_status_email_activity_list(text[])
from authenticated;


grant execute
on function
  public.protocol_logistics_status_email_activity_list(text[])
to authenticated;
