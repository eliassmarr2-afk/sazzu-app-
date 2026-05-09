# VS Code Context · Sazzú Brevo Worker

## Estado del worker

El worker de Publicidad Interna + Brevo fue validado con:

```text
Supabase → Make → Brevo → Supabase completado
```

Se procesaron 24 contactos en lista Brevo durante prueba piloto y se cerró correctamente el trabajo.

## Flujo final esperado

```text
Preflight
↓
Claim atómico
↓
Filtro si no hay trabajo
↓
Obtener contactos
↓
Enviar a Brevo
↓
Agregar resultados
↓
Cerrar trabajo
```

## Regla maestra

```text
No procesar trabajos no reclamados atómicamente.
```

## Próximo hito

Prueba controlada con 2 o 3 contactos usando el flujo con claim atómico integrado.

Después:

```text
Parámetros UTM
Audiencias automáticas
Conjuntos de audiencia
Publicidad Interna
Brevo
```
