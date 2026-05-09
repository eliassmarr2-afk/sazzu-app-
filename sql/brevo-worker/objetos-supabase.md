# Objetos Supabase · Brevo Worker

## Vistas

### vista_brevo_trabajos_pendientes_make

Cola operativa. Solo debe exponer trabajos con:

```text
estado = pendiente
tipo_trabajo = sincronizar_contactos
campaña activa
brevo_lista_id numérico
cantidad_contactos_estimados > 0
```

### vista_brevo_trabajos_bloqueados_make

Diagnóstico de trabajos pendientes inválidos.

Motivos:

```text
brevo_lista_id_null
brevo_lista_id_no_numerico
sin_contactos_estimados
bloqueado_por_regla_no_clasificada
```

### vista_brevo_trabajos_estancados_make

Diagnóstico de trabajos en `procesando` sin cierre durante más de 30 minutos.

## RPCs

### rpc_brevo_marcar_trabajo_resultado

RPC base para transiciones: `procesando`, `completado`, `error`. Recibe `p_payload jsonb`.

### rpc_brevo_obtener_contactos_trabajo

Obtiene contactos elegibles para un trabajo. Recibe `p_payload jsonb`.

### rpc_brevo_cuarentenar_trabajos_bloqueados

Marca como error los trabajos bloqueados pendientes.

### rpc_brevo_cerrar_trabajos_estancados

Marca como error trabajos que quedaron demasiado tiempo en `procesando`.

### rpc_brevo_worker_preflight

Ejecuta mantenimiento previo: cuarentena de bloqueados y cierre de estancados.

### rpc_brevo_reclamar_trabajo_pendiente

Claim atómico con `FOR UPDATE SKIP LOCKED`.

### rpc_brevo_reclamar_trabajo_pendiente_make_array

Adaptador para Make. Devuelve `[]` o `[trabajo]`.
