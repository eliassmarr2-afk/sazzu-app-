-- ============================================================
-- Publicidad Interna · Seed demo real
-- Datos ficticios compatibles con el schema real de Supabase.
-- Flujo:
-- Supabase → Publicidad Interna → Make → Brevo → Supabase → Tower
-- ============================================================


-- ------------------------------------------------------------
-- 1. Limpieza de demo previa
-- Permite volver a ejecutar el seed sin duplicar datos demo.
-- ------------------------------------------------------------

delete from public.brevo_eventos_email
where campania_id in (
  select id
  from public.campanias_internas
  where nombre = 'Recompra Pack Camping'
);

delete from public.brevo_trabajos_sincronizacion
where campania_id in (
  select id
  from public.campanias_internas
  where nombre = 'Recompra Pack Camping'
);

delete from public.campania_pasos_secuencia
where campania_id in (
  select id
  from public.campanias_internas
  where nombre = 'Recompra Pack Camping'
);

delete from public.campania_conjuntos_audiencia
where campania_id in (
  select id
  from public.campanias_internas
  where nombre = 'Recompra Pack Camping'
);

delete from public.campanias_internas
where nombre = 'Recompra Pack Camping';

delete from public.miembros_conjunto_audiencia
where conjunto_audiencia_id in (
  select id
  from public.conjuntos_audiencia
  where nombre in (
    'Camping verano compradores',
    'Descanso hogar interesado',
    'Clientes para compra general'
  )
);

delete from public.conjuntos_audiencia
where nombre in (
  'Camping verano compradores',
  'Descanso hogar interesado',
  'Clientes para compra general'
);


-- ------------------------------------------------------------
-- 2. Crear conjuntos de audiencia demo
-- ------------------------------------------------------------

