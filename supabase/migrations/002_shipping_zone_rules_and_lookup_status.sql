-- =========================================================
-- Protocol Data · Shipping Engine
-- Migration 002 · Reglas por zona + estado ambiguo inteligente
-- Target: Supabase Postgres
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Reglas por zona operativa
-- Estas reglas evitan que todo Interior caiga en default.
-- Las reglas por provincia o CP siguen teniendo prioridad mayor.
-- ---------------------------------------------------------
insert into public.shipping_rules (
  rule_id,
  rule_name,
  scope_type,
  scope_value,
  zone_id,
  shipping_available,
  shipping_mode,
  shipping_price,
  shipping_label,
  promise_label,
  min_delivery_days,
  max_delivery_days,
  time_band,
  banner_id,
  priority,
  is_active
)
values
  (
    'reg_zone_caba_001',
    'Zona CABA · Envío gratis · Llega mañana',
    'zone',
    'caba',
    'caba',
    true,
    'free',
    0,
    'Gratis',
    'Llega mañana',
    1,
    1,
    '14:00 a 18:00',
    'ban_navid_001',
    40,
    true
  ),
  (
    'reg_zone_pba_001',
    'Zona PBA · Envío pagado · 2 a 4 días',
    'zone',
    'pba',
    'pba',
    true,
    'paid',
    7240,
    '$7.240',
    'Llega en 2 a 4 días',
    2,
    4,
    '14:00 a 20:00',
    'ban_navid_002',
    40,
    true
  ),
  (
    'reg_zone_interior_centro_001',
    'Interior centro · Envío pagado · 3 a 5 días',
    'zone',
    'interior_centro',
    'interior_centro',
    true,
    'paid',
    8900,
    '$8.900',
    'Llega en 3 a 5 días',
    3,
    5,
    'A confirmar por logística',
    'ban_navid_003',
    40,
    true
  ),
  (
    'reg_zone_interior_norte_001',
    'Interior norte · Envío pagado · 4 a 7 días',
    'zone',
    'interior_norte',
    'interior_norte',
    true,
    'paid',
    9900,
    '$9.900',
    'Llega en 4 a 7 días',
    4,
    7,
    'A confirmar por logística',
    'ban_navid_003',
    40,
    true
  ),
  (
    'reg_zone_interior_sur_001',
    'Interior sur · Envío pagado · 5 a 9 días',
    'zone',
    'interior_sur',
    'interior_sur',
    true,
    'paid',
    11900,
    '$11.900',
    'Llega en 5 a 9 días',
    5,
    9,
    'A confirmar por logística',
    'ban_navid_003',
    40,
    true
  )
on conflict (rule_id) do update set
  rule_name = excluded.rule_name,
  scope_type = excluded.scope_type,
  scope_value = excluded.scope_value,
  zone_id = excluded.zone_id,
  shipping_available = excluded.shipping_available,
  shipping_mode = excluded.shipping_mode,
  shipping_price = excluded.shipping_price,
  shipping_label = excluded.shipping_label,
  promise_label = excluded.promise_label,
  min_delivery_days = excluded.min_delivery_days,
  max_delivery_days = excluded.max_delivery_days,
  time_band = excluded.time_band,
  banner_id = excluded.banner_id,
  priority = excluded.priority,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------
-- Badges para reglas por zona
-- ---------------------------------------------------------
insert into public.shipping_badges (
  badge_id,
  rule_id,
  exception_id,
  badge_type,
  badge_text,
  action_type,
  action_payload,
  sort_order,
  is_active
)
values
  (
    'badge_zone_caba_free_shipping',
    'reg_zone_caba_001',
    null,
    'success',
    'Envío gratis',
    'show_shipping_badge',
    '{"placement":"product_top","color":"green"}'::jsonb,
    10,
    true
  ),
  (
    'badge_zone_pba_tracking',
    'reg_zone_pba_001',
    null,
    'info',
    'Entrega con seguimiento',
    'show_tracking_badge',
    '{"placement":"product_top"}'::jsonb,
    10,
    true
  ),
  (
    'badge_zone_centro_tracking',
    'reg_zone_interior_centro_001',
    null,
    'info',
    'Entrega con seguimiento',
    'show_tracking_badge',
    '{"placement":"product_top"}'::jsonb,
    10,
    true
  ),
  (
    'badge_zone_norte_tracking',
    'reg_zone_interior_norte_001',
    null,
    'info',
    'Entrega con seguimiento',
    'show_tracking_badge',
    '{"placement":"product_top"}'::jsonb,
    10,
    true
  ),
  (
    'badge_zone_sur_extended',
    'reg_zone_interior_sur_001',
    null,
    'warning',
    'Plazo extendido por zona',
    'show_delivery_notice',
    '{"placement":"delivery_modal","tone":"warning"}'::jsonb,
    10,
    true
  )
on conflict (badge_id) do update set
  rule_id = excluded.rule_id,
  exception_id = excluded.exception_id,
  badge_type = excluded.badge_type,
  badge_text = excluded.badge_text,
  action_type = excluded.action_type,
  action_payload = excluded.action_payload,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------
-- Función principal de resolución · versión 002
-- Cambio importante:
-- - Un CP con varias localidades NO se marca como ambiguous si todas resuelven a la misma provincia/zona.
-- - Solo se marca ambiguous cuando hay más de una provincia/zona operativamente relevante.
-- - Se agrega candidates_count y location_candidates cuando corresponde.
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
  v_resolution_count integer := 0;
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

  select count(*)
  into v_resolution_count
  from (
    select distinct
      province_normalized,
      coalesce(zone_id, 'sin_zona') as resolved_zone
    from public.shipping_postal_codes
    where postal_code = v_postal_code
      and is_active = true
  ) as resolved_locations;

  if v_resolution_count > 1 then
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
