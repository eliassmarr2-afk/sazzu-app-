# Arquitectura · Brevo Sync Worker

## Propósito

El worker sincroniza contactos desde Publicidad Interna hacia Brevo. Toma trabajos pendientes, obtiene contactos, los envía a una lista de Brevo y cierra el estado del trabajo en Supabase.

## Componentes

### Supabase

Fuente de verdad operativa. Guarda campañas, trabajos, estados, errores, vistas de diagnóstico y RPCs de control.

### Make

Worker de ejecución. Ejecuta preflight, reclama trabajos, obtiene contactos, manda contactos a Brevo y cierra el trabajo.

### Brevo

Canal de activación. Recibe contactos, los agrega a listas y puede disparar automatizaciones.

## Flujo técnico actual

```text
1. Make ejecuta rpc_brevo_worker_preflight
2. Supabase cuarentena trabajos bloqueados
3. Supabase cierra trabajos estancados
4. Make ejecuta rpc_brevo_reclamar_trabajo_pendiente_make_array
5. Supabase reclama atómicamente un trabajo válido
6. Si no hay trabajo, Make corta por filtro
7. Si hay trabajo, Make obtiene contactos con rpc_brevo_obtener_contactos_trabajo
8. Make itera contactos
9. Make envía cada contacto a Brevo /v3/contacts
10. Make agrega resultados con Array Aggregator
11. Make cierra el trabajo con rpc_brevo_marcar_trabajo_resultado
```

## Principio de diseño

```text
Supabase gobierna.
Make ejecuta.
Brevo activa.
```

## Estado actual

La etapa de blindaje principal quedó aprobada hasta el claim atómico integrado en Make con cola vacía. Antes de activar Scheduler, falta una prueba controlada con un trabajo real pequeño.
