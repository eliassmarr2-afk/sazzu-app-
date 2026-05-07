-- ============================================================
-- Publicidad Interna · Schema base real
-- Reconstruido desde metadata real de Supabase.
-- Proyecto: Sazzú Control Tower / Protocol Data
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensión necesaria para UUID
-- ------------------------------------------------------------

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 2. Función reusable para fecha_actualizacion
-- ------------------------------------------------------------

create or replace function public.set_fecha_actualizacion()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion = now();
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 3. Tabla: conjuntos_audiencia
-- ------------------------------------------------------------

create table if not exists public.conjuntos_audiencia (
  id uuid primary key default gen_random_uuid(),

  nombre text not null,
  descripcion text,

  modulo_origen text not null default 'publicidad_utm'::text,
  clasificacion text not null default 'publicidad_interna'::text,
  estado text not null default 'activo'::text,

  cantidad_miembros integer not null default 0,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_conjuntos_audiencia_estado
on public.conjuntos_audiencia (estado);

create index if not exists idx_conjuntos_audiencia_clasificacion
on public.conjuntos_audiencia (clasificacion);

create index if not exists idx_conjuntos_audiencia_modulo_origen
on public.conjuntos_audiencia (modulo_origen);

drop trigger if exists trg_conjuntos_audiencia_fecha_actualizacion
on public.conjuntos_audiencia;

create trigger trg_conjuntos_audiencia_fecha_actualizacion
before update on public.conjuntos_audiencia
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 4. Tabla: campanias_internas
-- ------------------------------------------------------------

create table if not exists public.campanias_internas (
  id uuid primary key default gen_random_uuid(),

  nombre text not null,
  descripcion text,

  objetivo text not null default 'publicidad_interna'::text,
  canal text not null default 'email'::text,
  proveedor_envio text not null default 'brevo'::text,

  estado text not null default 'borrador'::text,

  fecha_inicio_programada timestamptz,
  fecha_fin_programada timestamptz,

  zona_horaria text not null default 'America/Argentina/Buenos_Aires'::text,

  reglas_inicio jsonb not null default '{}'::jsonb,
  reglas_finalizacion jsonb not null default '{}'::jsonb,
  configuracion_envio jsonb not null default '{}'::jsonb,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_campanias_internas_estado
on public.campanias_internas (estado);

create index if not exists idx_campanias_internas_canal
on public.campanias_internas (canal);

create index if not exists idx_campanias_internas_proveedor_envio
on public.campanias_internas (proveedor_envio);

create index if not exists idx_campanias_internas_fecha_inicio
on public.campanias_internas (fecha_inicio_programada);

drop trigger if exists trg_campanias_internas_fecha_actualizacion
on public.campanias_internas;

create trigger trg_campanias_internas_fecha_actualizacion
before update on public.campanias_internas
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 5. Tabla: campania_conjuntos_audiencia
-- ------------------------------------------------------------

create table if not exists public.campania_conjuntos_audiencia (
  id uuid primary key default gen_random_uuid(),

  campania_id uuid not null references public.campanias_internas(id) on delete cascade,
  conjunto_audiencia_id uuid not null references public.conjuntos_audiencia(id) on delete cascade,

  rol_conjunto text not null default 'principal'::text,
  estado text not null default 'activo'::text,
  prioridad integer not null default 1,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint uq_campania_conjunto_audiencia
    unique (campania_id, conjunto_audiencia_id)
);

create index if not exists idx_campania_conjuntos_campania
on public.campania_conjuntos_audiencia (campania_id);

create index if not exists idx_campania_conjuntos_conjunto
on public.campania_conjuntos_audiencia (conjunto_audiencia_id);

create index if not exists idx_campania_conjuntos_estado
on public.campania_conjuntos_audiencia (estado);

drop trigger if exists trg_campania_conjuntos_fecha_actualizacion
on public.campania_conjuntos_audiencia;

create trigger trg_campania_conjuntos_fecha_actualizacion
before update on public.campania_conjuntos_audiencia
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 6. Tabla: campania_pasos_secuencia
-- ------------------------------------------------------------

create table if not exists public.campania_pasos_secuencia (
  id uuid primary key default gen_random_uuid(),

  campania_id uuid not null references public.campanias_internas(id) on delete cascade,

  orden integer not null,
  nombre_paso text not null,
  descripcion text,

  tipo_accion text not null default 'enviar_email'::text,
  estado text not null default 'borrador'::text,

  delay_cantidad integer not null default 0,
  delay_unidad text not null default 'dias'::text,

  proveedor_envio text not null default 'brevo'::text,

  brevo_template_id text,
  brevo_lista_id text,
  brevo_automatizacion_id text,

  asunto_email text,
  preheader_email text,
  contenido_html text,
  contenido_texto text,

  condicion_ejecucion jsonb not null default '{}'::jsonb,
  condicion_salida jsonb not null default '{}'::jsonb,

  configuracion_brevo jsonb not null default '{}'::jsonb,
  configuracion_make jsonb not null default '{}'::jsonb,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint uq_campania_paso_orden
    unique (campania_id, orden)
);

create index if not exists idx_campania_pasos_campania
on public.campania_pasos_secuencia (campania_id);

create index if not exists idx_campania_pasos_estado
on public.campania_pasos_secuencia (estado);

create index if not exists idx_campania_pasos_tipo_accion
on public.campania_pasos_secuencia (tipo_accion);

drop trigger if exists trg_campania_pasos_fecha_actualizacion
on public.campania_pasos_secuencia;

create trigger trg_campania_pasos_fecha_actualizacion
before update on public.campania_pasos_secuencia
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 7. Tabla: miembros_conjunto_audiencia
-- ------------------------------------------------------------

create table if not exists public.miembros_conjunto_audiencia (
  id uuid primary key default gen_random_uuid(),

  conjunto_audiencia_id uuid not null references public.conjuntos_audiencia(id) on delete cascade,

  email text not null,
  nombre text,
  apellido text,
  telefono text,

  cliente_id_externo text,
  pedido_id_origen text,

  estado text not null default 'activo'::text,
  fuente_origen text not null default 'publicidad_utm'::text,

  fecha_primera_deteccion timestamptz not null default now(),
  fecha_ultima_actualizacion timestamptz not null default now(),

  score_interes numeric,
  score_recompra numeric,

  parametros_utm jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),

  constraint uq_miembro_conjunto_email
    unique (conjunto_audiencia_id, email)
);

create index if not exists idx_miembros_conjunto
on public.miembros_conjunto_audiencia (conjunto_audiencia_id);

create index if not exists idx_miembros_email
on public.miembros_conjunto_audiencia (email);

create index if not exists idx_miembros_estado
on public.miembros_conjunto_audiencia (estado);

create index if not exists idx_miembros_fuente_origen
on public.miembros_conjunto_audiencia (fuente_origen);

drop trigger if exists trg_miembros_fecha_actualizacion
on public.miembros_conjunto_audiencia;

create trigger trg_miembros_fecha_actualizacion
before update on public.miembros_conjunto_audiencia
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 8. Tabla: brevo_trabajos_sincronizacion
-- ------------------------------------------------------------

create table if not exists public.brevo_trabajos_sincronizacion (
  id uuid primary key default gen_random_uuid(),

  campania_id uuid not null references public.campanias_internas(id) on delete cascade,

  tipo_trabajo text not null default 'sincronizar_campania'::text,

  proveedor_orquestacion text not null default 'make'::text,
  proveedor_envio text not null default 'brevo'::text,

  estado text not null default 'pendiente'::text,

  intento_actual integer not null default 0,
  max_intentos integer not null default 3,

  fecha_programada timestamptz,
  fecha_inicio_ejecucion timestamptz,
  fecha_fin_ejecucion timestamptz,
  fecha_ultimo_intento timestamptz,

  make_escenario_id text,
  make_execution_id text,

  brevo_lista_id text,
  brevo_campania_id text,
  brevo_automatizacion_id text,

  cantidad_contactos_estimados integer not null default 0,
  cantidad_contactos_sincronizados integer not null default 0,
  cantidad_contactos_error integer not null default 0,

  payload_solicitud jsonb not null default '{}'::jsonb,
  payload_respuesta jsonb not null default '{}'::jsonb,
  errores jsonb not null default '[]'::jsonb,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_brevo_trabajos_campania
on public.brevo_trabajos_sincronizacion (campania_id);

create index if not exists idx_brevo_trabajos_estado
on public.brevo_trabajos_sincronizacion (estado);

create index if not exists idx_brevo_trabajos_tipo
on public.brevo_trabajos_sincronizacion (tipo_trabajo);

create index if not exists idx_brevo_trabajos_fecha_programada
on public.brevo_trabajos_sincronizacion (fecha_programada);

drop trigger if exists trg_brevo_trabajos_fecha_actualizacion
on public.brevo_trabajos_sincronizacion;

create trigger trg_brevo_trabajos_fecha_actualizacion
before update on public.brevo_trabajos_sincronizacion
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 9. Tabla: brevo_eventos_email
-- ------------------------------------------------------------

create table if not exists public.brevo_eventos_email (
  id uuid primary key default gen_random_uuid(),

  campania_id uuid not null references public.campanias_internas(id) on delete cascade,
  paso_id uuid references public.campania_pasos_secuencia(id) on delete set null,
  miembro_id uuid references public.miembros_conjunto_audiencia(id) on delete set null,
  trabajo_sincronizacion_id uuid references public.brevo_trabajos_sincronizacion(id) on delete set null,

  proveedor_envio text not null default 'brevo'::text,
  canal text not null default 'email'::text,

  tipo_evento text not null,
  estado_evento text not null default 'registrado'::text,

  email text not null,

  brevo_evento_id text,
  brevo_message_id text,
  brevo_contact_id text,
  brevo_campaign_id text,
  brevo_template_id text,

  asunto_email text,
  url_click text,

  fecha_evento timestamptz not null default now(),
  fecha_procesado timestamptz,

  ip text,
  user_agent text,

  payload_evento jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

create index if not exists idx_brevo_eventos_campania
on public.brevo_eventos_email (campania_id);

create index if not exists idx_brevo_eventos_paso
on public.brevo_eventos_email (paso_id);

create index if not exists idx_brevo_eventos_miembro
on public.brevo_eventos_email (miembro_id);

create index if not exists idx_brevo_eventos_trabajo
on public.brevo_eventos_email (trabajo_sincronizacion_id);

create index if not exists idx_brevo_eventos_email
on public.brevo_eventos_email (email);

create index if not exists idx_brevo_eventos_tipo
on public.brevo_eventos_email (tipo_evento);

create index if not exists idx_brevo_eventos_fecha
on public.brevo_eventos_email (fecha_evento);

drop trigger if exists trg_brevo_eventos_fecha_actualizacion
on public.brevo_eventos_email;

create trigger trg_brevo_eventos_fecha_actualizacion
before update on public.brevo_eventos_email
for each row
execute function public.set_fecha_actualizacion();


-- ------------------------------------------------------------
-- 10. Comentarios de documentación
-- ------------------------------------------------------------

comment on table public.conjuntos_audiencia is
'Conjuntos de audiencia disponibles para campañas internas.';

comment on table public.campanias_internas is
'Campañas internas creadas desde la Tower.';

comment on table public.campania_conjuntos_audiencia is
'Vinculación entre campañas internas y conjuntos de audiencia.';

comment on table public.campania_pasos_secuencia is
'Pasos o emails que componen una secuencia de campaña interna.';

comment on table public.miembros_conjunto_audiencia is
'Contactos pertenecientes a conjuntos de audiencia.';

comment on table public.brevo_trabajos_sincronizacion is
'Trabajos técnicos para sincronizar campañas, contactos y secuencias con Make/Brevo.';

comment on table public.brevo_eventos_email is
'Eventos de email recibidos desde Brevo.';


-- ============================================================
-- FIN - Publicidad Interna · Schema base real
-- ============================================================