/* ==========================================================
   Protocol Data · Logistics status email activity
   2026-08-10

   Objetivo:
   - Registrar actividad transaccional recibida desde Brevo.
   - Conservar cada webhook de forma auditable.
   - Mantener un resumen rápido en el evento de email.
   - NO modifica Tracking inicial.
   - NO modifica Experiencias.
   ========================================================== */


/* ----------------------------------------------------------
   1. Resumen analítico sobre cada email de estado.
   ---------------------------------------------------------- */

alter table public.protocol_logistics_status_email_events
  add column if not exists delivered_at timestamptz,
  add column if not exists first_opened_at timestamptz,
  add column if not exists last_opened_at timestamptz,
  add column if not exists open_count integer not null default 0,
  add column if not exists first_clicked_at timestamptz,
  add column if not exists last_clicked_at timestamptz,
  add column if not exists click_count integer not null default 0,
  add column if not exists last_clicked_url text,
  add column if not exists delivery_event text,
  add column if not exists delivery_event_at timestamptz,
  add column if not exists last_provider_event text,
  add column if not exists last_provider_event_at timestamptz;


/* Contadores nunca pueden ser negativos. */

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'protocol_logistics_status_email_events_open_count_chk'
  ) then

    alter table public.protocol_logistics_status_email_events
      add constraint
        protocol_logistics_status_email_events_open_count_chk
      check (open_count >= 0);

  end if;
end;
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'protocol_logistics_status_email_events_click_count_chk'
  ) then

    alter table public.protocol_logistics_status_email_events
      add constraint
        protocol_logistics_status_email_events_click_count_chk
      check (click_count >= 0);

  end if;
end;
$$;


/*
 * Acelera la correlación con webhooks de Brevo.
 * No se hace UNIQUE para no arriesgar datos históricos
 * previamente existentes.
 */

create index if not exists
  idx_protocol_logistics_status_email_events_brevo_message
on public.protocol_logistics_status_email_events (
  brevo_message_id
)
where brevo_message_id is not null;


/* ----------------------------------------------------------
   2. Histórico inmutable de actividad.
   ---------------------------------------------------------- */

create table if not exists
  public.protocol_logistics_status_email_activity (

    id uuid primary key default gen_random_uuid(),

    status_email_event_id uuid not null
      references public.protocol_logistics_status_email_events(id)
      on delete cascade,

    provider text not null default 'brevo',

    /*
     * Identificador del webhook configurado en Brevo.
     * IMPORTANTE: no identifica de manera única
     * cada apertura/clic.
     */
    provider_webhook_id bigint,

    /*
     * Valor "message-id" recibido desde Brevo.
     */
    brevo_message_id text not null,

    /*
     * Versión normalizada para correlación/debug.
     * El Edge Function será responsable de generarla.
     */
    brevo_message_id_normalized text not null,

    /*
     * Nombre crudo del evento Brevo:
     * delivered
     * unique_opened
     * opened
     * click
     * hard_bounce
     * soft_bounce
     * blocked
     * invalid_email
     * etc.
     *
     * No usamos CHECK cerrado para poder aceptar
     * futuros eventos del proveedor sin migración.
     */
    event_type text not null,

    recipient_email text,

    occurred_at timestamptz not null,

    clicked_url text,

    subject text,

    reason text,

    tags jsonb,

    /*
     * Método utilizado para vincular el webhook:
     * message_id
     * event_id_header
     * etc.
     */
    correlation_method text,

    /*
     * Clave determinística creada por nuestro webhook.
     * Evita registrar dos veces un mismo delivery
     * reenviado por Brevo.
     */
    dedupe_key text not null,

    /*
     * Payload completo para auditoría.
     */
    payload jsonb not null,

    created_at timestamptz not null default now(),

    constraint
      protocol_logistics_status_email_activity_provider_chk
      check (provider in ('brevo'))
  );


/* ----------------------------------------------------------
   3. Idempotencia del webhook.
   ---------------------------------------------------------- */

create unique index if not exists
  uq_protocol_logistics_status_email_activity_dedupe
on public.protocol_logistics_status_email_activity (
  dedupe_key
);


/* ----------------------------------------------------------
   4. Índices analíticos.
   ---------------------------------------------------------- */

create index if not exists
  idx_protocol_logistics_status_email_activity_event
on public.protocol_logistics_status_email_activity (
  status_email_event_id,
  occurred_at desc
);


create index if not exists
  idx_protocol_logistics_status_email_activity_message
on public.protocol_logistics_status_email_activity (
  brevo_message_id_normalized,
  occurred_at desc
);


create index if not exists
  idx_protocol_logistics_status_email_activity_type
on public.protocol_logistics_status_email_activity (
  event_type,
  occurred_at desc
);


/* ----------------------------------------------------------
   5. Seguridad.

   La tabla NO puede escribirse ni leerse directamente
   desde el navegador de Protocol Data.

   El futuro Edge Function usará service_role.
   ---------------------------------------------------------- */

alter table
  public.protocol_logistics_status_email_activity
enable row level security;


revoke all
on table public.protocol_logistics_status_email_activity
from public;


revoke all
on table public.protocol_logistics_status_email_activity
from anon;


revoke all
on table public.protocol_logistics_status_email_activity
from authenticated;


grant all
on table public.protocol_logistics_status_email_activity
to service_role;
