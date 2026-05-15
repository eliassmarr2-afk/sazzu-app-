# Publicidad Interna · Make/Brevo Worker · Mapa del blueprint legacy

## Archivo fuente

Blueprint recibido: `Integration HTTP.blueprint.json`

Este documento describe el flujo recuperado y los puntos críticos para reconstruir el escenario Make/Brevo sin depender de memoria ni de cambios no versionados.

## Objetivo operativo

Conectar:

```txt
Protocol Data / Tower
→ Supabase
→ Make
→ Brevo
→ Supabase
→ Tower
```

El flujo toma trabajos pendientes desde Supabase, obtiene los contactos asociados, los sincroniza en Brevo y devuelve el resultado técnico a Supabase.

## Flujo encontrado en el blueprint legacy

### 1. Preflight del worker

**Módulo Make:** HTTP 11  
**Endpoint:** `rpc_brevo_worker_preflight`  
**Método:** POST

Body observado:

```json
{
  "p_payload": {
    "limit": 50
  }
}
```

Función esperada:

- Verificar condiciones de ejecución.
- Preparar al worker para procesar trabajos pendientes.
- En la versión legacy no parece gobernar por completo el flujo posterior.

### 2. Obtener trabajos pendientes

**Módulo Make:** HTTP 1  
**Endpoint:** `vista_brevo_trabajos_pendientes_make?select=*&limit=1`  
**Método:** GET

Función esperada:

- Leer el próximo trabajo pendiente desde Supabase.
- Actualmente toma solo 1 trabajo por ejecución.

### 3. Iterar trabajos

**Módulo Make:** Iterator 2  
**Fuente:** `{{1.data}}`

Filtro:

```txt
Solo continuar si hay trabajos pendientes
```

Condición observada:

```txt
{{1.data}} array greater 0
```

### 4. Marcar trabajo como procesando

**Módulo Make:** HTTP 4  
**Endpoint:** `rpc_brevo_marcar_trabajo_resultado`  
**Método:** POST

Body observado:

```json
{
  "p_payload": {
    "trabajo_id": "{{2.trabajo_id}}",
    "estado": "procesando",
    "cantidad_contactos_sincronizados": 0,
    "cantidad_contactos_error": 0,
    "make_execution_id": null,
    "payload_respuesta": {
      "origen": "make",
      "fase": "inicio_procesamiento"
    },
    "errores": [],
    "metadata": {
      "worker": "PD · Brevo Sync Worker",
      "paso": "marcar_procesando"
    }
  }
}
```

### 5. Obtener contactos del trabajo

**Módulo Make:** HTTP 5  
**Endpoint:** `rpc_brevo_obtener_contactos_trabajo`  
**Método:** POST

Body observado:

```json
{
  "p_payload": {
    "trabajo_id": "{{2.trabajo_id}}",
    "limit": 100,
    "offset": 0
  }
}
```

Riesgo detectado:

- Solo trae 100 contactos.
- No hay paginación implementada en el blueprint legacy.

### 6. Iterar contactos

**Módulo Make:** Iterator 6  
**Fuente:** `{{5.data.contactos}}`

Función esperada:

- Procesar contacto por contacto.

### 7. Crear/actualizar contacto en Brevo

**Módulo Make:** HTTP 7  
**Endpoint:** `https://api.brevo.com/v3/contacts`  
**Método:** POST

Body observado:

```json
{
  "email": "{{6.email}}",
  "listIds": [{{6.brevo_lista_id}}],
  "updateEnabled": true
}
```

Función esperada:

- Crear o actualizar contacto.
- Asociarlo a una lista Brevo.

Limitación detectada:

- No envía atributos enriquecidos.
- No envía nombre, apellido, teléfono, etiquetas, fuente UTM ni metadata operacional.

### 8. Manejo de error Brevo

**Módulo Make:** HTTP 10, dentro del `onerror` del módulo 7  
**Endpoint:** `rpc_brevo_marcar_trabajo_resultado`  
**Método:** POST

Función esperada:

- Marcar trabajo como error si Brevo rechaza un contacto.

Problema detectado:

- En el blueprint original había un `{{2.trabajo_id}}` suelto al final del body JSON.
- Eso puede invalidar el JSON o producir una respuesta inesperada.

### 9. Agregar resultados

**Módulo Make:** Aggregator 8  
**Fuente:** Iterator 6

Mapper observado:

```txt
statusCode: {{7.statusCode}}
```

Función esperada:

- Agrupar resultados de sincronización.

Limitación detectada:

- Solo agrupa statusCode.
- No consolida emails exitosos, emails con error, payload Brevo ni conteos por tipo.

### 10. Marcar trabajo como completado

**Módulo Make:** HTTP 9  
**Endpoint:** `rpc_brevo_marcar_trabajo_resultado`  
**Método:** POST

Body observado:

```json
{
  "p_payload": {
    "trabajo_id": "{{2.trabajo_id}}",
    "estado": "completado",
    "cantidad_contactos_sincronizados": {{length(8.array)}},
    "cantidad_contactos_error": 0,
    "make_execution_id": null,
    "payload_respuesta": {
      "origen": "make",
      "fase": "sincronizacion_contactos_brevo",
      "detalle": "Contactos enviados a Brevo y trabajo cerrado desde Make"
    },
    "errores": [],
    "metadata": {
      "worker": "PD · Brevo Sync Worker",
      "paso": "marcar_completado"
    }
  }
}
```

## Problemas principales del blueprint legacy

```txt
1. Contiene claves reales en el archivo original. Deben rotarse.
2. Solo procesa 1 trabajo por ejecución.
3. Solo obtiene 100 contactos por trabajo.
4. No tiene paginación de contactos.
5. Payload hacia Brevo demasiado básico.
6. Manejo de error por contacto incompleto.
7. Posible JSON inválido en onError por token suelto.
8. No registra make_execution_id real.
9. No registra detalle por contacto sincronizado.
10. No crea ni actualiza campañas/templates Brevo; solo contactos/lista.
```

## Flujo objetivo reconstruido

```txt
1. Make ejecuta preflight.
2. Supabase devuelve capacidad y trabajos candidatos.
3. Make toma uno o más trabajos pendientes.
4. Make marca cada trabajo como procesando.
5. Make obtiene contactos paginados.
6. Make crea/actualiza contacto en Brevo con atributos.
7. Make agrega contacto a lista o dispara automatización.
8. Make registra resultado por lote.
9. Make marca trabajo como completado o completado_con_errores.
10. Supabase consolida métricas.
11. Tower muestra estado actualizado.
```

## RPCs que deben auditarse

```txt
rpc_brevo_worker_preflight
rpc_brevo_obtener_contactos_trabajo
rpc_brevo_marcar_trabajo_resultado
rpc_crear_campania_interna_borrador
rpc_publicar_campania_interna
```

## Tablas involucradas

```txt
campanias_internas
campania_conjuntos_audiencia
campania_pasos_secuencia
miembros_conjunto_audiencia
brevo_trabajos_sincronizacion
brevo_eventos_email
```

## Decisión operativa

Este blueprint debe mantenerse como respaldo legacy, no como versión final.

La reconstrucción debe hacerse con una versión nueva del escenario Make y con blueprint exportado después de cada tanda importante.