insert into public.conjuntos_audiencia (
  nombre,
  descripcion,
  modulo_origen,
  clasificacion,
  estado,
  cantidad_miembros,
  metadata
)
values
(
  'Camping verano compradores',
  'Usuarios asociados a campañas UTM de camping, verano y packs.',
  'publicidad_utm',
  'recompra',
  'activo',
  280,
  jsonb_build_object(
    'demo', true,
    'utm_campaign', 'camping-pack-verano-testeo',
    'familia', 'camping',
    'objetivo', 'recompra',
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
),
(
  'Descanso hogar interesado',
  'Usuarios que interactuaron con campañas de descanso y hogar.',
  'publicidad_utm',
  'venta_cruzada',
  'activo',
  145,
  jsonb_build_object(
    'demo', true,
    'utm_campaign', 'descanso-hogar',
    'familia', 'descanso',
    'objetivo', 'venta_cruzada',
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
),
(
  'Clientes para compra general',
  'Clientes agrupados para campañas internas generales.',
  'publicidad_utm',
  'reactivacion',
  'activo',
  520,
  jsonb_build_object(
    'demo', true,
    'familia', 'general',
    'objetivo', 'reactivacion',
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
);


-- ------------------------------------------------------------
-- 3. Crear campaña interna demo
-- ------------------------------------------------------------

insert into public.campanias_internas (
  nombre,
  descripcion,
  objetivo,
  canal,
  proveedor_envio,
  estado,
  fecha_inicio_programada,
  zona_horaria,
  reglas_inicio,
  reglas_finalizacion,
  configuracion_envio,
  metadata
)
values (
  'Recompra Pack Camping',
  'Campaña demo para validar el flujo de Publicidad Interna con Supabase, Make y Brevo.',
  'recompra',
  'email',
  'brevo',
  'activa',
  now(),
  'America/Argentina/Buenos_Aires',
  jsonb_build_object(
    'evento_inicio', 'activacion_manual',
    'requiere_conjunto_activo', true
  ),
  jsonb_build_object(
    'si_compra', 'finalizar_flujo',
    'si_desuscripcion', 'finalizar_flujo',
    'al_completar_pasos', 'finalizar_flujo'
  ),
  jsonb_build_object(
    'tipo_flujo', 'secuencia_email',
    'cantidad_pasos', 3,
    'proveedor', 'brevo',
    'orquestador', 'make'
  ),
  jsonb_build_object(
    'demo', true,
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
);


-- ------------------------------------------------------------
-- 4. Vincular campaña con conjunto principal
-- ------------------------------------------------------------

insert into public.campania_conjuntos_audiencia (
  campania_id,
  conjunto_audiencia_id,
  rol_conjunto,
  estado,
  prioridad,
  metadata
)
select
  ci.id,
  ca.id,
  'principal',
  'activo',
  1,
  jsonb_build_object(
    'demo', true,
    'criterio', 'conjunto principal de recompra'
  )
from public.campanias_internas ci
join public.conjuntos_audiencia ca
  on ca.nombre = 'Camping verano compradores'
where ci.nombre = 'Recompra Pack Camping';


-- ------------------------------------------------------------
-- 5. Crear pasos de secuencia demo
-- ------------------------------------------------------------

insert into public.campania_pasos_secuencia (
  campania_id,
  orden,
  nombre_paso,
  descripcion,
  tipo_accion,
  estado,
  delay_cantidad,
  delay_unidad,
  proveedor_envio,
  brevo_template_id,
  brevo_lista_id,
  brevo_automatizacion_id,
  asunto_email,
  preheader_email,
  contenido_html,
  contenido_texto,
  condicion_ejecucion,
  condicion_salida,
  configuracion_brevo,
  configuracion_make,
  metadata
)
select
  ci.id,
  pasos.orden,
  pasos.nombre_paso,
  pasos.descripcion,
  'enviar_email',
  'activo',
  pasos.delay_cantidad,
  'dias',
  'brevo',
  pasos.brevo_template_id,
  'BREVO-LIST-TEST-001',
  'BREVO-AUTO-TEST-001',
  pasos.asunto_email,
  pasos.preheader_email,
  pasos.contenido_html,
  pasos.contenido_texto,
  pasos.condicion_ejecucion,
  pasos.condicion_salida,
  jsonb_build_object(
    'brevo_template_id', pasos.brevo_template_id,
    'brevo_lista_id', 'BREVO-LIST-TEST-001'
  ),
  jsonb_build_object(
    'make_step_key', pasos.make_step_key,
    'orquestador', 'make'
  ),
  jsonb_build_object(
    'demo', true,
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
from public.campanias_internas ci
cross join (
  values
  (
    1,
    'Email inicial',
    'Presenta la oferta principal de recompra.',
    0,
    'Volvé a preparar tu próxima salida',
    'Tu pack ideal sigue disponible',
    '<p>Email inicial demo para recompra de Pack Camping.</p>',
    'Email inicial demo para recompra de Pack Camping.',
    '{}'::jsonb,
    jsonb_build_object('si_compra', 'finalizar_flujo'),
    'BREVO-TEMPLATE-DEMO-001',
    'email_inicial'
  ),
  (
    2,
    'Recordatorio',
    'Recordatorio para contactos que no compraron.',
    2,
    'Tu pack sigue disponible',
    'Todavía podés aprovechar esta oportunidad',
    '<p>Segundo email demo para reforzar la oferta.</p>',
    'Segundo email demo para reforzar la oferta.',
    jsonb_build_object('si_no_compra', true),
    jsonb_build_object('si_compra', 'finalizar_flujo'),
    'BREVO-TEMPLATE-DEMO-002',
    'recordatorio'
  ),
  (
    3,
    'Último aviso',
    'Cierre del flujo de recompra.',
    5,
    'Último aviso para aprovechar tu pack',
    'Cerramos esta secuencia de recompra',
    '<p>Tercer email demo de cierre.</p>',
    'Tercer email demo de cierre.',
    jsonb_build_object('si_no_compra', true),
    jsonb_build_object('finalizar_flujo', true),
    'BREVO-TEMPLATE-DEMO-003',
    'ultimo_aviso'
  )
) as pasos(
  orden,
  nombre_paso,
  descripcion,
  delay_cantidad,
  asunto_email,
  preheader_email,
  contenido_html,
  contenido_texto,
  condicion_ejecucion,
  condicion_salida,
  brevo_template_id,
  make_step_key
)
where ci.nombre = 'Recompra Pack Camping';


-- ------------------------------------------------------------
-- 6. Crear miembros ficticios del conjunto principal
-- ------------------------------------------------------------

insert into public.miembros_conjunto_audiencia (
  conjunto_audiencia_id,
  email,
  nombre,
  apellido,
  telefono,
  cliente_id_externo,
  pedido_id_origen,
  estado,
  fuente_origen,
  fecha_primera_deteccion,
  fecha_ultima_actualizacion,
  score_interes,
  score_recompra,
  parametros_utm,
  metadata
)
select
  ca.id,
  miembros.email,
  miembros.nombre,
  miembros.apellido,
  miembros.telefono,
  miembros.cliente_id_externo,
  miembros.pedido_id_origen,
  'activo',
  'publicidad_utm',
  now() - interval '10 days',
  now(),
  miembros.score_interes,
  miembros.score_recompra,
  jsonb_build_object(
    'utm_source', 'meta',
    'utm_medium', 'paid_social',
    'utm_campaign', 'camping-pack-verano-testeo',
    'utm_content', miembros.utm_content
  ),
  jsonb_build_object(
    'demo', true,
    'interes', miembros.interes,
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
from public.conjuntos_audiencia ca
cross join (
  values
  ('diego.verano@test.com', 'Diego', 'Verano', '+5491100000001', 'CLI-DEMO-001', 'PED-DEMO-001', 'camping', 88, 76, 'video_pack_camping'),
  ('lucia.descanso@test.com', 'Lucía', 'Descanso', '+5491100000002', 'CLI-DEMO-002', 'PED-DEMO-002', 'descanso', 74, 62, 'carrusel_descanso'),
  ('sofia.pack@test.com', 'Sofía', 'Pack', '+5491100000003', 'CLI-DEMO-003', 'PED-DEMO-003', 'packs', 91, 84, 'imagen_pack_verano'),
  ('ana.camping@test.com', 'Ana', 'Camping', '+5491100000004', 'CLI-DEMO-004', 'PED-DEMO-004', 'camping', 82, 71, 'story_camping'),
  ('martin.outdoor@test.com', 'Martín', 'Outdoor', '+5491100000005', 'CLI-DEMO-005', 'PED-DEMO-005', 'outdoor', 69, 55, 'reel_outdoor')
) as miembros(
  email,
  nombre,
  apellido,
  telefono,
  cliente_id_externo,
  pedido_id_origen,
  interes,
  score_interes,
  score_recompra,
  utm_content
)
where ca.nombre = 'Camping verano compradores';


-- ------------------------------------------------------------
-- 7. Crear trabajo ficticio Make/Brevo como completado
-- ------------------------------------------------------------

insert into public.brevo_trabajos_sincronizacion (
  campania_id,
  tipo_trabajo,
  proveedor_orquestacion,
  proveedor_envio,
  estado,
  intento_actual,
  max_intentos,
  fecha_programada,
  fecha_inicio_ejecucion,
  fecha_fin_ejecucion,
  fecha_ultimo_intento,
  make_escenario_id,
  make_execution_id,
  brevo_lista_id,
  brevo_campania_id,
  brevo_automatizacion_id,
  cantidad_contactos_estimados,
  cantidad_contactos_sincronizados,
  cantidad_contactos_error,
  payload_solicitud,
  payload_respuesta,
  errores,
  metadata
)
select
  ci.id,
  'sincronizar_campania',
  'make',
  'brevo',
  'completado',
  1,
  3,
  now() - interval '15 minutes',
  now() - interval '10 minutes',
  now(),
  now(),
  'MAKE-SCENARIO-TEST-001',
  'MAKE-EXECUTION-TEST-20260506-001',
  'BREVO-LIST-TEST-001',
  'BREVO-CAMP-TEST-001',
  'BREVO-AUTO-TEST-001',
  5,
  5,
  0,
  jsonb_build_object(
    'campania', 'Recompra Pack Camping',
    'proveedor_envio', 'brevo',
    'orquestador', 'make'
  ),
  jsonb_build_object(
    'status', 'success',
    'contactos_sincronizados', 5,
    'contactos_error', 0,
    'mensaje', 'Trabajo ficticio procesado correctamente.'
  ),
  '[]'::jsonb,
  jsonb_build_object(
    'demo', true,
    'simulacion_make_brevo', true,
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
from public.campanias_internas ci
where ci.nombre = 'Recompra Pack Camping';


-- ------------------------------------------------------------
-- 8. Crear eventos ficticios devueltos por Brevo
-- ------------------------------------------------------------

with eventos_demo as (
  select *
  from (
    values
    ('diego.verano@test.com', 1, 'enviado',        'EVT-DEMO-001', 'MSG-DEMO-001', 'CONTACT-DEMO-001', 120, null),
    ('diego.verano@test.com', 1, 'entregado',      'EVT-DEMO-002', 'MSG-DEMO-001', 'CONTACT-DEMO-001', 118, null),
    ('lucia.descanso@test.com', 1, 'enviado',      'EVT-DEMO-003', 'MSG-DEMO-002', 'CONTACT-DEMO-002', 116, null),
    ('lucia.descanso@test.com', 1, 'entregado',    'EVT-DEMO-004', 'MSG-DEMO-002', 'CONTACT-DEMO-002', 114, null),
    ('lucia.descanso@test.com', 1, 'abierto',      'EVT-DEMO-005', 'MSG-DEMO-002', 'CONTACT-DEMO-002', 100, null),
    ('sofia.pack@test.com', 1, 'enviado',          'EVT-DEMO-006', 'MSG-DEMO-003', 'CONTACT-DEMO-003', 110, null),
    ('sofia.pack@test.com', 1, 'entregado',        'EVT-DEMO-007', 'MSG-DEMO-003', 'CONTACT-DEMO-003', 108, null),
    ('sofia.pack@test.com', 1, 'abierto',          'EVT-DEMO-008', 'MSG-DEMO-003', 'CONTACT-DEMO-003', 96, null),
    ('sofia.pack@test.com', 1, 'click',            'EVT-DEMO-009', 'MSG-DEMO-003', 'CONTACT-DEMO-003', 90, 'https://sazzu.store/pack-camping'),
    ('ana.camping@test.com', 1, 'enviado',         'EVT-DEMO-010', 'MSG-DEMO-004', 'CONTACT-DEMO-004', 106, null),
    ('ana.camping@test.com', 1, 'entregado',       'EVT-DEMO-011', 'MSG-DEMO-004', 'CONTACT-DEMO-004', 104, null),
    ('martin.outdoor@test.com', 1, 'enviado',      'EVT-DEMO-012', 'MSG-DEMO-005', 'CONTACT-DEMO-005', 102, null),
    ('martin.outdoor@test.com', 1, 'rebote_suave', 'EVT-DEMO-013', 'MSG-DEMO-005', 'CONTACT-DEMO-005', 101, null),
    ('diego.verano@test.com', 1, 'desuscripcion',  'EVT-DEMO-014', 'MSG-DEMO-001', 'CONTACT-DEMO-001', 80, null)
  ) as eventos(
    email,
    paso_orden,
    tipo_evento,
    brevo_evento_id,
    brevo_message_id,
    brevo_contact_id,
    minutos_atras,
    url_click
  )
)

insert into public.brevo_eventos_email (
  campania_id,
  paso_id,
  miembro_id,
  trabajo_sincronizacion_id,
  proveedor_envio,
  canal,
  tipo_evento,
  estado_evento,
  email,
  brevo_evento_id,
  brevo_message_id,
  brevo_contact_id,
  brevo_campaign_id,
  brevo_template_id,
  asunto_email,
  url_click,
  fecha_evento,
  fecha_procesado,
  ip,
  user_agent,
  payload_evento,
  metadata
)
select
  ci.id,
  cps.id,
  mca.id,
  bts.id,
  'brevo',
  'email',
  eventos.tipo_evento,
  'registrado',
  eventos.email,
  eventos.brevo_evento_id,
  eventos.brevo_message_id,
  eventos.brevo_contact_id,
  'BREVO-CAMP-TEST-001',
  cps.brevo_template_id,
  cps.asunto_email,
  eventos.url_click,
  now() - (eventos.minutos_atras || ' minutes')::interval,
  now(),
  '127.0.0.1',
  'seed-demo',
  jsonb_build_object(
    'evento_demo', true,
    'tipo_evento', eventos.tipo_evento
  ),
  jsonb_build_object(
    'demo', true,
    'origen_seed', '20260506_002_publicidad_interna_seed_demo'
  )
from eventos_demo eventos
join public.campanias_internas ci
  on ci.nombre = 'Recompra Pack Camping'
join public.conjuntos_audiencia ca
  on ca.nombre = 'Camping verano compradores'
join public.campania_pasos_secuencia cps
  on cps.campania_id = ci.id
 and cps.orden = eventos.paso_orden
join public.brevo_trabajos_sincronizacion bts
  on bts.campania_id = ci.id
join public.miembros_conjunto_audiencia mca
  on mca.conjunto_audiencia_id = ca.id
 and mca.email = eventos.email;


-- ============================================================
-- FIN - Publicidad Interna · Seed demo real
-- ============================================================