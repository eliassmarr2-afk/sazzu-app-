-- ============================================================
-- Publicidad Interna · Vistas reales
-- Vistas consolidadas para métricas y frontend.
-- Compatibles con el schema real de Supabase.
-- Proyecto: Sazzú Control Tower / Protocol Data
-- ============================================================


-- ------------------------------------------------------------
-- 1. Vista técnica: vista_metricas_campanias_internas
-- Consolida campañas, conjuntos, miembros, pasos, trabajos y eventos.
-- ------------------------------------------------------------

create or replace view public.vista_metricas_campanias_internas as
with conjuntos_por_campania as (
  select
    cca.campania_id,
    count(distinct cca.conjunto_audiencia_id) as conjuntos_asociados,
    coalesce(sum(ca.cantidad_miembros), 0) as miembros_estimados
  from public.campania_conjuntos_audiencia cca
  join public.conjuntos_audiencia ca
    on ca.id = cca.conjunto_audiencia_id
  where cca.estado = 'activo'
  group by cca.campania_id
),

miembros_por_campania as (
  select
    cca.campania_id,
    count(distinct mca.id) filter (
      where mca.estado = 'activo'
    ) as miembros_reales_activos,
    count(distinct mca.id) filter (
      where mca.estado <> 'activo'
    ) as miembros_no_disponibles
  from public.campania_conjuntos_audiencia cca
  join public.miembros_conjunto_audiencia mca
    on mca.conjunto_audiencia_id = cca.conjunto_audiencia_id
  where cca.estado = 'activo'
  group by cca.campania_id
),

pasos_por_campania as (
  select
    campania_id,
    count(*) as pasos_totales,
    count(*) filter (
      where estado = 'borrador'
    ) as pasos_borrador,
    count(*) filter (
      where estado in ('activo', 'programado')
    ) as pasos_activos_o_programados
  from public.campania_pasos_secuencia
  group by campania_id
),

trabajos_por_campania as (
  select
    campania_id,
    count(*) as trabajos_totales,
    count(*) filter (
      where estado = 'pendiente'
    ) as trabajos_pendientes,
    count(*) filter (
      where estado = 'procesando'
    ) as trabajos_procesando,
    count(*) filter (
      where estado in ('completado', 'completado_con_errores')
    ) as trabajos_completados,
    count(*) filter (
      where estado = 'error'
    ) as trabajos_error
  from public.brevo_trabajos_sincronizacion
  group by campania_id
),

eventos_por_campania as (
  select
    campania_id,

    count(*) filter (
      where tipo_evento = 'enviado'
    ) as enviados,

    count(*) filter (
      where tipo_evento = 'entregado'
    ) as entregados,

    count(*) filter (
      where tipo_evento = 'abierto'
    ) as abiertos,

    count(*) filter (
      where tipo_evento in ('click', 'hacer_click', 'hacer_clic')
    ) as clicks,

    count(*) filter (
      where tipo_evento in ('rebote', 'rebote_suave', 'rebote_duro')
    ) as rebotes,

    count(*) filter (
      where tipo_evento in ('desuscripcion', 'desuscripción', 'baja')
    ) as desuscripciones,

    count(*) filter (
      where tipo_evento = 'compra_atribuida'
    ) as compras_atribuidas

  from public.brevo_eventos_email
  group by campania_id
)

select
  ci.id as campania_id,
  ci.nombre as campania,
  ci.descripcion,
  ci.objetivo,
  ci.canal,
  ci.proveedor_envio,
  ci.estado as estado_campania,

  ci.fecha_inicio_programada,
  ci.fecha_fin_programada,
  ci.zona_horaria,

  ci.reglas_inicio,
  ci.reglas_finalizacion,
  ci.configuracion_envio,
  ci.metadata,

  ci.fecha_creacion,
  ci.fecha_actualizacion,

  coalesce(cpc.conjuntos_asociados, 0) as conjuntos_asociados,
  coalesce(cpc.miembros_estimados, 0) as miembros_estimados,

  coalesce(mpc.miembros_reales_activos, 0) as miembros_reales_activos,
  coalesce(mpc.miembros_no_disponibles, 0) as miembros_no_disponibles,

  coalesce(ppc.pasos_totales, 0) as pasos_totales,
  coalesce(ppc.pasos_borrador, 0) as pasos_borrador,
  coalesce(ppc.pasos_activos_o_programados, 0) as pasos_activos_o_programados,

  coalesce(tpc.trabajos_totales, 0) as trabajos_totales,
  coalesce(tpc.trabajos_pendientes, 0) as trabajos_pendientes,
  coalesce(tpc.trabajos_procesando, 0) as trabajos_procesando,
  coalesce(tpc.trabajos_completados, 0) as trabajos_completados,
  coalesce(tpc.trabajos_error, 0) as trabajos_error,

  coalesce(epc.enviados, 0) as enviados,
  coalesce(epc.entregados, 0) as entregados,
  coalesce(epc.abiertos, 0) as abiertos,
  coalesce(epc.clicks, 0) as clicks,
  coalesce(epc.rebotes, 0) as rebotes,
  coalesce(epc.desuscripciones, 0) as desuscripciones,
  coalesce(epc.compras_atribuidas, 0) as compras_atribuidas,

  case
    when coalesce(epc.enviados, 0) = 0 then 0
    else round((coalesce(epc.entregados, 0)::numeric / epc.enviados::numeric) * 100, 2)
  end as tasa_entrega_pct,

  case
    when coalesce(epc.entregados, 0) = 0 then 0
    else round((coalesce(epc.abiertos, 0)::numeric / epc.entregados::numeric) * 100, 2)
  end as tasa_apertura_pct,

  case
    when coalesce(epc.entregados, 0) = 0 then 0
    else round((coalesce(epc.clicks, 0)::numeric / epc.entregados::numeric) * 100, 2)
  end as tasa_click_pct,

  case
    when coalesce(epc.enviados, 0) = 0 then 0
    else round((coalesce(epc.rebotes, 0)::numeric / epc.enviados::numeric) * 100, 2)
  end as tasa_rebote_pct,

  case
    when coalesce(epc.enviados, 0) = 0 then 0
    else round((coalesce(epc.desuscripciones, 0)::numeric / epc.enviados::numeric) * 100, 2)
  end as tasa_desuscripcion_pct

