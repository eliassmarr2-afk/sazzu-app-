-- =========================================================
-- Protocol Data · Logística
-- Actividad operativa de consultas de entrega
-- =========================================================

begin;

create or replace function public.protocol_logistics_lookup_activity()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with params as (
    select
      timezone(
        'America/Argentina/Buenos_Aires',
        now()
      )::date as today_local
  ),

  classified as (
    select
      l.lookup_id,
      l.postal_code,
      l.resolved_status,
      l.resolved_province,
      l.resolved_locality,
      l.resolved_zone_id,
      l.applied_rule_id,
      l.applied_exception_id,
      l.source_page,
      l.customer_session_id,
      l.created_at,

      timezone(
        'America/Argentina/Buenos_Aires',
        l.created_at
      )::date as local_date,

      (
        coalesce(l.source_page, '') = 'protocol_logistica_panel'
        or coalesce(l.customer_session_id, '') = 'panel_preview'
      ) as is_panel

    from public.shipping_lookup_logs l
  ),

  days as (
    select
      generate_series(
        p.today_local - 6,
        p.today_local,
        interval '1 day'
      )::date as day
    from params p
  ),

  daily as (
    select
      d.day,

      (
        count(c.lookup_id)
        filter (where c.lookup_id is not null and not c.is_panel)
      )::integer as customer_lookups,

      (
        count(distinct nullif(c.customer_session_id, ''))
        filter (where c.lookup_id is not null and not c.is_panel)
      )::integer as unique_customer_sessions,

      (
        count(c.lookup_id)
        filter (where c.lookup_id is not null and c.is_panel)
      )::integer as panel_lookups

    from days d
    left join classified c
      on c.local_date = d.day

    group by d.day
  ),

  today_summary as (
    select
      d.customer_lookups,
      d.unique_customer_sessions,
      d.panel_lookups
    from daily d, params p
    where d.day = p.today_local
  ),

  recent_customer as (
    select
      postal_code,
      resolved_status,
      resolved_province,
      resolved_locality,
      resolved_zone_id,
      source_page,
      customer_session_id,
      created_at

    from classified

    where not is_panel

    order by created_at desc
    limit 3
  )

  select jsonb_build_object(
    'timezone',
      'America/Argentina/Buenos_Aires',

    'today',
      jsonb_build_object(
        'customer_lookups',
          coalesce(
            (select customer_lookups from today_summary),
            0
          ),

        'unique_customer_sessions',
          coalesce(
            (select unique_customer_sessions from today_summary),
            0
          ),

        'panel_lookups',
          coalesce(
            (select panel_lookups from today_summary),
            0
          )
      ),

    'daily',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'date', day,
              'customer_lookups', customer_lookups,
              'unique_customer_sessions', unique_customer_sessions,
              'panel_lookups', panel_lookups
            )
            order by day
          )
          from daily
        ),
        '[]'::jsonb
      ),

    'recent_customer_lookups',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'postal_code', postal_code,
              'status', resolved_status,
              'province', resolved_province,
              'locality', resolved_locality,
              'zone_id', resolved_zone_id,
              'source_page', source_page,
              'customer_session_id', customer_session_id,
              'created_at', created_at
            )
            order by created_at desc
          )
          from recent_customer
        ),
        '[]'::jsonb
      ),

    'customer_lookup_logs_total',
      (
        select count(*)
        from classified
        where not is_panel
      ),

    'panel_lookup_logs_total',
      (
        select count(*)
        from classified
        where is_panel
      ),

    'latest_customer_lookup_at',
      (
        select max(created_at)
        from classified
        where not is_panel
      )
  );
$$;

grant execute
on function public.protocol_logistics_lookup_activity()
to anon, authenticated;

commit;
