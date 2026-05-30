-- =========================================================
-- Protocol Data · Shipping Engine
-- Migration 005 · RPC autenticada para reglas logísticas
-- Target: Supabase Postgres
-- =========================================================

begin;

create or replace function public.protocol_logistics_upsert_shipping_rule(
  input_rule jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_id text;
  v_scope_type text;
  v_scope_value text;
  v_shipping_mode text;
  v_shipping_price numeric;
  v_shipping_label text;
  v_payload jsonb;
  v_record public.shipping_rules;
  v_result jsonb;
begin
  if auth.role() <> 'authenticated' then
    return jsonb_build_object(
      'status', 'error',
      'code', 'not_authenticated',
      'message', 'Para guardar reglas hace falta una sesión autenticada.'
    );
  end if;

  if input_rule is null then
    return jsonb_build_object('status', 'error', 'message', 'No se recibió información de la regla.');
  end if;

  v_scope_type := coalesce(nullif(trim(input_rule->>'scope_type'), ''), 'zone');
  v_scope_value := nullif(trim(input_rule->>'scope_value'), '');
  v_shipping_mode := coalesce(nullif(trim(input_rule->>'shipping_mode'), ''), 'paid');

  if v_scope_type not in ('postal_code', 'locality', 'province', 'zone', 'default') then
    return jsonb_build_object('status', 'error', 'message', 'Tipo de regla inválido: ' || v_scope_type);
  end if;

  if v_shipping_mode not in ('free', 'paid', 'quote_required', 'unavailable') then
    return jsonb_build_object('status', 'error', 'message', 'Modo de envío inválido: ' || v_shipping_mode);
  end if;

  if v_scope_type <> 'default' and v_scope_value is null then
    return jsonb_build_object('status', 'error', 'message', 'El valor de la regla es obligatorio para este tipo de alcance.');
  end if;

  v_rule_id := nullif(trim(input_rule->>'rule_id'), '');
  if v_rule_id is null then
    v_rule_id := 'reg_panel_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  end if;

  v_shipping_price := coalesce(nullif(trim(input_rule->>'shipping_price'), '')::numeric, 0);
  if v_shipping_mode = 'free' then
    v_shipping_price := 0;
  end if;

  v_shipping_label := nullif(trim(input_rule->>'shipping_label'), '');
  if v_shipping_label is null then
    v_shipping_label := case
      when v_shipping_mode = 'free' then 'Gratis'
      when v_shipping_mode = 'quote_required' then 'A confirmar'
      when v_shipping_mode = 'unavailable' then 'No disponible'
      else '$' || trim(to_char(v_shipping_price, 'FM999999999999'))
    end;
  end if;

  v_payload := jsonb_build_object(
    'rule_id', v_rule_id,
    'rule_name', coalesce(nullif(trim(input_rule->>'rule_name'), ''), 'Panel · ' || v_scope_type || ' · ' || coalesce(v_scope_value, 'default')),
    'scope_type', v_scope_type,
    'scope_value', coalesce(v_scope_value, 'default'),
    'zone_id', coalesce(nullif(trim(input_rule->>'zone_id'), ''), case when v_scope_type = 'zone' then v_scope_value else null end),
    'shipping_available', case when v_shipping_mode = 'unavailable' then false else coalesce(nullif(trim(input_rule->>'shipping_available'), '')::boolean, true) end,
    'shipping_mode', v_shipping_mode,
    'shipping_price', v_shipping_price,
    'shipping_label', v_shipping_label,
    'promise_label', coalesce(nullif(trim(input_rule->>'promise_label'), ''), 'Llega en 3 a 7 días'),
    'min_delivery_days', nullif(trim(input_rule->>'min_delivery_days'), '')::integer,
    'max_delivery_days', nullif(trim(input_rule->>'max_delivery_days'), '')::integer,
    'time_band', coalesce(nullif(trim(input_rule->>'time_band'), ''), 'A confirmar por logística'),
    'banner_id', coalesce(nullif(trim(input_rule->>'banner_id'), ''), 'ban_navid_003'),
    'priority', coalesce(nullif(trim(input_rule->>'priority'), '')::integer, case v_scope_type when 'postal_code' then 100 when 'locality' then 80 when 'province' then 60 when 'zone' then 40 else 10 end),
    'is_active', coalesce(nullif(trim(input_rule->>'is_active'), '')::boolean, true)
  );

  v_record := jsonb_populate_record(null::public.shipping_rules, v_payload);

  insert into public.shipping_rules (
    rule_id, rule_name, scope_type, scope_value, zone_id, shipping_available,
    shipping_mode, shipping_price, shipping_label, promise_label, min_delivery_days,
    max_delivery_days, time_band, banner_id, priority, is_active
  ) values (
    v_record.rule_id, v_record.rule_name, v_record.scope_type, v_record.scope_value, v_record.zone_id, v_record.shipping_available,
    v_record.shipping_mode, v_record.shipping_price, v_record.shipping_label, v_record.promise_label, v_record.min_delivery_days,
    v_record.max_delivery_days, v_record.time_band, v_record.banner_id, v_record.priority, v_record.is_active
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

  select to_jsonb(r) into v_result from public.shipping_rules r where r.rule_id = v_rule_id;

  return jsonb_build_object('status', 'ok', 'message', 'Regla guardada correctamente.', 'rule', v_result);
exception
  when others then
    return jsonb_build_object('status', 'error', 'message', sqlerrm);
end;
$$;

grant execute on function public.protocol_logistics_upsert_shipping_rule(jsonb) to authenticated;

commit;
