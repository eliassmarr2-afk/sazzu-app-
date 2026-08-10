/* ==========================================================
   Protocol Data · Record Brevo logistics email activity
   2026-08-10

   Objetivo:
   - Correlacionar webhook Brevo con un email logístico.
   - Deduplicar reintentos del mismo webhook.
   - Guardar actividad histórica.
   - Actualizar resumen analítico en forma atómica.

   NO modifica:
   - Tracking inicial.
   - Experiencias.
   - Cambio de estado logístico.
   - Envío de emails.
   ========================================================== */


/* ----------------------------------------------------------
   1. Message ID normalizado en el evento principal.

   Brevo puede representar message-id con o sin < >.
   Conservamos el valor original y agregamos una versión
   normalizada para correlación.
   ---------------------------------------------------------- */

alter table public.protocol_logistics_status_email_events
  add column if not exists
    brevo_message_id_normalized text;


/* Backfill de eventos ya existentes. */

update public.protocol_logistics_status_email_events
set brevo_message_id_normalized =
  lower(
    trim(
      both '<>'
      from btrim(brevo_message_id)
    )
  )
where brevo_message_id is not null
  and btrim(brevo_message_id) <> ''
  and (
    brevo_message_id_normalized is null
    or brevo_message_id_normalized = ''
  );


create index if not exists
  idx_protocol_logistics_status_email_events_brevo_normalized
on public.protocol_logistics_status_email_events (
  brevo_message_id_normalized
)
where brevo_message_id_normalized is not null;


/* ----------------------------------------------------------
   2. RPC interno.

   Se ejecutará exclusivamente desde la futura Edge Function
   mediante service_role.
   ---------------------------------------------------------- */

create or replace function
  public.protocol_logistics_status_email_activity_record(

    input_brevo_message_id text,
    input_event_type text,
    input_occurred_at timestamptz,

    input_recipient_email text,
    input_clicked_url text,
    input_subject text,
    input_reason text,
    input_tags jsonb,

    input_provider_webhook_id bigint,
    input_correlation_method text,

    input_payload jsonb
  )
returns jsonb

language plpgsql
security definer
set search_path to 'public'

as $function$

declare

  v_message_id text;
  v_event_type text;

  v_match_count bigint;

  v_status_email_event_id uuid;
  v_activity_id uuid;

  v_dedupe_key text;

