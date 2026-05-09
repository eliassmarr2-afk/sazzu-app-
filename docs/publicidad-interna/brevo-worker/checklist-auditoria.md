# Checklist de auditoría · Brevo Sync Worker

## Antes de activar Scheduler

- [ ] Escenario Make apagado durante pruebas.
- [ ] `rpc_brevo_worker_preflight` responde `ok: true`.
- [ ] `rpc_brevo_reclamar_trabajo_pendiente_make_array` devuelve `[]` si no hay trabajos.
- [ ] Filtro Make corta cuando `Data[]` tiene longitud 0.
- [ ] Brevo no se ejecuta cuando no hay trabajo.
- [ ] `vista_brevo_trabajos_pendientes_make` devuelve solo trabajos válidos.
- [ ] `vista_brevo_trabajos_bloqueados_make` muestra inválidos con motivo.
- [ ] `vista_brevo_trabajos_estancados_make` muestra procesando por más de 30 minutos.
- [ ] Error handler de Brevo llama a `rpc_brevo_marcar_trabajo_resultado` con `estado = error`.
- [ ] Cierre final usa cantidad real del Array Aggregator.

## Prueba mínima antes de producción

```text
1 campaña interna
1 conjunto de audiencia
1 lista Brevo real numérica
2 o 3 contactos de prueba
Run once manual
```

Validar:

```text
trabajo pendiente → procesando → completado
cantidad_contactos_sincronizados = cantidad real
cantidad_contactos_error = 0
contactos agregados en Brevo
automatización disparada si corresponde
```

## Señales de alerta

- Make ejecuta Brevo cuando no hay trabajos.
- `brevo_lista_id` llega como texto no numérico.
- Trabajos quedan en `procesando`.
- `cantidad_contactos_sincronizados` no coincide con el Array Aggregator.
- Error handler no actualiza Supabase.
- Scheduler se activa antes de validar prueba mínima.
