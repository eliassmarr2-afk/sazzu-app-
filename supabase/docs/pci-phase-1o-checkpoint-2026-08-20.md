# Protocol Creative Insights — Phase 1O Runtime Checkpoint

**Fecha:** 2026-08-20  
**Estado:** Phase 1O runtime lifecycle COMPLETE
**Branch:** `feature/protocol-creative-insights-backend`  
**Producción:** NO TOCAR / sin cambios de esta fase

**Nota de cierre:** las secciones 1–11 conservan el snapshot intermedio de validación. El estado final autoritativo está en la sección 12; cualquier estado “current”, “al cierre” o pendiente anterior debe leerse como histórico.

---

## 1. Objetivo de este checkpoint

Este archivo permite continuar Phase 1O desde otro chat sin reconstruir la conversación completa.

La línea de trabajo sigue siendo:

`Creator real → Auth/JWT → Portal → Opportunity → Participation → Submission → V1/V2 → Rights → Review/Clearance → Preselection → Negotiation → Purchase/Payable/Payout → Rights ACTIVE → Asset acquisition`

La validación se está ejecutando únicamente sobre el proyecto Supabase descartable de runtime.

---

## 2. Entorno actual

### Repo

- Repo: `eliassmarr2-afk/sazzu-app-`
- Branch: `feature/protocol-creative-insights-backend`
- Worktree local usado por el usuario: `/Users/user/Desktop/pci-runtime-test`
- Portal local: `/Users/user/Desktop/pci-runtime-test/creator-portal`
- URL local: `http://localhost:5500/`

### Supabase runtime descartable

- Proyecto: `protocol-creative-insights-runtime-test`
- Project ref: `dgpmdqmdwqyiwhkbiakd`
- Workspace fixture: `pci-runtime-test`
- Producción `cuuzsbhpjmjbbnghtiny`: NO TOCAR

### Servidor local actual

Durante 1O se levantó un servidor Python con headers `no-store` para eliminar falsos positivos por caché de módulos:

```bash
cd /Users/user/Desktop/pci-runtime-test/creator-portal

python3 - <<'PY'
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

print("PCI runtime sin caché → http://localhost:5500/")
ThreadingHTTPServer(("0.0.0.0", 5500), NoCacheHandler).serve_forever()
PY
```

---

## 3. Estado general ya validado antes de este checkpoint

### DB / seguridad

- Migraciones PCI `001–060` aplicadas en orden en el runtime descartable.
- 29/29 tablas PCI con RLS enabled.
- `anon` / `authenticated` sin DML directo sobre PCI.
- `anon` / `authenticated` sin EXECUTE directo sobre funciones PCI.
- `pci` privado; `pci_api` expuesto para Edge/service-role.
- 0 `SECURITY DEFINER` PCI.
- search_path fijado/vacío en funciones sensibles.
- buckets PCI privados.
- gates de roles internos y Creator BOLA probados.
- relationship gate Creator probado: active = RW, restricted = RO, suspended/closed = deny.
- lifecycle financiero completo DB probado previamente con rollback.
- deferred constraints de payout/payable corregidos y probados.
- worker DB settlement probado previamente.

### Edge

Activas en runtime:

- `pci-creator-api` — verify_jwt true
- `pci-admin-api` — verify_jwt true
- `pci-onboarding-api` — verify_jwt true
- `pci-worker` — verify_jwt false + `x-pci-worker-secret`
- `pci-invitation-api` — verify_jwt true

Human APIs devolvieron 401 sin Authorization correctamente.
Worker rechazó sin custom secret con 401 y no mostró `worker_not_configured`.

### Invitation / onboarding

Se abandonó el token PCI crudo en URL.

Flujo vigente:

`email / transporte → pci_invitation_id no secreto → Auth real → JWT + email verificado → invitation exacta → identity bootstrap`

Migration 060 + `pci-invitation-api` implementan el bootstrap identity-based.

SMTP real NO quedó validado por rate limit del SMTP built-in de Supabase. Para 1O el transporte se simuló como fixture auditable, pero el binding Creator↔Auth sí ocurrió por el bootstrap real del navegador.

