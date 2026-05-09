# Blindajes del Brevo Sync Worker

Cada blindaje se documenta con explicación técnica, traducción humana y ejemplo.

---

## Blindaje 1 · Error handler de Brevo

### Explicación técnica

Se agregó una ruta de error en Make sobre el módulo `HTTP · POST https://api.brevo.com/v3/contacts`. Si Brevo falla, la ruta llama a `rpc_brevo_marcar_trabajo_resultado` con `estado = error`.

### Lenguaje humano

Si Brevo se cae o rechaza un contacto, el sistema no queda mudo. Supabase registra el fallo.

### Ejemplo

Antes: Brevo falla → Make se corta → Supabase queda en `procesando`.  
Después: Brevo falla → error handler → Supabase marca `error`.

---

## Blindaje 2 · Cantidad real desde Array Aggregator

### Explicación técnica

El cierre dejó de usar `cantidad_contactos_estimados` y pasó a usar `length(8.array)`, la cantidad real agregada después del procesamiento de contactos.

### Lenguaje humano

El sistema ya no dice “procesé lo esperado”; dice “procesé lo que realmente pasó”.

### Ejemplo

Antes: estimados 24, procesados 22, Supabase cerraba 24.  
Después: Supabase cierra 22.

---

## Blindaje 3 · Filtro si no hay trabajos pendientes

### Explicación técnica

Se agregó filtro entre claim/lectura e Iterator: `Data[] → Array length greater than → 0`.

### Lenguaje humano

Si no hay nada para hacer, Make corta y no sigue gastando operaciones.

### Ejemplo

Cola vacía → filtro corta → Brevo no se toca.

---

## Blindaje 4 · Make solo ve `brevo_lista_id` numérico

### Explicación técnica

`vista_brevo_trabajos_pendientes_make` exige:

```sql
t.brevo_lista_id is not null
and t.brevo_lista_id::text ~ '^[0-9]+$'
```

### Lenguaje humano

Make solo ve trabajos que apuntan a una lista real de Brevo.

### Ejemplo

`BREVO_LISTA_CROSS_SELL_DEMO` queda bloqueado y no llega a Make.

---

## Blindaje 5 · Vista de trabajos bloqueados

### Explicación técnica

Se creó `vista_brevo_trabajos_bloqueados_make` con motivos como `brevo_lista_id_null`, `brevo_lista_id_no_numerico` y `sin_contactos_estimados`.

### Lenguaje humano

Lo inválido no desaparece: queda en una bandeja de diagnóstico.

### Ejemplo

Trabajo con destino demo → no llega a Make → aparece en bloqueados con motivo.

---

## Blindaje 6 · RPC de cuarentena automática

### Explicación técnica

`rpc_brevo_cuarentenar_trabajos_bloqueados` lee la vista de bloqueados y marca esos trabajos como `error` usando `rpc_brevo_marcar_trabajo_resultado`.

### Lenguaje humano

Los trabajos inválidos no quedan pendientes para siempre; el sistema los manda a cuarentena.

### Ejemplo

Trabajo bloqueado pendiente → preflight lo detecta → queda `error` con motivo.

---

## Blindaje 7 · Vista de trabajos estancados

### Explicación técnica

`vista_brevo_trabajos_estancados_make` detecta trabajos en `procesando`, sin `fecha_fin_ejecucion`, por más de 30 minutos.

### Lenguaje humano

Si un trabajo se queda trabado, aparece en una vista de alerta.

### Ejemplo

Make marca procesando y se corta → 30 minutos después aparece como estancado.

---

## Blindaje 8 · RPC para cerrar trabajos estancados

### Explicación técnica

`rpc_brevo_cerrar_trabajos_estancados` lee la vista de estancados y marca como `error` los trabajos colgados.

### Lenguaje humano

Si un trabajo se queda colgado, el sistema lo baja con error controlado.

### Ejemplo

Procesando por horas → RPC lo cierra como `error` y deja auditoría.

---

## Blindaje 9 · Preflight central del worker

### Explicación técnica

`rpc_brevo_worker_preflight` ejecuta cuarentena de bloqueados y cierre de estancados antes de reclamar trabajos.

### Lenguaje humano

Antes de trabajar, el worker limpia el escritorio.

### Ejemplo

Make arranca → preflight limpia anomalías → recién después procesa.

---

## Blindaje 10 · Bloquear trabajos sin contactos

### Explicación técnica

La vista de pendientes exige:

```sql
coalesce(t.cantidad_contactos_estimados, 0) > 0
```

La vista de bloqueados clasifica `sin_contactos_estimados`.

### Lenguaje humano

Si una campaña no tiene destinatarios, Make no la procesa.

### Ejemplo

Trabajo con 0 contactos → bloqueado → no entra al worker.

---

## Blindaje 11 · Claim atómico

### Explicación técnica

Se creó `rpc_brevo_reclamar_trabajo_pendiente` con `FOR UPDATE SKIP LOCKED` y una RPC adaptadora `rpc_brevo_reclamar_trabajo_pendiente_make_array` que devuelve `[]` o `[trabajo]`.

### Lenguaje humano

Supabase aparta el trabajo antes de entregarlo. Dos ejecuciones no pueden tomar el mismo trabajo.

### Ejemplo

Antes: dos ejecuciones podían leer el mismo pendiente.  
Después: una ejecución lo reclama y la otra ya no lo ve.

---

# Conclusión

El worker ahora tiene preflight, cola válida, cola bloqueada, cuarentena, detección de estancados, cierre de estancados, claim atómico, cierre con cantidad real y manejo de error de Brevo.
