/* ==========================================================
   Protocol Data · Logistics status email atomic claim
   2026-08-09

   Reclama un evento del outbox de forma atómica antes
   de que el Edge Function intente enviarlo por Brevo.
   ========================================================== */

create or replace function public.protocol_logistics_status_email_claim(
  input_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.protocol_logistics_status_email_events%rowtype;
  v_next_attempt integer;
begin
  /*
   * Bloqueo de fila:
   * sólo un worker puede evaluar/reclamar este evento
   * al mismo tiempo.
   */
  select *
    into v_event
  from public.protocol_logistics_status_email_events
  where id = input_event_id
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'event_id', input_event_id
    );
  end if;


  /*
   * Ya fue enviado.
   * Nunca debe reclamarse nuevamente.
   */
  if v_event.status = 'sent' then
    return jsonb_build_object(
      'status', 'already_sent',
      'event_id', v_event.id,
      'brevo_message_id', v_event.brevo_message_id,
      'sent_at', v_event.sent_at
    );
  end if;


  /*
   * Un processing reciente pertenece a otro worker.
   *
   * Si quedó processing por una ejecución interrumpida,
   * puede recuperarse una vez superados 5 minutos.
   */
  if
    v_event.status = 'processing'
    and v_event.last_attempt_at is not null
    and v_event.last_attempt_at > now() - interval '5 minutes'
  then
    return jsonb_build_object(
      'status', 'busy',
      'event_id', v_event.id,
      'attempts', v_event.attempts,
      'last_attempt_at', v_event.last_attempt_at
    );
  end if;


  /*
   * Máximo 3 intentos.
   */
  if
    coalesce(v_event.attempts, 0) >= 3
    and v_event.status in ('error', 'processing')
  then
    return jsonb_build_object(
      'status', 'exhausted',
      'event_id', v_event.id,
      'attempts', v_event.attempts,
      'error_message', v_event.error_message
    );
  end if;


  /*
   * Error todavía dentro de su ventana de espera.
   */
  if
    v_event.status = 'error'
    and v_event.next_retry_at is not null
    and v_event.next_retry_at > now()
  then
    return jsonb_build_object(
      'status', 'retry_later',
      'event_id', v_event.id,
      'attempts', v_event.attempts,
      'next_retry_at', v_event.next_retry_at
    );
  end if;


  v_next_attempt :=
    coalesce(v_event.attempts, 0) + 1;


  update public.protocol_logistics_status_email_events
     set status = 'processing',
         attempts = v_next_attempt,
         last_attempt_at = now(),
         next_retry_at = null,
         error_message = null
   where id = v_event.id;


  return jsonb_build_object(
    'status', 'claimed',

    'event_id', v_event.id,

    'logistics_order_id',
    v_event.logistics_order_id,

    'order_id',
    v_event.order_id,

    'tracking_id',
    v_event.tracking_id,

    'from_status',
    v_event.from_status,

    'to_status',
    v_event.to_status,

    'template_key',
    v_event.template_key,

    'attempts',
    v_next_attempt
  );
end;
$function$;


/*
 * Este RPC es exclusivamente de backend.
 * El navegador no necesita poder reclamar eventos.
 */

revoke all
on function public.protocol_logistics_status_email_claim(uuid)
from public;

revoke all
on function public.protocol_logistics_status_email_claim(uuid)
from anon;

revoke all
on function public.protocol_logistics_status_email_claim(uuid)
from authenticated;

grant execute
on function public.protocol_logistics_status_email_claim(uuid)
to service_role;