### Auth Creator / legal

El Creator runtime completó:

- sesión Auth real
- invitation bootstrap
- aceptación exacta de términos + privacy
- Creator active
- workspace_creator active
- acceso real a Creator Portal con `demoMode=false`

Documentos legales runtime publicados:

- Creator Terms v1.0-test
- Privacy Notice v1.0-test

---

## 4. Fixes de UI/runtime hechos durante esta sesión

### Loader eterno en Oportunidades y Mis trabajos

Causa: CSS (`display:grid/flex`) anulaba visualmente el atributo `hidden`.

Fix global aplicado:

```css
[hidden] { display: none !important; }
```

También se usaron cache-busts durante runtime para asegurar módulos/CSS frescos.

### Crear Submission no respondía

Causa original: listener delegado usaba `event.currentTarget` y recibía `document`, por lo que retornaba antes de ejecutar.

Fix: usar `event.target` / asegurar carga fresca del módulo.

Submission real creada correctamente después.

---

## 5. Opportunity / Participation / Submission de runtime actual

### Opportunity / Consignment

- Consignment ID: `025b4484-6814-42f9-bc49-0a5471dbfb9a`
- Título: `Runtime Test · Video UGC Producto`
- Revision ID congelada: `80ce1ae5-27f9-468a-8293-d3d5fb8b6a03`
- Revision number: 1
- Modalidad: consignación abierta
- Pago base visible: ARS 30.000 por activo adquirido
- Pre-purchase revision limit: 1

### Submission

- Submission ID: `a7266afd-7fbf-4ae9-9f43-c37684de33f6`
- Concept label: `Prueba`
- Current status al cierre de este checkpoint: `changes_requested`
- Current version ID: `52dbb643-60a0-4b84-8e34-44e8a0cf6409`

### Participation

- active
- revision congelada correctamente

---

## 6. V1 — upload físico REAL validado

### V1

- Submission Version ID: `52dbb643-60a0-4b84-8e34-44e8a0cf6409`
- version_number: 1
- status: `ready`
- original filename: `ssstik.io_1782049159735.mp4`
- MIME: `video/mp4`
- file_size_bytes: `2928158`
- duration_seconds: `12.653`
- width: `576`
- height: `1024`
- sha256: `92152546fc79f4b8c105fd2cc206525157b5d9ed195132c83c20f19602661d9d`
- rights_clearance_status: `pending`
- rights declaration: vacía

### Storage

Bucket privado:

- `pci-submissions`

Path:

`workspace/pci-runtime-test/creator/13f30a0c-0a85-4e1f-a48b-291b6c08aec7/submission/a7266afd-7fbf-4ae9-9f43-c37684de33f6/version/52dbb643-60a0-4b84-8e34-44e8a0cf6409/original.mp4`

Se verificó físicamente:

- object count = 1
- Storage size = 2928158
- Storage mimetype = video/mp4
- finalize completado
- Submission pasó `draft → submitted`

---

## 7. Hallazgo/fix crítico: TUS upload

### Problema original

La carga se detenía repetidamente en 32% después del hash, antes del primer byte en Storage.

Se descartaron:

- reserva DB
- signed token generation
- Storage object existing
- finalize
- cache del módulo después de instrumentar servidor no-store

El frontend originalmente dependía de:

`https://esm.sh/tus-js-client@4.3.1`

Eso introducía un componente externo justo antes de iniciar TUS.

### Solución aplicada

Commit de branch:

`96fe4d1247b07eda61afbd3177d5daffdc60bacb`

Mensaje:

`PCI 1O: replace external tus client with native signed TUS uploader`

`creator-portal/upload-client.js` ya no depende de `esm.sh` / `tus-js-client`.

Se implementó TUS nativo contra Supabase Storage:

- signed endpoint `/storage/v1/upload/resumable/sign`
- `x-signature` en requests
- `Tus-Resumable: 1.0.0`
- POST create
- Location persistence
- HEAD resume / Upload-Offset
- PATCH chunks
- localStorage para URL TUS resumible por version ID
- `x-upsert:false`
- mismo bucket/path privado

