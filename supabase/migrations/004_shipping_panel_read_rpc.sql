-- =========================================================
-- Protocol Data · Shipping Engine
-- Migration 004 · RPC de lectura para panel Logística
-- Target: Supabase Postgres
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Resumen ejecutivo del motor de envíos
-- ---------------------------------------------------------
create or replace function public.protocol_logistics_shipping_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with zone_counts as (
    select
      coalesce(zone_id, 'sin_zona') as zone_id,
      count(*)::integer as total
    from public.shipping_postal_codes
    where is_active = true
    group by coalesce(zone_id, 'sin_zona')
  ),
  lookup_status as (
    select
      resolved_status,
      count(*)::integer as total
    from public.shipping_lookup_logs
    group by resolved_status
  ),
  recent_lookups as (
    select
      postal_code,
      resolved_status,
      resolved_province,
      resolved_locality,
      resolved_zone_id,
      applied_rule_id,
      applied_exception_id,
      source_page,
      created_at
    from public.shipping_lookup_logs
    order by created_at desc
    limit 8
  )
  select jsonb_build_object(
    'postal_codes_total', (select count(*) from public.shipping_postal_codes where is_active = true),
    'zones_total', (select count(*) from public.shipping_zones where is_active = true),
    'rules_total', (select count(*) from public.shipping_rules),
    'rules_active', (select count(*) from public.shipping_rules where is_active = true),
    'exceptions_total', (select count(*) from public.shipping_exceptions),
    'exceptions_active', (select count(*) from public.shipping_exceptions where is_active = true),
    'badges_active', (select count(*) from public.shipping_badges where is_active = true),
    'lookup_logs_total', (select count(*) from public.shipping_lookup_logs),
    'postal_codes_by_zone', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'zone_id', zone_id,
          'total', total
        ) order by total desc
      )
      from zone_counts
    ), '[]'::jsonb),
    'lookups_by_status', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'status', resolved_status,
          'total', total
        ) order by total desc
      )
      from lookup_status
    ), '[]'::jsonb),
    'recent_lookups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'postal_code', postal_code,
          'status', resolved_status,
          'province', resolved_province,
          'locality', resolved_locality,
          'zone_id', resolved_zone_id,
          'applied_rule_id', applied_rule_id,
          'applied_exception_id', applied_exception_id,
          'source_page', source_page,
          'created_at', created_at
        ) order by created_at desc
      )
      from recent_lookups
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------
-- Listado de reglas para panel
-- ---------------------------------------------------------
create or replace function public.protocol_logistics_shipping_rules(
  input_limit integer default 80,
  input_offset integer default 0
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with paginated as (
    select
      rule_id,
      rule_name,
      scope_type::text as scope_type,
      scope_value,
      zone_id,
      shipping_available,
      shipping_mode::text as shipping_mode,
      shipping_price,
      shipping_label,
      promise_label,
      min_delivery_days,
      max_delivery_days,
      time_band,
      banner_id,
      priority,
      is_active,
      updated_at
    from public.shipping_rules
    order by
      is_active desc,
      case scope_type
        when 'postal_code' then 100
        when 'locality' then 80
        when 'province' then 60
        when 'zone' then 40
        when 'default' then 10
        else 0
      end desc,
      priority desc,
      rule_id asc
    limit least(greatest(coalesce(input_limit, 80), 1), 200)
    offset greatest(coalesce(input_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from public.shipping_rules),
    'items', coalesce((
      select jsonb_agg(to_jsonb(paginated) order by priority desc, rule_id asc)
      from paginated
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------
-- Listado de excepciones para panel
-- ---------------------------------------------------------
create or replace function public.protocol_logistics_shipping_exceptions(
  input_limit integer default 80,
  input_offset integer default 0
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with paginated as (
    select
      exception_id,
      exception_name,
      scope_type::text as scope_type,
      scope_value,
      exception_type::text as exception_type,
      shipping_available,
      shipping_mode::text as shipping_mode,
      shipping_price,
      shipping_label,
      promise_label,
      public_message,
      min_delivery_days,
      max_delivery_days,
      time_band,
      banner_id,
      priority,
      is_active,
      updated_at
    from public.shipping_exceptions
    order by
      is_active desc,
      case scope_type
        when 'postal_code' then 100
        when 'locality' then 80
        when 'province' then 60
        when 'zone' then 40
        else 0
      end desc,
      priority desc,
      exception_id asc
    limit least(greatest(coalesce(input_limit, 80), 1), 200)
    offset greatest(coalesce(input_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from public.shipping_exceptions),
    'items', coalesce((
      select jsonb_agg(to_jsonb(paginated) order by priority desc, exception_id asc)
      from paginated
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------
-- Buscador de códigos postales para panel
-- ---------------------------------------------------------
create or replace function public.protocol_logistics_postal_search(
  input_query text default '',
  input_limit integer default 50,
  input_offset integer default 0
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with params as (
    select public.protocol_normalize_text(coalesce(input_query, '')) as q
  ),
  filtered as (
    select
      pc.postal_code,
      pc.locality,
      pc.province,
      pc.zone_id,
      pc.source,
      pc.is_active,
      pc.updated_at
    from public.shipping_postal_codes pc, params
    where pc.is_active = true
      and (
        params.q = ''
        or pc.postal_code ilike ('%' || params.q || '%')
        or pc.province_normalized like ('%' || params.q || '%')
        or pc.locality_normalized like ('%' || params.q || '%')
        or public.protocol_normalize_text(coalesce(pc.zone_id, '')) like ('%' || params.q || '%')
      )
    order by pc.postal_code asc, pc.province asc, pc.locality asc
  ),
  paginated as (
    select *
    from filtered
    limit least(greatest(coalesce(input_limit, 50), 1), 100)
    offset greatest(coalesce(input_offset, 0), 0)
  )
  select jsonb_build_object(
    'query', input_query,
    'total', (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(to_jsonb(paginated) order by postal_code asc, province asc, locality asc)
      from paginated
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------
-- Banners inferidos desde reglas/excepciones
-- No existe todavía tabla dedicada de banners; esto expone lo usado por el motor.
-- ---------------------------------------------------------
create or replace function public.protocol_logistics_shipping_banners()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with banner_usage as (
    select banner_id, 'rule' as source_type, count(*)::integer as total
    from public.shipping_rules
    where banner_id is not null and banner_id <> ''
    group by banner_id
    union all
    select banner_id, 'exception' as source_type, count(*)::integer as total
    from public.shipping_exceptions
    where banner_id is not null and banner_id <> ''
    group by banner_id
  ),
  grouped as (
    select
      banner_id,
      sum(total)::integer as total,
      jsonb_agg(jsonb_build_object('source_type', source_type, 'total', total) order by source_type) as sources
    from banner_usage
    group by banner_id
  )
  select jsonb_build_object(
    'total', (select count(*) from grouped),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'banner_id', banner_id,
          'total', total,
          'sources', sources
        ) order by banner_id asc
      )
      from grouped
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------
-- Permisos de ejecución para frontend con anon key.
-- Las funciones son SECURITY DEFINER y devuelven solo datos operativos permitidos.
-- ---------------------------------------------------------
grant execute on function public.resolve_shipping_lookup(text, text, text) to anon, authenticated;
grant execute on function public.protocol_logistics_shipping_summary() to anon, authenticated;
grant execute on function public.protocol_logistics_shipping_rules(integer, integer) to anon, authenticated;
grant execute on function public.protocol_logistics_shipping_exceptions(integer, integer) to anon, authenticated;
grant execute on function public.protocol_logistics_postal_search(text, integer, integer) to anon, authenticated;
grant execute on function public.protocol_logistics_shipping_banners() to anon, authenticated;

commit;
