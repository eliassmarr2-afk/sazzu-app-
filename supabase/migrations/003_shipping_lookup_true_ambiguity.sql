-- =========================================================
-- Protocol Data · Shipping Engine
-- Migration 003 · Ambigüedad real por resultado logístico
-- Target: Supabase Postgres
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Función principal de resolución · versión 003
-- Cambio principal:
-- - Un CP con múltiples localidades deja de ser "ambiguous" si todas resuelven
--   al mismo resultado logístico: misma regla/excepción, precio, promesa y disponibilidad.
-- - Solo se marca "ambiguous" cuando las posibles localidades del CP generan
--   resultados diferentes para el usuario.
-- ---------------------------------------------------------
create or replace function public.resolve_shipping_lookup(
  input_postal_code text,
  input_source_page text default null,
  input_customer_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_postal_code text := regexp_replace(coalesce(input_postal_code, ''), '[^0-9]', '', 'g');
  v_location_count integer := 0;
  v_outcome_count integer := 0;
  v_location record;
  v_exception record;
  v_rule record;
  v_badges jsonb := '[]'::jsonb;
  v_location_candidates jsonb := '[]'::jsonb;
  v_response jsonb;
  v_status text := 'ok';
begin
  if v_postal_code = '' then
    v_response := jsonb_build_object(
      'status', 'invalid',
      'postal_code', input_postal_code,
      'message', 'Ingresá un código postal válido.'
    );

    insert into public.shipping_lookup_logs (
      postal_code,
      resolved_status,
      source_page,
      customer_session_id,
      request_payload,
      response_payload
    ) values (
      coalesce(input_postal_code, ''),
      'invalid',
      input_source_page,
      input_customer_session_id,
      jsonb_build_object('postal_code', input_postal_code),
      v_response
    );

    return v_response;
  end if;

  select count(*)
  into v_location_count
  from public.shipping_postal_codes
  where postal_code = v_postal_code
    and is_active = true;

  if v_location_count = 0 then
    v_response := jsonb_build_object(
      'status', 'not_found',
      'postal_code', v_postal_code,
      'message', 'No encontramos ese código postal en la base logística.'
    );

    insert into public.shipping_lookup_logs (
      postal_code,
      resolved_status,
      source_page,
      customer_session_id,
      request_payload,
      response_payload
    ) values (
      v_postal_code,
      'not_found',
      input_source_page,
      input_customer_session_id,
      jsonb_build_object('postal_code', input_postal_code),
      v_response
    );

    return v_response;
  end if;

  -- Determinar si las posibles localidades del CP producen resultados logísticos distintos.
  -- Si todas terminan en la misma regla/excepción/precio/promesa, para el usuario es status ok.
  select count(*)
  into v_outcome_count
  from (
    select distinct
      coalesce(e.exception_id, '') as applied_exception_id,
      case when e.exception_id is not null then '' else coalesce(r.rule_id, '') end as applied_rule_id,
      coalesce(e.shipping_available, r.shipping_available, false) as shipping_available,
      coalesce(e.shipping_mode::text, r.shipping_mode::text, 'unavailable') as shipping_mode,
      coalesce(e.shipping_price, r.shipping_price, 0) as shipping_price,
      coalesce(e.shipping_label, r.shipping_label, '') as shipping_label,
      coalesce(e.promise_label, r.promise_label, 'Zona pendiente de confirmación') as promise_label,
      coalesce(e.min_delivery_days, r.min_delivery_days, -1) as min_delivery_days,
      coalesce(e.max_delivery_days, r.max_delivery_days, -1) as max_delivery_days,
      coalesce(e.time_band, r.time_band, '') as time_band,
      coalesce(e.banner_id, r.banner_id, '') as banner_id
    from public.shipping_postal_codes pc
    left join lateral (
      select e.*
      from public.shipping_exceptions e
      where e.is_active = true
        and (e.starts_at is null or e.starts_at <= now())
        and (e.ends_at is null or e.ends_at >= now())
        and (
          (e.scope_type = 'postal_code' and e.scope_value_normalized = public.protocol_normalize_text(v_postal_code))
          or
          (e.scope_type = 'locality' and e.scope_value_normalized = pc.locality_normalized)
          or
          (e.scope_type = 'province' and e.scope_value_normalized = pc.province_normalized)
          or
          (e.scope_type = 'zone' and e.scope_value_normalized = public.protocol_normalize_text(pc.zone_id))
        )
      order by
        case e.scope_type
          when 'postal_code' then 100
          when 'locality' then 80
          when 'province' then 60
          when 'zone' then 40
          else 0
        end desc,
        e.priority desc,
        e.created_at desc
      limit 1
    ) e on true
    left join lateral (
      select r.*
      from public.shipping_rules r
      where e.exception_id is null
        and r.is_active = true
        and (r.starts_at is null or r.starts_at <= now())
        and (r.ends_at is null or r.ends_at >= now())
        and (
          (r.scope_type = 'postal_code' and r.scope_value_normalized = public.protocol_normalize_text(v_postal_code))
          or
          (r.scope_type = 'locality' and r.scope_value_normalized = pc.locality_normalized)
          or
          (r.scope_type = 'province' and r.scope_value_normalized = pc.province_normalized)
          or
          (r.scope_type = 'zone' and r.scope_value_normalized = public.protocol_normalize_text(pc.zone_id))
          or
          (r.scope_type = 'default')
        )
      order by
        case r.scope_type
          when 'postal_code' then 100
          when 'locality' then 80
          when 'province' then 60
          when 'zone' then 40
          when 'default' then 10
          else 0
        end desc,
        r.priority desc,
        r.created_at desc
      limit 1
    ) r on true
    where pc.postal_code = v_postal_code
      and pc.is_active = true
  ) as resolved_outcomes;

  if v_outcome_count > 1 then
    v_status := 'ambiguous';

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'province', x.province,
        'locality', x.locality,
        'zone_id', x.zone_id
      ) order by x.province asc, x.locality asc
    ), '[]'::jsonb)
    into v_location_candidates
    from (
      select distinct province, locality, zone_id
      from public.shipping_postal_codes
      where postal_code = v_postal_code
        and is_active = true
      order by province asc, locality asc
      limit 20
    ) as x;
  end if;

  select *
  into v_location
  from public.shipping_postal_codes
  where postal_code = v_postal_code
    and is_active = true
  order by
    case when zone_id is not null then 0 else 1 end,
    province,
    locality
  limit 1;

  -- Excepciones: CP > localidad > provincia > zona.
  select *
  into v_exception
  from public.shipping_exceptions e
  where e.is_active = true
    and (e.starts_at is null or e.starts_at <= now())
    and (e.ends_at is null or e.ends_at >= now())
    and (
      (e.scope_type = 'postal_code' and e.scope_value_normalized = public.protocol_normalize_text(v_postal_code))
      or
      (e.scope_type = 'locality' and e.scope_value_normalized = v_location.locality_normalized)
      or
      (e.scope_type = 'province' and e.scope_value_normalized = v_location.province_normalized)
      or
      (e.scope_type = 'zone' and e.scope_value_normalized = public.protocol_normalize_text(v_location.zone_id))
    )
  order by
    case e.scope_type
      when 'postal_code' then 100
      when 'locality' then 80
      when 'province' then 60
      when 'zone' then 40
      else 0
    end desc,
    e.priority desc,
    e.created_at desc
  limit 1;

  if v_exception.exception_id is not null then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'badge_id', b.badge_id,
        'text', b.badge_text,
        'type', b.badge_type,
        'action_type', b.action_type,
        'action_payload', b.action_payload
      ) order by b.sort_order asc
    ), '[]'::jsonb)
    into v_badges
    from public.shipping_badges b
    where b.exception_id = v_exception.exception_id
      and b.is_active = true;

    v_response := jsonb_build_object(
      'status', v_status,
      'postal_code', v_postal_code,
      'candidates_count', v_location_count,
      'location_candidates', case when v_status = 'ambiguous' then v_location_candidates else '[]'::jsonb end,
      'province', v_location.province,
      'locality', v_location.locality,
      'zone_id', v_location.zone_id,
      'shipping_available', v_exception.shipping_available,
      'shipping_mode', v_exception.shipping_mode,
      'shipping_price', v_exception.shipping_price,
      'shipping_label', coalesce(v_exception.shipping_label, case when v_exception.shipping_mode = 'free' then 'Gratis' else ('$' || v_exception.shipping_price::text) end),
      'promise_label', v_exception.promise_label,
      'min_delivery_days', v_exception.min_delivery_days,
      'max_delivery_days', v_exception.max_delivery_days,
      'time_band', v_exception.time_band,
      'banner_id', v_exception.banner_id,
      'public_message', v_exception.public_message,
      'applied_rule_id', null,
      'applied_exception_id', v_exception.exception_id,
      'badges', v_badges
    );

    insert into public.shipping_lookup_logs (
      postal_code,
      resolved_status,
      resolved_province,
      resolved_locality,
      resolved_zone_id,
      applied_exception_id,
      source_page,
      customer_session_id,
      request_payload,
      response_payload
    ) values (
      v_postal_code,
      v_status,
      v_location.province,
      v_location.locality,
      v_location.zone_id,
      v_exception.exception_id,
      input_source_page,
      input_customer_session_id,
      jsonb_build_object('postal_code', input_postal_code),
      v_response
    );

    return v_response;
  end if;

  -- Reglas: CP > localidad > provincia > zona > default.
  select *
  into v_rule
  from public.shipping_rules r
  where r.is_active = true
    and (r.starts_at is null or r.starts_at <= now())
    and (r.ends_at is null or r.ends_at >= now())
    and (
      (r.scope_type = 'postal_code' and r.scope_value_normalized = public.protocol_normalize_text(v_postal_code))
      or
      (r.scope_type = 'locality' and r.scope_value_normalized = v_location.locality_normalized)
      or
      (r.scope_type = 'province' and r.scope_value_normalized = v_location.province_normalized)
      or
      (r.scope_type = 'zone' and r.scope_value_normalized = public.protocol_normalize_text(v_location.zone_id))
      or
      (r.scope_type = 'default')
    )
  order by
    case r.scope_type
      when 'postal_code' then 100
      when 'locality' then 80
      when 'province' then 60
      when 'zone' then 40
      when 'default' then 10
      else 0
    end desc,
    r.priority desc,
    r.created_at desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'badge_id', b.badge_id,
      'text', b.badge_text,
      'type', b.badge_type,
      'action_type', b.action_type,
      'action_payload', b.action_payload
    ) order by b.sort_order asc
  ), '[]'::jsonb)
  into v_badges
  from public.shipping_badges b
  where b.rule_id = v_rule.rule_id
    and b.is_active = true;

  v_response := jsonb_build_object(
    'status', v_status,
    'postal_code', v_postal_code,
    'candidates_count', v_location_count,
    'location_candidates', case when v_status = 'ambiguous' then v_location_candidates else '[]'::jsonb end,
    'province', v_location.province,
    'locality', v_location.locality,
    'zone_id', v_location.zone_id,
    'shipping_available', coalesce(v_rule.shipping_available, false),
    'shipping_mode', coalesce(v_rule.shipping_mode::text, 'unavailable'),
    'shipping_price', coalesce(v_rule.shipping_price, 0),
    'shipping_label', coalesce(v_rule.shipping_label, case when v_rule.shipping_mode = 'free' then 'Gratis' else ('$' || v_rule.shipping_price::text) end),
    'promise_label', coalesce(v_rule.promise_label, 'Zona pendiente de confirmación'),
    'min_delivery_days', v_rule.min_delivery_days,
    'max_delivery_days', v_rule.max_delivery_days,
    'time_band', v_rule.time_band,
    'banner_id', v_rule.banner_id,
    'public_message', null,
    'applied_rule_id', v_rule.rule_id,
    'applied_exception_id', null,
    'badges', v_badges
  );

  insert into public.shipping_lookup_logs (
    postal_code,
    resolved_status,
    resolved_province,
    resolved_locality,
    resolved_zone_id,
    applied_rule_id,
    source_page,
    customer_session_id,
    request_payload,
    response_payload
  ) values (
    v_postal_code,
    v_status,
    v_location.province,
    v_location.locality,
    v_location.zone_id,
    v_rule.rule_id,
    input_source_page,
    input_customer_session_id,
    jsonb_build_object('postal_code', input_postal_code),
    v_response
  );

  return v_response;
end;
$$;

commit;