Después de este cambio, la V1 subió y finalizó correctamente.

---

## 8. Estado final del cambio de frontend

Durante la validación se usó temporalmente un cache-bust sobre el import de `upload-client.js` para forzar módulos frescos.

Antes del cierre final ese cache-bust fue retirado. El import volvió a:

```js
} from '../upload-client.js';
```

El cambio que sí se conserva en `creator-portal/works/works.js` es el fix funcional de `performUpload()`: después de un fallo temprano de metadata/preflight, el botón recupera su label normal en lugar de quedar visualmente en `Procesando...`.

El uploader TUS nativo permanece commiteado desde `96fe4d1`.

No usar `git reset --hard` sobre trabajo local no auditado en futuras sesiones.

---

## 9. Rights negative path validado

La V1 usada para upload era un archivo de laboratorio/descargado, por lo que NO se debía presentar una declaración falsa.

Se probó el formulario dejando sin marcar:

`Confirmo que produje o tengo legitimación para presentar este video como Creator.`

Al pulsar `Enviar declaración`, el browser bloqueó el submit mediante validación nativa `required`.

Verificación DB posterior:

- declaration_count = 0
- no se escribió rights declaration
- Submission seguía `submitted`

Por tanto el negative path de autoría/origen funcionó sin ensuciar evidencia.

---

## 10. Review real y solicitud de V2

Se ejecutó en orden correcto:

1. `pci_api.start_review(...)`
2. `pci_api.request_changes(...)`

Transiciones:

`submitted → under_review → changes_requested`

Review ID:

`6b317f33-9720-41f6-b660-b5eb96ee38a1`

Feedback Creator:

> Para continuar con esta prueba, subí una V2 usando un clip propio o material sobre el que tengas legitimación para presentar y declarar derechos. Conservamos V1 intacta como historial.

Resultados:

- revision_round = 1
- revision_limit = 1
- V1 permanece READY e intacta
- Portal muestra `CAMBIOS SOLICITADOS`
- feedback aparece debajo de V1
- uploader cambia a `Subir V2`
- bloque Rights muestra `No declares V1 si vas a reemplazarla`

UI validada visualmente.

---

## 11. Estado V2 al cierre del checkpoint

Se intentó seleccionar otro MP4 para V2:

`ssstik.io_1785350480261.mp4`

El intento falló MUY temprano en:

`Validando video · 2%`

Mensaje UI:

`No pudimos leer correctamente el video. Probá exportarlo nuevamente como MP4 o MOV.`

Esto ocurrió dentro de `readVideoMetadata(file)` antes de:

- reservar V2
- generar signed token
- upload TUS
- Storage

Verificación DB:

- submission_status = `changes_requested`
- version_count = 1
- max_version_number = 1
- current_version_id sigue siendo V1

Por tanto NO existe V2 fantasma y no hay cleanup pendiente.

### Bug menor de UI descubierto

Cuando falla esta validación temprana, el botón queda visualmente en `Procesando...` en vez de restaurar su estado normal.

Corregido en el cierre de 1O: `performUpload()` restaura el label normal del botón después de un fallo temprano de metadata/preflight. El fix funcional forma parte del diff final auditado.

### Nota de producto/prueba

Para continuar con Rights no conviene usar otro video descargado. La V2 debe ser un clip propio/de laboratorio sobre el que el Creator pueda declarar legitimación real.

---

## 12. Cierre final de Phase 1O

El movimiento que originalmente figuraba como pendiente fue completado.

Cadena final validada en el runtime descartable:

`V2 READY → Rights declaration → Clearance COMPLETE → PRESELECTED → Negotiation → Formal Offer → Creator ACCEPT → Purchase AGREED → Payable READY_TO_PAY → Payout CONFIRMED → Payable PAID → Rights ACTIVE → Asset PROVISIONING → Worker physical copy → Asset AVAILABLE → Submission ACQUIRED → Purchase SETTLED`

Evidencia final principal:

