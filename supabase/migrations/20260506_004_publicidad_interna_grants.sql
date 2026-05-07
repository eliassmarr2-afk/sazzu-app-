-- ============================================================
-- Publicidad Interna · Grants / permisos de lectura
-- Permisos mínimos para que el frontend lea vistas seguras.
-- Proyecto: Sazzú Control Tower / Protocol Data
-- ============================================================


-- ------------------------------------------------------------
-- 1. Permitir uso del schema public
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;


-- ------------------------------------------------------------
-- 2. Permitir lectura de vistas consolidadas
-- Estas vistas alimentan el panel de Publicidad Interna.
-- ------------------------------------------------------------

grant select on public.vista_metricas_campanias_internas
to anon, authenticated;

grant select on public.vista_panel_publicidad_interna
to anon, authenticated;


-- ------------------------------------------------------------
-- 3. No abrir escritura desde frontend
-- Importante:
-- El frontend NO debe escribir directamente en tablas base.
-- La escritura futura debe hacerse mediante RPC, Edge Functions,
-- Make o backend controlado.
-- ------------------------------------------------------------

-- No otorgar insert/update/delete a anon sobre:
-- - public.campanias_internas
-- - public.campania_conjuntos_audiencia
-- - public.campania_pasos_secuencia
-- - public.miembros_conjunto_audiencia
-- - public.brevo_trabajos_sincronizacion
-- - public.brevo_eventos_email


-- ------------------------------------------------------------
-- 4. Consulta de prueba para validar lectura frontend
-- ------------------------------------------------------------

select
  campania,
  objetivo,
  canal,
  estado_visible,
  estado_operativo_panel,
  accion_principal_sugerida,
  lectura_rapida,
  conjuntos_asociados,
  miembros_estimados,
  miembros_reales_activos,
  pasos_totales,
  trabajos_completados,
  enviados,
  entregados,
  abiertos,
  clicks,
  tasa_entrega_pct,
  tasa_apertura_pct,
  tasa_click_pct
from public.vista_panel_publicidad_interna
where campania = 'Recompra Pack Camping';


-- ============================================================
-- FIN - Publicidad Interna · Grants / permisos de lectura
-- ============================================================