begin

  /* --------------------------------------------------------
     Validaciones mínimas.
     -------------------------------------------------------- */

  if input_brevo_message_id is null
     or btrim(input_brevo_message_id) = ''
  then

    return jsonb_build_object(
      'status', 'invalid',
      'message', 'brevo_message_id requerido'
    );

  end if;


  if input_event_type is null
     or btrim(input_event_type) = ''
  then

    return jsonb_build_object(
      'status', 'invalid',
      'message', 'event_type requerido'
    );

  end if;


  if input_occurred_at is null then

    return jsonb_build_object(
      'status', 'invalid',
      'message', 'occurred_at requerido'
    );

  end if;


  if input_payload is null then

    return jsonb_build_object(
      'status', 'invalid',
      'message', 'payload requerido'
    );

  end if;


  /* --------------------------------------------------------
     Normalizar Message ID.
     -------------------------------------------------------- */

  v_message_id :=
    lower(
      trim(
        both '<>'
        from btrim(input_brevo_message_id)
      )
    );


  if v_message_id = '' then

    return jsonb_build_object(
      'status', 'invalid',
      'message', 'brevo_message_id vacío después de normalizar'
    );

  end if;


  /* --------------------------------------------------------
     Normalizar nombres de eventos.

     Payload real de Brevo usa valores como:
       unique_opened
       soft_bounce
       hard_bounce

     También toleramos variantes camelCase por seguridad.
     -------------------------------------------------------- */

  v_event_type :=
    lower(
      replace(
        replace(
          btrim(input_event_type),
          '-',
          '_'
        ),
        ' ',
        '_'
      )
    );


  v_event_type :=
    case v_event_type

      when 'uniqueopened'
        then 'unique_opened'

      when 'hardbounce'
        then 'hard_bounce'

      when 'softbounce'
        then 'soft_bounce'

      when 'proxyopen'
        then 'proxy_open'

      when 'uniqueproxyopen'
        then 'unique_proxy_open'

      when 'invalidemail'
        then 'invalid'

      when 'invalid_email'
        then 'invalid'

      else v_event_type

    end;


  /* --------------------------------------------------------
     Correlación.

     Usamos primero brevo_message_id_normalized.

     El COALESCE permite además reconocer eventos creados
     antes de que el worker empiece a escribir directamente
     la columna normalizada.
     -------------------------------------------------------- */

  select count(*)
  into v_match_count

  from public.protocol_logistics_status_email_events e

  where coalesce(
    nullif(e.brevo_message_id_normalized, ''),
    lower(
      trim(
        both '<>'
        from btrim(e.brevo_message_id)
      )
    )
  ) = v_message_id;


  if v_match_count = 0 then

    return jsonb_build_object(
      'status', 'not_found',
      'brevo_message_id_normalized', v_message_id
    );

  end if;


  /*
   * No elegimos arbitrariamente si por algún problema
   * dos emails tienen el mismo Message ID.
   */

  if v_match_count > 1 then

    return jsonb_build_object(
      'status', 'ambiguous',
      'matches', v_match_count,
      'brevo_message_id_normalized', v_message_id
    );

  end if;


  /*
   * Lock del evento principal.
   * Serializa dos webhooks concurrentes sobre el mismo email.
   */

  select e.id
  into v_status_email_event_id

  from public.protocol_logistics_status_email_events e

  where coalesce(
    nullif(e.brevo_message_id_normalized, ''),
    lower(
      trim(
        both '<>'
        from btrim(e.brevo_message_id)
      )
    )
  ) = v_message_id

  for update;


  /* --------------------------------------------------------
     Dedupe.

     El ID enviado por Brevo en "id" identifica al webhook,
     no a cada apertura/clic.

     Por eso la idempotencia se basa en:
       proveedor
       message-id
       tipo de evento
       payload JSON completo

     Un reintento idéntico produce la misma clave.
     -------------------------------------------------------- */

  v_dedupe_key :=
    'brevo:' ||
    v_message_id ||
    ':' ||
    v_event_type ||
    ':' ||
    md5(input_payload::text);


  insert into
    public.protocol_logistics_status_email_activity (

      status_email_event_id,

      provider,
      provider_webhook_id,

      brevo_message_id,
      brevo_message_id_normalized,

      event_type,

      recipient_email,
      occurred_at,

      clicked_url,
      subject,
      reason,
      tags,

      correlation_method,

      dedupe_key,
      payload
    )

  values (

    v_status_email_event_id,

    'brevo',
    input_provider_webhook_id,

    input_brevo_message_id,
    v_message_id,

    v_event_type,

    nullif(btrim(input_recipient_email), ''),
    input_occurred_at,

    nullif(btrim(input_clicked_url), ''),
    nullif(btrim(input_subject), ''),
    nullif(btrim(input_reason), ''),
    input_tags,

    coalesce(
      nullif(
        btrim(input_correlation_method),
        ''
      ),
      'message_id'
    ),

    v_dedupe_key,
    input_payload
  )

  on conflict (dedupe_key)
  do nothing

  returning id
  into v_activity_id;


  /* --------------------------------------------------------
     Webhook repetido.

     No modificamos contadores por segunda vez.
     -------------------------------------------------------- */

  if v_activity_id is null then

    return jsonb_build_object(
      'status', 'duplicate',
      'status_email_event_id', v_status_email_event_id,
      'dedupe_key', v_dedupe_key
    );

  end if;


  /* --------------------------------------------------------
     Actualizar resumen.

     IMPORTANTE SOBRE APERTURAS:

     unique_opened = primera apertura informada por Brevo.
     opened        = evento ordinario de apertura.

     first_opened_at se alimenta de ambos.

     open_count incrementa únicamente con "opened", para no
     sumar dos veces la primera apertura si Brevo notifica
     unique_opened + opened.

     Los proxy opens quedan en el histórico pero NO cuentan
     como apertura humana en este resumen.
     -------------------------------------------------------- */

  update public.protocol_logistics_status_email_events

  set

    brevo_message_id_normalized =
      coalesce(
        nullif(brevo_message_id_normalized, ''),
        v_message_id
      ),


    /* ----- Delivered ----- */

    delivered_at =
      case

        when v_event_type = 'delivered'
          and (
            delivered_at is null
            or input_occurred_at < delivered_at
          )
        then input_occurred_at

        else delivered_at

      end,


    /* ----- Primera apertura ----- */

    first_opened_at =
      case

        when v_event_type in (
          'unique_opened',
          'opened'
        )
        and (
          first_opened_at is null
          or input_occurred_at < first_opened_at
        )
        then input_occurred_at

        else first_opened_at

      end,


    /* ----- Última apertura ----- */

    last_opened_at =
      case

        when v_event_type in (
          'unique_opened',
          'opened'
        )
        and (
          last_opened_at is null
          or input_occurred_at >= last_opened_at
        )
        then input_occurred_at

        else last_opened_at

      end,


    /* ----- Cantidad de aperturas ordinarias ----- */

    open_count =
      case

        when v_event_type = 'opened'
        then open_count + 1

        else open_count

      end,


    /* ----- Primer clic ----- */

    first_clicked_at =
      case

        when v_event_type = 'click'
          and (
            first_clicked_at is null
            or input_occurred_at < first_clicked_at
          )
        then input_occurred_at

        else first_clicked_at

      end,


    /* ----- Último clic ----- */

    last_clicked_at =
      case

        when v_event_type = 'click'
          and (
            last_clicked_at is null
            or input_occurred_at >= last_clicked_at
          )
        then input_occurred_at

        else last_clicked_at

      end,


    /* ----- Cantidad de clics ----- */

    click_count =
      case

        when v_event_type = 'click'
        then click_count + 1

        else click_count

      end,


    /* ----- Última URL clickeada ----- */

    last_clicked_url =
      case

        when v_event_type = 'click'
          and (
            last_clicked_at is null
            or input_occurred_at >= last_clicked_at
          )
        then nullif(
          btrim(input_clicked_url),
          ''
        )

        else last_clicked_url

      end,


    /* ----- Último resultado de entrega ----- */

    delivery_event =
      case

        when v_event_type in (
          'delivered',
          'deferred',
          'soft_bounce',
          'hard_bounce',
          'blocked',
          'invalid',
          'error'
        )
        and (
          delivery_event_at is null
          or input_occurred_at >= delivery_event_at
        )
        then v_event_type

        else delivery_event

      end,


    delivery_event_at =
      case

        when v_event_type in (
          'delivered',
          'deferred',
          'soft_bounce',
          'hard_bounce',
          'blocked',
          'invalid',
          'error'
        )
        and (
          delivery_event_at is null
          or input_occurred_at >= delivery_event_at
        )
        then input_occurred_at

        else delivery_event_at

      end,


    /* ----- Último evento general del proveedor ----- */

    last_provider_event =
      case

        when last_provider_event_at is null
          or input_occurred_at >= last_provider_event_at
        then v_event_type

        else last_provider_event

      end,


    last_provider_event_at =
      case

        when last_provider_event_at is null
          or input_occurred_at >= last_provider_event_at
        then input_occurred_at

        else last_provider_event_at

      end

  where id = v_status_email_event_id;


  /* --------------------------------------------------------
     Resultado.
     -------------------------------------------------------- */

  return jsonb_build_object(

    'status',
    'recorded',

    'activity_id',
    v_activity_id,

    'status_email_event_id',
    v_status_email_event_id,

    'event_type',
    v_event_type,

    'brevo_message_id_normalized',
    v_message_id,

    'dedupe_key',
    v_dedupe_key
  );

end;

$function$;


/* ----------------------------------------------------------
   3. Seguridad.

   Nadie desde el navegador puede ejecutar este RPC.
   ---------------------------------------------------------- */

revoke all
on function
  public.protocol_logistics_status_email_activity_record(
    text,
    text,
    timestamptz,
    text,
    text,
    text,
    text,
    jsonb,
    bigint,
    text,
    jsonb
  )
from public;


revoke all
on function
  public.protocol_logistics_status_email_activity_record(
    text,
    text,
    timestamptz,
    text,
    text,
    text,
    text,
    jsonb,
    bigint,
    text,
    jsonb
  )
from anon;


revoke all
on function
  public.protocol_logistics_status_email_activity_record(
    text,
    text,
    timestamptz,
    text,
    text,
    text,
    text,
    jsonb,
    bigint,
    text,
    jsonb
  )
from authenticated;


grant execute
on function
  public.protocol_logistics_status_email_activity_record(
    text,
    text,
    timestamptz,
    text,
    text,
    text,
    text,
    jsonb,
    bigint,
    text,
    jsonb
  )
to service_role;
