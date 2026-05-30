-- =========================================================
-- Protocol Data · Shipping Engine
-- Seed 001 · Zonas, reglas, excepciones y badges demo
-- Target: Supabase Postgres
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Zonas operativas iniciales
-- ---------------------------------------------------------
insert into public.shipping_zones (zone_id, zone_name, description, is_active)
values
  ('caba', 'CABA', 'Ciudad Autónoma de Buenos Aires. Promesa rápida y potencial envío gratis.', true),
  ('gba', 'GBA', 'Gran Buenos Aires. Puede operar con reglas propias más adelante.', true),
  ('pba', 'Provincia de Buenos Aires', 'Buenos Aires fuera de CABA/GBA o regla provincial general.', true),
  ('interior_centro', 'Interior centro', 'Zona operativa para provincias centrales.', true),
  ('interior_norte', 'Interior norte', 'Zona operativa para provincias del norte.', true),
  ('interior_sur', 'Interior sur', 'Zona operativa para provincias del sur.', true),
  ('default_argentina', 'Argentina default', 'Regla nacional por defecto cuando no hay match específico.', true),
  ('no_disponible', 'No disponible', 'Zona bloqueada o pendiente de confirmación.', true)
on conflict (zone_id) do update set
  zone_name = excluded.zone_name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------
-- Reglas demo iniciales
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
    'reg_caba_001',
    'CABA · Envío gratis · Llega mañana',
    'province',
    'Capital Federal',
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
    60,
    true
  ),
  (
    'reg_pba_001',
    'Buenos Aires · Envío pagado · 2 a 4 días',
    'province',
    'Buenos Aires',
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
    60,
    true
  ),
  (
    'reg_default_arg_001',
    'Argentina · Regla nacional por defecto',
    'default',
    null,
    'default_argentina',
    true,
    'paid',
    8900,
    '$8.900',
    'Llega en 3 a 7 días',
    3,
    7,
    'A confirmar por logística',
    'ban_navid_003',
    10,
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
-- Excepciones demo
-- ---------------------------------------------------------
insert into public.shipping_exceptions (
  exception_id,
  exception_name,
  scope_type,
  scope_value,
  exception_type,
  shipping_available,
  shipping_mode,
  shipping_price,
  shipping_label,
  promise_label,
  public_message,
  min_delivery_days,
  max_delivery_days,
  time_band,
  banner_id,
  priority,
  is_active
)
values
  (
    'exc_cp_1189_free_001',
    'CP 1189 · Envío gratis especial',
    'postal_code',
    '1189',
    'free_shipping',
    true,
    'free',
    0,
    'Gratis',
    'Llega mañana',
    'Tu zona cuenta con envío bonificado para esta campaña.',
    1,
    1,
    '14:00 a 18:00',
    'ban_navid_001',
    120,
    true
  ),
  (
    'exc_cp_9999_blocked_001',
    'CP 9999 · Zona pendiente de confirmación',
    'postal_code',
    '9999',
    'quote_required',
    false,
    'quote_required',
    0,
    'A confirmar',
    'Zona pendiente de confirmación',
    'No pudimos confirmar la cobertura automática para este código postal. Soporte puede ayudarte a validar la entrega.',
    null,
    null,
    'A confirmar',
    'ban_issue_001',
    130,
    true
  )
on conflict (exception_id) do update set
  exception_name = excluded.exception_name,
  scope_type = excluded.scope_type,
  scope_value = excluded.scope_value,
  exception_type = excluded.exception_type,
  shipping_available = excluded.shipping_available,
  shipping_mode = excluded.shipping_mode,
  shipping_price = excluded.shipping_price,
  shipping_label = excluded.shipping_label,
  promise_label = excluded.promise_label,
  public_message = excluded.public_message,
  min_delivery_days = excluded.min_delivery_days,
  max_delivery_days = excluded.max_delivery_days,
  time_band = excluded.time_band,
  banner_id = excluded.banner_id,
  priority = excluded.priority,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------
-- Badges asociados a reglas y excepciones
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
    'badge_reg_caba_free_shipping',
    'reg_caba_001',
    null,
    'success',
    'Envío gratis',
    'show_shipping_badge',
    '{"placement":"product_top","color":"green"}'::jsonb,
    10,
    true
  ),
  (
    'badge_reg_caba_arrives_tomorrow',
    'reg_caba_001',
    null,
    'info',
    'Llega mañana',
    'show_delivery_promise',
    '{"placement":"shipping_promise"}'::jsonb,
    20,
    true
  ),
  (
    'badge_reg_pba_tracking',
    'reg_pba_001',
    null,
    'info',
    'Entrega con seguimiento',
    'show_tracking_badge',
    '{"placement":"product_top"}'::jsonb,
    10,
    true
  ),
  (
    'badge_exc_1189_free_shipping',
    null,
    'exc_cp_1189_free_001',
    'success',
    'Envío gratis aplicado',
    'highlight_checkout_button',
    '{"placement":"cta","effect":"soft_pulse"}'::jsonb,
    10,
    true
  ),
  (
    'badge_exc_9999_quote_required',
    null,
    'exc_cp_9999_blocked_001',
    'warning',
    'Zona a confirmar',
    'show_support_hint',
    '{"placement":"delivery_modal","support":true}'::jsonb,
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
-- Datos mínimos demo de CP para probar la función antes de importar CSV completo.
-- El CSV real debe importarse luego a shipping_postal_codes.
-- ---------------------------------------------------------
insert into public.shipping_postal_codes (
  postal_code,
  province,
  locality,
  zone_id,
  is_active,
  source
)
values
  ('1189', 'Capital Federal', 'Recoleta', 'caba', true, 'seed_demo'),
  ('1414', 'Capital Federal', 'Palermo', 'caba', true, 'seed_demo'),
  ('5000', 'Cordoba', 'Cordoba', 'interior_centro', true, 'seed_demo'),
  ('2000', 'Santa Fe', 'Rosario', 'interior_centro', true, 'seed_demo'),
  ('9999', 'Buenos Aires', 'Sin validar', 'pba', true, 'seed_demo')
on conflict (postal_code, province_normalized, locality_normalized) do update set
  zone_id = excluded.zone_id,
  is_active = excluded.is_active,
  source = excluded.source,
  updated_at = now();

commit;
