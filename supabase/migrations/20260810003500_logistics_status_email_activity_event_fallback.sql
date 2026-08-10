/* ==========================================================
   Protocol Data · Brevo webhook correlation fallback
   2026-08-10

   Objetivo:
   - Correlacionar normalmente por Brevo message-id.
   - Si aún no fue persistido, usar nuestro event.id
     enviado mediante X-Mailin-custom.
   - Evitar depender del mecanismo de retry de Brevo.
   ========================================================== */

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

  v_protocol_event_id uuid;

  v_custom_header text;

  v_correlation_method text;

  v_dedupe_key text;

begin

  /* --------------------------------------------------------
     Validaciones.
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
     Normalizar Brevo Message ID.
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
      'message',
      'brevo_message_id vacío después de normalizar'
    );
  end if;


  /* --------------------------------------------------------
     Normalizar evento.
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
     1ª correlación: message-id de Brevo.
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


  if v_match_count > 1 then

    return jsonb_build_object(
      'status', 'ambiguous',
      'matches', v_match_count,
      'brevo_message_id_normalized', v_message_id
    );

  end if;


  if v_match_count = 1 then

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


    v_correlation_method :=
      'message_id';

  end if;


  /* --------------------------------------------------------
     2ª correlación:
     X-Mailin-custom = protocol_event_id:<uuid>

     Esto cubre el caso donde Brevo dispara un webhook antes
     de que el worker alcance a persistir brevo_message_id.
     -------------------------------------------------------- */

  if v_status_email_event_id is null then

    v_custom_header :=
      coalesce(
        input_payload ->> 'X-Mailin-custom',
        input_payload ->> 'x-mailin-custom',
        ''
      );


    if
      v_custom_header ~*
      'protocol_event_id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    then

      begin

        v_protocol_event_id :=
          (
            substring(
              v_custom_header
              from
              '(?i)protocol_event_id:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'
            )
          )::uuid;

      exception
        when others then
          v_protocol_event_id := null;
      end;

    end if;


    if v_protocol_event_id is not null then

      select e.id
      into v_status_email_event_id

      from public.protocol_logistics_status_email_events e

      where e.id = v_protocol_event_id

      for update;


      if found then
        v_correlation_method :=
          'event_id_header';
      end if;

    end if;

  end if;


  if v_status_email_event_id is null then

    return jsonb_build_object(
      'status', 'not_found',
      'brevo_message_id_normalized', v_message_id
    );

  end if;


  /* --------------------------------------------------------
     Dedupe.
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
      v_correlation_method,
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


  if v_activity_id is null then

    return jsonb_build_object(
      'status', 'duplicate',
      'status_email_event_id', v_status_email_event_id,
      'dedupe_key', v_dedupe_key
    );

  end if;


  /* --------------------------------------------------------
     Resumen analítico.
     -------------------------------------------------------- */

  update public.protocol_logistics_status_email_events

  set

    brevo_message_id_normalized =
      coalesce(
        nullif(brevo_message_id_normalized, ''),
        v_message_id
      ),


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


    open_count =
      case
        when v_event_type = 'opened'
        then open_count + 1
        else open_count
      end,


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


    click_count =
      case
        when v_event_type = 'click'
        then click_count + 1
        else click_count
      end,


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


  return jsonb_build_object(

    'status',
    'recorded',

    'activity_id',
    v_activity_id,

    'status_email_event_id',
    v_status_email_event_id,

    'event_type',
    v_event_type,

    'correlation_method',
    v_correlation_method,

    'brevo_message_id_normalized',
    v_message_id,

    'dedupe_key',
    v_dedupe_key
  );

end;

$function$;


/* Seguridad: se mantiene exclusivamente service_role. */

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
