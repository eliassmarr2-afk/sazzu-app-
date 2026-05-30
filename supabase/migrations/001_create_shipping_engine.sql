-- =========================================================
-- Protocol Data · Shipping Engine
-- Migration 001 · Base logística para consultas de CP/envíos
-- Target: Supabase Postgres
-- =========================================================

begin;

-- UUIDs para claves internas.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Tipos controlados
-- ---------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'shipping_scope_type') then
    create type shipping_scope_type as enum (
      'default',
      'zone',
      'province',
      'locality',
      'postal_code'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipping_mode') then
    create type shipping_mode as enum (
      'free',
      'paid',
      'quote_required',
      'unavailable'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipping_exception_type') then
    create type shipping_exception_type as enum (
      'free_shipping',
      'surcharge',
      'unavailable',
      'quote_required',
      'operational_delay',
      'special_message'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipping_badge_type') then
    create type shipping_badge_type as enum (
      'success',
      'info',
      'warning',
      'danger',
      'neutral'
    );
  end if;
end $$;

-- ---------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------
create or replace function public.protocol_normalize_text(input_text text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(input_text, '')));
$$;

create or replace function public.protocol_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Zonas operativas
-- ---------------------------------------------------------
create table if not exists public.shipping_zones (
  zone_id text primary key,
  zone_name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_shipping_zones_updated_at
before update on public.shipping_zones
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Base maestra de códigos postales
-- Importa el CSV: Codigo P, Provincia, Localidad
-- ---------------------------------------------------------
create table if not exists public.shipping_postal_codes (
  id uuid primary key default gen_random_uuid(),
  postal_code text not null,
  province text not null,
  locality text not null,
  province_normalized text generated always as (public.protocol_normalize_text(province)) stored,
  locality_normalized text generated always as (public.protocol_normalize_text(locality)) stored,
  zone_id text references public.shipping_zones(zone_id) on update cascade on delete set null,
  is_active boolean not null default true,
  source text not null default 'csv_postal_codes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_postal_codes_postal_format check (postal_code ~ '^[0-9]{4}$')
);

create unique index if not exists ux_shipping_postal_codes_unique_location
on public.shipping_postal_codes (postal_code, province_normalized, locality_normalized);

create index if not exists ix_shipping_postal_codes_postal_code
on public.shipping_postal_codes (postal_code);

create index if not exists ix_shipping_postal_codes_province
on public.shipping_postal_codes (province_normalized);

create index if not exists ix_shipping_postal_codes_locality
on public.shipping_postal_codes (locality_normalized);

create index if not exists ix_shipping_postal_codes_zone
on public.shipping_postal_codes (zone_id);

create trigger trg_shipping_postal_codes_updated_at
before update on public.shipping_postal_codes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Reglas generales de envío
-- ---------------------------------------------------------
create table if not exists public.shipping_rules (
  rule_id text primary key,
  rule_name text not null,
  scope_type shipping_scope_type not null,
  scope_value text,
  scope_value_normalized text generated always as (public.protocol_normalize_text(scope_value)) stored,
  zone_id text references public.shipping_zones(zone_id) on update cascade on delete set null,
  shipping_available boolean not null default true,
  shipping_mode shipping_mode not null default 'paid',
  shipping_price numeric(12,2) not null default 0,
  shipping_label text,
  promise_label text not null,
  min_delivery_days integer,
  max_delivery_days integer,
  time_band text,
  banner_id text,
  priority integer not null default 10,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_rules_scope_value_required check (
    (scope_type = 'default' and scope_value is null)
    or
    (scope_type <> 'default' and scope_value is not null)
  ),
  constraint shipping_rules_price_non_negative check (shipping_price >= 0),
  constraint shipping_rules_days_valid check (
    min_delivery_days is null
    or max_delivery_days is null
    or min_delivery_days <= max_delivery_days
  )
);

create index if not exists ix_shipping_rules_scope
on public.shipping_rules (scope_type, scope_value_normalized, is_active, priority desc);

create index if not exists ix_shipping_rules_zone
on public.shipping_rules (zone_id, is_active, priority desc);

create trigger trg_shipping_rules_updated_at
before update on public.shipping_rules
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Excepciones. Tienen prioridad sobre reglas generales.
-- ---------------------------------------------------------
create table if not exists public.shipping_exceptions (
  exception_id text primary key,
  exception_name text not null,
  scope_type shipping_scope_type not null,
  scope_value text not null,
  scope_value_normalized text generated always as (public.protocol_normalize_text(scope_value)) stored,
  exception_type shipping_exception_type not null,
  shipping_available boolean not null default true,
  shipping_mode shipping_mode not null default 'paid',
  shipping_price numeric(12,2) not null default 0,
  shipping_label text,
  promise_label text not null,
  public_message text,
  min_delivery_days integer,
  max_delivery_days integer,
  time_band text,
  banner_id text,
  priority integer not null default 100,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_exceptions_scope_not_default check (scope_type <> 'default'),
  constraint shipping_exceptions_price_non_negative check (shipping_price >= 0),
  constraint shipping_exceptions_days_valid check (
    min_delivery_days is null
    or max_delivery_days is null
    or min_delivery_days <= max_delivery_days
  )
);

create index if not exists ix_shipping_exceptions_scope
on public.shipping_exceptions (scope_type, scope_value_normalized, is_active, priority desc);

create trigger trg_shipping_exceptions_updated_at
before update on public.shipping_exceptions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Badges / acciones visuales para landing product
-- Pueden depender de regla, excepción o ambos.
-- ---------------------------------------------------------
create table if not exists public.shipping_badges (
  badge_id text primary key,
  rule_id text references public.shipping_rules(rule_id) on update cascade on delete cascade,
  exception_id text references public.shipping_exceptions(exception_id) on update cascade on delete cascade,
  badge_type shipping_badge_type not null default 'info',
  badge_text text not null,
  action_type text,
  action_payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_badges_has_parent check (rule_id is not null or exception_id is not null)
);

create index if not exists ix_shipping_badges_rule
on public.shipping_badges (rule_id, is_active, sort_order);

create index if not exists ix_shipping_badges_exception
on public.shipping_badges (exception_id, is_active, sort_order);

create trigger trg_shipping_badges_updated_at
before update on public.shipping_badges
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Logs de consulta pública desde Shopify/landing/product/cart
-- ---------------------------------------------------------
create table if not exists public.shipping_lookup_logs (
  lookup_id uuid primary key default gen_random_uuid(),
  postal_code text not null,
  resolved_status text not null,
  resolved_province text,
  resolved_locality text,
  resolved_zone_id text,
  applied_rule_id text references public.shipping_rules(rule_id) on update cascade on delete set null,
  applied_exception_id text references public.shipping_exceptions(exception_id) on update cascade on delete set null,
  source_page text,
  customer_session_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_shipping_lookup_logs_postal_code
on public.shipping_lookup_logs (postal_code, created_at desc);

create index if not exists ix_shipping_lookup_logs_created_at
on public.shipping_lookup_logs (created_at desc);

-- ---------------------------------------------------------
-- Función principal de resolución
-- Devuelve un JSON listo para Shopify / Protocol Data.
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
  v_location record;
  v_exception record;
  v_rule record;
  v_badges jsonb := '[]'::jsonb;
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

  if v_location_count > 1 then
    v_status := 'ambiguous';
  end if;

  -- Excepciones: CP > localidad > provincia.
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

-- RLS: dejamos habilitado. Las políticas concretas se definen cuando integremos auth/API.
alter table public.shipping_zones enable row level security;
alter table public.shipping_postal_codes enable row level security;
alter table public.shipping_rules enable row level security;
alter table public.shipping_exceptions enable row level security;
alter table public.shipping_badges enable row level security;
alter table public.shipping_lookup_logs enable row level security;

commit;
