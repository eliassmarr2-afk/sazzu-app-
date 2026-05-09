# Sazzú Control Tower · Publicidad Interna · Brevo Worker

Documentación operativa del worker de sincronización: `Supabase → Make → Brevo`.

Fecha: 2026-05-09

## Objetivo

Documentar los blindajes implementados para convertir el flujo de Publicidad Interna + Brevo de prototipo funcional en infraestructura auditable.

## Estructura

```text
docs/publicidad-interna/brevo-worker/
  arquitectura-worker.md
  blindajes.md
  checklist-auditoria.md
sql/brevo-worker/
  objetos-supabase.md
.github/
  copilot-instructions.md
.vscode/
  sazzu-brevo-worker-context.md
```

## Regla principal

Supabase gobierna la cola. Make ejecuta únicamente trabajos ya validados o reclamados por RPCs controladas. Brevo solo recibe trabajos con destino válido.

## Flujo validado

```text
HTTP · Preflight worker
↓
HTTP · Reclamar trabajo pendiente atómico
↓
Filtro · Solo continuar si hay trabajo
↓
Iterator · Trabajo
↓
HTTP · Obtener contactos
↓
Iterator · Contactos
↓
HTTP · Crear/actualizar contacto en Brevo
↓
Array Aggregator
↓
HTTP · Marcar trabajo como completado
```

## Seguridad

No subir secrets:

```text
Supabase secret key
Supabase service_role key
Brevo API key xkeysib-...
Make webhook secrets
```