from public.campanias_internas ci
left join conjuntos_por_campania cpc
  on cpc.campania_id = ci.id
left join miembros_por_campania mpc
  on mpc.campania_id = ci.id
left join pasos_por_campania ppc
  on ppc.campania_id = ci.id
left join trabajos_por_campania tpc
  on tpc.campania_id = ci.id
left join eventos_por_campania epc
  on epc.campania_id = ci.id;


-- ------------------------------------------------------------
-- 2. Vista frontend: vista_panel_publicidad_interna
-- Simplifica la lectura para las cards del panel.
-- Esta vista es la fuente actual del frontend.
-- ------------------------------------------------------------

create or replace view public.vista_panel_publicidad_interna as
select
  vm.campania_id,
  vm.campania,
  vm.descripcion,
  vm.objetivo,
  vm.canal,
  vm.proveedor_envio,
  vm.estado_campania,

  case
    when vm.estado_campania = 'activa' then 'Activa'
    when vm.estado_campania = 'borrador' then 'Borrador'
    when vm.estado_campania = 'pausada' then 'Pausada'
    when vm.estado_campania = 'finalizada' then 'Finalizada'
    when vm.estado_campania = 'error' then 'Error'
    else initcap(replace(vm.estado_campania, '_', ' '))
  end as estado_visible,

  case
    when vm.trabajos_error > 0 then 'error_operativo'
    when vm.trabajos_pendientes > 0 then 'pendiente_sincronizacion'
    when vm.trabajos_procesando > 0 then 'procesando'
    when vm.trabajos_completados > 0 and vm.clicks > 0 then 'activa_con_metricas'
    when vm.trabajos_completados > 0 then 'activa_sin_clicks'
    when vm.pasos_totales = 0 then 'sin_pasos'
    when vm.conjuntos_asociados = 0 then 'sin_conjuntos'
    else 'configuracion_incompleta'
  end as estado_operativo_panel,

  case
    when vm.trabajos_error > 0 then 'Revisar error'
    when vm.trabajos_pendientes > 0 then 'Sincronizar'
    when vm.trabajos_procesando > 0 then 'Ver progreso'
    when vm.trabajos_completados > 0 and vm.clicks > 0 then 'Ver métricas'
    when vm.trabajos_completados > 0 then 'Ver campaña'
    when vm.pasos_totales = 0 then 'Configurar pasos'
    when vm.conjuntos_asociados = 0 then 'Asignar conjunto'
    else 'Completar configuración'
  end as accion_principal_sugerida,

  case
    when vm.trabajos_error > 0 then 'Hay trabajos con error en Make/Brevo.'
    when vm.trabajos_pendientes > 0 then 'La campaña tiene trabajos pendientes de sincronización.'
    when vm.trabajos_procesando > 0 then 'La campaña se está procesando.'
    when vm.clicks > 0 then 'La campaña ya registra clicks.'
    when vm.abiertos > 0 then 'La campaña ya registra aperturas.'
    when vm.enviados > 0 then 'La campaña ya registra envíos.'
    when vm.pasos_totales = 0 then 'La campaña todavía no tiene pasos configurados.'
    when vm.conjuntos_asociados = 0 then 'La campaña todavía no tiene conjuntos asociados.'
    else 'Campaña cargada desde Supabase.'
  end as lectura_rapida,

  vm.conjuntos_asociados,
  vm.miembros_estimados,
  vm.miembros_reales_activos,
  vm.miembros_no_disponibles,

  vm.pasos_totales,
  vm.pasos_borrador,
  vm.pasos_activos_o_programados,

  vm.trabajos_totales,
  vm.trabajos_pendientes,
  vm.trabajos_procesando,
  vm.trabajos_completados,
  vm.trabajos_error,

  vm.enviados,
  vm.entregados,
  vm.abiertos,
  vm.clicks,
  vm.rebotes,
  vm.desuscripciones,
  vm.compras_atribuidas,

  vm.tasa_entrega_pct,
  vm.tasa_apertura_pct,
  vm.tasa_click_pct,
  vm.tasa_rebote_pct,
  vm.tasa_desuscripcion_pct,

  vm.fecha_inicio_programada,
  vm.fecha_fin_programada,
  vm.zona_horaria,
  vm.fecha_creacion,
  vm.fecha_actualizacion

from public.vista_metricas_campanias_internas vm;


-- ------------------------------------------------------------
-- 3. Comentarios de documentación
-- ------------------------------------------------------------

comment on view public.vista_metricas_campanias_internas is
'Vista técnica consolidada para métricas de campañas internas.';

comment on view public.vista_panel_publicidad_interna is
'Vista simplificada para alimentar el panel frontend de Publicidad Interna.';


-- ============================================================
-- FIN - Publicidad Interna · Vistas reales
-- ============================================================