- V2: `70bd1eb0-9f27-4c1f-956c-71e9caf36d09`
- Purchase: `e23015f0-25cd-4164-9680-51d98e8736ef`
- Payable: `25ccf7ac-46c9-47e4-918c-e2f9bca92ff3`
- Payout: `c883c9bf-f3be-4952-ac59-9971c3065390`
- Rights Grant: `c05bed09-44fc-4ad3-9635-c7828acafefc`
- Creative Asset: `504a429e-ca2e-4329-83a5-09d0049742cd`
- final asset SHA-256: `2e80992585a18c9dfcefc7b53a81ddb1c6b0fbee100539613c268d25142dda8d`
- final size: `2434338` bytes
- final MIME: `video/mp4`
- asset status: `available`
- Submission final: `acquired`
- Purchase final: `settled`
- Rights final: `active`

El Worker realizó una copia física server-side entre buckets privados, verificó metadata del objeto destino y preservó el objeto fuente V2.

Producción `cuuzsbhpjmjbbnghtiny` permaneció sin mutaciones.

Los límites de lifecycle quedaron demostrados:

- preselection ≠ purchase;
- Formal Offer SENT ≠ purchase;
- Offer acceptance ≠ Rights ACTIVE;
- payment destination confirmation ≠ payment;
- Payout initiated ≠ confirmed payment;
- Rights ACTIVE solo después de Payable PAID;
- acquisition solo después de promoción física verificada.

---

## 13. Follow-ups no bloqueantes

Phase 1O core runtime está cerrada.

Quedan como trabajos separados:

- SMTP/custom invitation transport real;
- revisión de leaked-password protection en Auth del proyecto descartable;
- mantener documentado que INFO `RLS enabled no policy` es deny-all intencional;
- definir scheduler/runner permanente para `pci-worker` antes de un piloto externo;
- security review específica antes de exponer el Creator Portal a un piloto externo;
- probar explícitamente reanudación TUS después de una interrupción real si se exige como gate de piloto;
- cubrir por HTTP variantes Rights negativas de resubmit/flag que no formaron parte del happy path final;
- cubrir por HTTP variantes de payout partial/failed/reversed que no formaron parte del happy path final.

---

## 14. Reglas de seguridad para continuar

- NO tocar producción.
- NO mergear `master`.
- NO crear PR/merge salvo instrucción explícita.
- NO pedir/mostrar valores de secrets.
- `PCI_INVITATION_TOKEN_KEY` fue eliminado y NO debe reintroducirse.
- No volver a poner raw PCI invitation token en URL/logs/browser.
- Normal Creator login sigue siendo Magic Link-only; password login es solo harness runtime.
- No falsear Rights declarations para pasar tests.
- Preselection NO equivale a adquisición.
- Rights solo se activan después de pago según lifecycle congelado.

---

## 15. Checkpoint corto para pegar en un nuevo chat

> Protocol Creative Insights Phase 1O está COMPLETA en `feature/protocol-creative-insights-backend`, usando exclusivamente el Supabase descartable `dgpmdqmdwqyiwhkbiakd`; producción `cuuzsbhpjmjbbnghtiny` no fue tocada. La cadena real llegó hasta V2 READY → Rights/Clearance → PRESELECTED → Negotiation → Formal Offer → Creator ACCEPT → Purchase/Payable → payout sintético confirmado → Payable PAID → Rights ACTIVE → Worker physical Storage promotion → Asset AVAILABLE → Submission ACQUIRED → Purchase SETTLED. V2 `70bd1eb0-9f27-4c1f-956c-71e9caf36d09`, Purchase `e23015f0-25cd-4164-9680-51d98e8736ef`, Asset `504a429e-ca2e-4329-83a5-09d0049742cd`. `works.js` conserva únicamente el fix funcional de restauración del botón; el cache-bust temporal ya fue retirado. `runtime-test-admin` queda como harness explícitamente fail-closed al project ref descartable. SMTP/Auth/scheduler y las variantes HTTP TUS-resume, Rights negativas y payout partial/failed/reversed quedan como follow-ups no bloqueantes.
