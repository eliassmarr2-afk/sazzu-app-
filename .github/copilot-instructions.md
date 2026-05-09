# Copilot instructions · Sazzú Control Tower

## Reglas para Publicidad Interna + Brevo Worker

1. Supabase gobierna la cola. Make solo ejecuta.
2. Make no debe procesar trabajos con `brevo_lista_id` no numérico.
3. Make no debe procesar trabajos con `cantidad_contactos_estimados <= 0`.
4. Todo trabajo tomado por el worker debe pasar por claim atómico.
5. No usar lecturas sueltas de la vista de pendientes para marcar procesando después.
6. El cierre debe usar cantidad real procesada, no estimada.
7. Todo error de Brevo debe terminar en `estado = error` en Supabase.
8. No incluir secrets en código o documentación.
9. Antes de activar Scheduler, validar con `Run once`.
10. El preflight debe ejecutarse antes de reclamar trabajos.

## Objetos centrales

```text
rpc_brevo_worker_preflight
rpc_brevo_reclamar_trabajo_pendiente_make_array
rpc_brevo_obtener_contactos_trabajo
rpc_brevo_marcar_trabajo_resultado
vista_brevo_trabajos_pendientes_make
vista_brevo_trabajos_bloqueados_make
vista_brevo_trabajos_estancados_make
```

## Estilo de cambios

- No romper lógica existente.
- Preferir parches mínimos.
- Documentar cada cambio operativo.
- Evitar sobreingeniería si el flujo ya tiene cobertura suficiente.
