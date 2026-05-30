# Protocol Data · Shipping Engine

Este documento define el diseño inicial del motor de envíos para Protocol Data y su futura integración con Shopify.

## Objetivo

El motor debe resolver consultas públicas de códigos postales para mostrar en la landing product información como:

- disponibilidad de envío;
- costo de envío;
- envío gratis;
- promesa de entrega;
- banda horaria estimada;
- banner operativo;
- badges y acciones visuales dependientes del CP.

Este motor no reemplaza todavía las tarifas reales configuradas en Shopify Checkout. Primero funciona como motor de consulta pública para `Ver cuándo llega`.

## Tablas principales

### `shipping_postal_codes`

Base maestra importada desde CSV.

Columnas base esperadas:

- `postal_code`
- `province`
- `locality`
- `province_normalized`
- `locality_normalized`
- `zone_id`
- `is_active`

El CSV original tiene estas columnas:

- `Codigo P`
- `Provincia`
- `Localidad`

La tabla se usa para reconocimiento geográfico, no para editar tarifas por cada fila.

### `shipping_zones`

Agrupa códigos postales/provincias/localidades en zonas operativas.

Ejemplos iniciales:

- `caba`
- `gba`
- `pba`
- `interior_centro`
- `interior_norte`
- `interior_sur`
- `default_argentina`
- `no_disponible`

### `shipping_rules`

Reglas globales de envío.

Soporta los siguientes alcances:

- `default`
- `zone`
- `province`
- `locality`
- `postal_code`

Ejemplos:

```txt
province | Capital Federal | free | 0 | Llega mañana
province | Buenos Aires    | paid | 7240 | Llega en 2 a 4 días
default  | null            | paid | 8900 | Llega en 3 a 7 días
```

### `shipping_exceptions`

Excepciones explícitas que ganan sobre reglas generales.

Tipos iniciales:

- `free_shipping`
- `surcharge`
- `unavailable`
- `quote_required`
- `operational_delay`
- `special_message`

Ejemplos:

```txt
postal_code | 1189 | free_shipping | Envío gratis aplicado
postal_code | 9999 | quote_required | Zona pendiente de confirmación
```

### `shipping_badges`

Badges y acciones visuales activadas por regla o excepción.

Ejemplos:

- `Envío gratis`
- `Llega mañana`
- `Entrega con seguimiento`
- `Zona a confirmar`

### `shipping_lookup_logs`

Auditoría de consultas públicas desde Shopify/landing/cart.

Permite medir:

- qué CP consulta más el usuario;
- qué zonas generan fricción;
- qué reglas se aplican;
- qué CP no están reconocidos.

## Orden de resolución

La función `resolve_shipping_lookup(postal_code)` debe resolver en este orden:

1. Validar CP.
2. Buscar CP en `shipping_postal_codes`.
3. Si no existe, devolver `not_found`.
4. Si existe, seleccionar una ubicación base.
5. Buscar excepción activa:
   - por CP;
   - por localidad;
   - por provincia;
   - por zona.
6. Si hay excepción, aplicar excepción.
7. Si no hay excepción, buscar regla activa:
   - por CP;
   - por localidad;
   - por provincia;
   - por zona;
   - default.
8. Devolver JSON público.
9. Registrar consulta en `shipping_lookup_logs`.

## Respuesta JSON esperada

### Caso exitoso

```json
{
  "status": "ok",
  "postal_code": "1414",
  "province": "Capital Federal",
  "locality": "Palermo",
  "zone_id": "caba",
  "shipping_available": true,
  "shipping_mode": "free",
  "shipping_price": 0,
  "shipping_label": "Gratis",
  "promise_label": "Llega mañana",
  "min_delivery_days": 1,
  "max_delivery_days": 1,
  "time_band": "14:00 a 18:00",
  "banner_id": "ban_navid_001",
  "public_message": null,
  "applied_rule_id": "reg_caba_001",
  "applied_exception_id": null,
  "badges": [
    {
      "badge_id": "badge_reg_caba_free_shipping",
      "text": "Envío gratis",
      "type": "success",
      "action_type": "show_shipping_badge",
      "action_payload": {
        "placement": "product_top",
        "color": "green"
      }
    }
  ]
}
```

### Caso no encontrado

```json
{
  "status": "not_found",
  "postal_code": "0000",
  "message": "No encontramos ese código postal en la base logística."
}
```

### Caso inválido

```json
{
  "status": "invalid",
  "postal_code": "",
  "message": "Ingresá un código postal válido."
}
```

### Caso ambiguo

Cuando un CP tenga más de una localidad en el CSV, la primera versión devuelve:

```json
{
  "status": "ambiguous",
  "postal_code": "1647",
  "province": "Buenos Aires",
  "locality": "Delta San Fernando",
  "zone_id": "pba",
  "shipping_available": true,
  "shipping_mode": "paid"
}
```

En una segunda iteración, el endpoint puede devolver candidatos para que el usuario elija localidad.

## Pruebas iniciales

Después de ejecutar migration + seed:

```sql
select public.resolve_shipping_lookup('1189', 'landing_product', 'demo_session');
select public.resolve_shipping_lookup('1414', 'landing_product', 'demo_session');
select public.resolve_shipping_lookup('5000', 'landing_product', 'demo_session');
select public.resolve_shipping_lookup('9999', 'landing_product', 'demo_session');
select public.resolve_shipping_lookup('0000', 'landing_product', 'demo_session');
```

Resultados esperados:

- `1189`: excepción de envío gratis.
- `1414`: regla CABA.
- `5000`: regla default nacional o zona interior, según reglas activas.
- `9999`: excepción de zona pendiente de confirmación.
- `0000`: no encontrado.

## Integración futura con Shopify

Primera etapa:

- landing product llama a un endpoint público de Protocol Data;
- el endpoint ejecuta `resolve_shipping_lookup`;
- Shopify recibe JSON y activa modal/badges/promesas visuales.

Segunda etapa opcional:

- evaluar Carrier Service o app propia para que Shopify Checkout use tarifas reales dinámicas.

No debe mezclarse la consulta pública de landing con la tarifa real de checkout hasta validar permisos, plan y callback público.
