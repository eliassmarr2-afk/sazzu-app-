# Publicidad Interna · Flujo Make / Brevo

Este documento registra el flujo operativo esperado entre la Tower, Supabase, Make y Brevo.

## Objetivo

Permitir que una campaña interna creada o activada desde la Tower pueda ejecutarse mediante Make y Brevo, registrando luego los resultados nuevamente en Supabase.

## Flujo general

1. El usuario crea una campaña interna desde la Tower.
2. Supabase registra la campaña en `campanias_internas`.
3. Supabase vincula la campaña con uno o varios conjuntos en `campania_conjuntos_audiencia`.
4. Supabase registra los pasos de la secuencia en `campania_pasos_secuencia`.
5. Al activar la campaña, Supabase crea un trabajo en `brevo_trabajos_sincronizacion`.
6. Make detecta o recibe ese trabajo.
7. Make sincroniza la campaña, los contactos y la secuencia con Brevo.
8. Brevo ejecuta los envíos.
9. Brevo devuelve eventos de comportamiento.
10. Supabase registra esos eventos en `brevo_eventos_email`.
11. Las vistas consolidan los datos.
12. La Tower muestra métricas actualizadas en Publicidad Interna.

## Tablas involucradas

### campanias_internas

Guarda la campaña principal.

### campania_conjuntos_audiencia

Define qué conjuntos participan en la campaña.

### campania_pasos_secuencia

Define los pasos o emails de la secuencia.

### miembros_conjunto_audiencia

Guarda los contactos que pertenecen a cada conjunto.

### brevo_trabajos_sincronizacion

Registra trabajos técnicos pendientes, procesando, completados o con error.

### brevo_eventos_email

Guarda eventos devueltos por Brevo.

## Estados esperados de un trabajo

- pendiente
- procesando
- completado
- completado_con_errores
- error
- cancelado

## Eventos esperados desde Brevo

- contacto_sincronizado
- contacto_creado
- contacto_actualizado
- enviado
- entregado
- abierto
- click
- rebote
- rebote_suave
- rebote_duro
- desuscripcion
- spam
- bloqueado
- error
- compra_atribuida
- otro

## Estado actual

Existe una simulación funcional:

- campaña ficticia: Recompra Pack Camping
- conjunto: Camping verano compradores
- miembros ficticios: 5
- pasos ficticios: 3
- trabajo Make/Brevo simulado como completado
- eventos Brevo ficticios cargados
- vista `vista_panel_publicidad_interna` consumida por el frontend

## Próximo objetivo

Conectar la vista de detalle de campaña para mostrar datos reales desde Supabase antes de avanzar con escritura real o automatización Make/Brevo.