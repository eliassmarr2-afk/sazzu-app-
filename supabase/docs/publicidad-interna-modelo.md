# Publicidad Interna · Modelo Supabase

Este documento registra la estructura base del módulo de Publicidad Interna dentro de Supabase.

## Objetivo del módulo

Permitir que la Tower cree, visualice y gestione campañas internas sobre conjuntos de audiencia propios, conectando:

Supabase → Publicidad Interna → Make → Brevo → Supabase → Tower

## Tablas principales

### conjuntos_audiencia

Representa los conjuntos de audiencia disponibles para usar en campañas internas.

Ejemplo:

- Camping verano compradores
- Descanso hogar interesados
- Clientes para recompra general

### campanias_internas

Representa cada campaña interna creada desde la Tower.

Ejemplo:

- Recompra Pack Camping

### campania_conjuntos_audiencia

Tabla intermedia que vincula campañas internas con conjuntos de audiencia.

Una campaña puede usar uno o varios conjuntos.

### campania_pasos_secuencia

Representa los pasos de una campaña.

Ejemplo:

1. Email inicial
2. Recordatorio
3. Último aviso

### miembros_conjunto_audiencia

Representa los contactos que pertenecen a cada conjunto de audiencia.

### brevo_trabajos_sincronizacion

Representa los trabajos técnicos que Make debe procesar para sincronizar campañas/contactos con Brevo.

### brevo_eventos_email

Representa eventos devueltos por Brevo.

Ejemplos:

- enviado
- entregado
- abierto
- click
- rebote
- desuscripción
- compra atribuida

## Vistas principales

### vista_metricas_campanias_internas

Vista consolidada técnica que cruza campañas, conjuntos, miembros, pasos, trabajos y eventos.

### vista_panel_publicidad_interna

Vista simplificada para alimentar el frontend del panel de Publicidad Interna.

Esta es la vista que actualmente consume el frontend.

## Estado actual

El panel de Publicidad Interna ya lee datos reales desde Supabase mediante:

`vista_panel_publicidad_interna`

El indicador visual del panel confirma:

`Fuente: Supabase`

## Próximo objetivo técnico

Conectar el botón “Ver detalle” para que lea datos reales desde Supabase:

- pasos reales
- conjuntos asociados reales
- trabajos Make/Brevo reales
- eventos recientes reales