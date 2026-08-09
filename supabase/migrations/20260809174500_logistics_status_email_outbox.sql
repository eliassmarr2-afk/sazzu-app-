/* ==========================================================
   Protocol Data · Logistics status email outbox
   2026-08-09

   Alcance:
   - NO modifica tracking inicial "Rastrea tu pedido".
   - NO modifica Experiencias.
   - Registra eventos únicamente cuando el estado DESTINO es:
       despachado
       en_camino
       entregado
   ========================================================== */

create table if not exists public.protocol_logistics_status_email_events (
  id uuid primary key default gen_random_uuid(),

  logistics_order_id uuid,
  order_id uuid,

  tracking_id text not null,

  from_status text not null,
  to_status text not null,

  template_key text not null,

  status text not null default 'pending',

  attempts integer not null default 0,

  last_attempt_at timestamptz,
  next_retry_at timestamptz,

  sent_at timestamptz,

  brevo_message_id text,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint protocol_logistics_status_email_events_to_status_chk
    check (
      to_status in (
        'despachado',
        'en_camino',
        'entregado'
      )
    ),

  constraint protocol_logistics_status_email_events_status_chk
    check (
      status in (
        'pending',
        'processing',
        'sent',
        'error'
      )
    ),

  constraint protocol_logistics_status_email_events_template_chk
    check (
      template_key in (
        'logistics_despachado',
        'logistics_en_camino',
        'logistics_entregado'
      )
    )
);

create index if not exists
  idx_protocol_logistics_status_email_events_tracking
on public.protocol_logistics_status_email_events (
  tracking_id,
  created_at desc
);

create index if not exists
  idx_protocol_logistics_status_email_events_pending
on public.protocol_logistics_status_email_events (
  status,
  next_retry_at,
  created_at
);

alter table
  public.protocol_logistics_status_email_events
enable row level security;

revoke all
on table public.protocol_logistics_status_email_events
from anon, authenticated;

grant all
on table public.protocol_logistics_status_email_events
to service_role;


/* ----------------------------------------------------------
   Updated-at automático.
   Reutiliza la función ya existente en Protocol.
   ---------------------------------------------------------- */

drop trigger if exists
  trg_protocol_logistics_status_email_events_updated_at
on public.protocol_logistics_status_email_events;

create trigger
  trg_protocol_logistics_status_email_events_updated_at
before update
on public.protocol_logistics_status_email_events
for each row
execute function public.protocol_touch_updated_at();


/* ----------------------------------------------------------
   Ampliación del RPC existente.

   Importante:
   - Conserva la actualización actual.
   - Bloquea la fila para serializar cambios concurrentes.
   - Compara estado anterior vs estado realmente guardado.
   - Sólo genera outbox para los 3 estados pactados.
   - Experiencias continúa operando mediante sus triggers.
   ---------------------------------------------------------- */

create or replace function public.protocol_logistics_order_update(
  input_tracking_id text,
  input_estado_logistico text default null::text,
  input_banda_horaria_estimada text default null::text,
  input_banner_id text default null::text,
  input_envio_estado text default null::text,
  input_envio_valor text default null::text,
  input_monto_a_pagar_repartidor text default null::text,
  input_issue_active boolean default null::boolean,
  input_issue_stage text default null::text,
  input_issue_type text default null::text,
  input_issue_message_public text default null::text,
  input_observacion_publica text default null::text,
  input_observacion_interna text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_logistics_order_id uuid;
  v_order_id uuid;

  v_previous_status text;
  v_saved_status text;

  v_event_id uuid;
  v_template_key text;
begin
  /*
   * FOR UPDATE evita que dos requests concurrentes
   * generen dos eventos para el mismo cambio real.
   */
  select
    id,
    order_id,
    estado_logistico
  into
    v_logistics_order_id,
    v_order_id,
    v_previous_status
  from public.protocol_logistics_orders
  where tracking_id = upper(trim(input_tracking_id))
  for update;

  if not found then
    return jsonb_build_object(
      'status',
      'not_found',
      'message',
      'No existe ese tracking_id'
    );
  end if;

  update public.protocol_logistics_orders
     set estado_logistico =
           coalesce(
             nullif(input_estado_logistico, ''),
             estado_logistico
           ),

         banda_horaria_estimada =
           coalesce(
             nullif(input_banda_horaria_estimada, ''),
             banda_horaria_estimada
           ),

         banner_id =
           coalesce(
             nullif(input_banner_id, ''),
             banner_id
           ),

         envio_estado =
           coalesce(
             nullif(input_envio_estado, ''),
             envio_estado
           ),

         envio_valor =
           case
             when input_envio_valor is null
               or input_envio_valor = ''
             then envio_valor
             else public.protocol_safe_numeric(
               input_envio_valor
             )
           end,

         monto_a_pagar_repartidor =
           case
             when input_monto_a_pagar_repartidor is null
               or input_monto_a_pagar_repartidor = ''
             then monto_a_pagar_repartidor
             else public.protocol_safe_numeric(
               input_monto_a_pagar_repartidor
             )
           end,

         issue_active =
           coalesce(
             input_issue_active,
             issue_active
           ),

         issue_stage =
           input_issue_stage,

         issue_type =
           input_issue_type,

         issue_message_public =
           input_issue_message_public,

         observacion_publica =
           coalesce(
             nullif(input_observacion_publica, ''),
             observacion_publica
           ),

         observacion_interna =
           input_observacion_interna,

         fecha_ultima_actualizacion = now(),
         updated_at = now()

   where id = v_logistics_order_id

   returning estado_logistico
   into v_saved_status;


  /*
   * Sólo una transición REAL genera evento.
   *
   * Recibido queda totalmente fuera de este circuito.
   */
  if
    v_previous_status is distinct from v_saved_status
    and v_saved_status in (
      'despachado',
      'en_camino',
      'entregado'
    )
  then

    v_template_key :=
      case v_saved_status
        when 'despachado'
          then 'logistics_despachado'

        when 'en_camino'
          then 'logistics_en_camino'

        when 'entregado'
          then 'logistics_entregado'

        else null
      end;

    insert into
      public.protocol_logistics_status_email_events (
        logistics_order_id,
        order_id,
        tracking_id,
        from_status,
        to_status,
        template_key,
        status
      )
    values (
      v_logistics_order_id,
      v_order_id,
      upper(trim(input_tracking_id)),
      v_previous_status,
      v_saved_status,
      v_template_key,
      'pending'
    )
    returning id
    into v_event_id;

  end if;


  return jsonb_build_object(
    'status',
    'ok',

    'tracking_id',
    upper(trim(input_tracking_id)),

    'message',
    'Pedido actualizado correctamente',

    'previous_status',
    v_previous_status,

    'saved_status',
    v_saved_status,

    'status_email_queued',
    v_event_id is not null,

    'status_email_event_id',
    v_event_id
  );
end;
$function$;
