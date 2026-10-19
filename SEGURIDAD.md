# Seguridad — Timesheet ICA Geoconsultores

## 1. Exposición histórica

Este repositorio es **público**. Hasta la Fase 0, `.github/workflows/deploy.yml` publicaba `path: '.'` en GitHub Pages, así que cualquier archivo del repo quedaba descargable por URL directa, sin autenticación. Desde la integración de la Fase 0 publica solo `site/`, aunque todo lo trackeado sigue siendo legible en GitHub.

Lo siguiente estuvo publicado y debe considerarse **conocido por cualquiera**:

| Qué | Desde |
|---|---|
| Clave maestra `ICA2026_ADMIN` (`js/app.js`, `index.html`, `GUIA_POWER_AUTOMATE_B1.md`) | commit inicial `7dad5e1` |
| Mapa completo correo → PIN de los 7 consultores, todos `1234` (`js/calendar_form.js`) | commit inicial `7dad5e1` |
| Dataset con nombres, correos `@icageo.cl` y horas por persona (`js/team_data.js`, `data/timesheet_records.json`) | commit inicial `7dad5e1` |

El "ranking confidencial" que el modal de `ICA2026_ADMIN` pretendía proteger se descargaba con un `curl` a `/data/timesheet_records.json`.

**No hay nada que rotar en un sistema externo**: esas credenciales solo controlaban un `style.display` sobre datos que ya se servían públicamente. Se eliminaron como concepto en lugar de reemplazarse.

**No se reescribió la historia de git** (`filter-repo` / BFG): el secreto es público desde hace días, no protege nada externo, y reescribir rompe clones y forks sin ganancia real. Si algún PIN se reutiliza fuera de esta app, hay que cambiarlo en ese otro sistema.

### Reexposición del 2026-10-08

La Fase 0 quedó comprometida en la rama `fase-0-contencion` y no se integró a `main`. El 2026-10-08 se comprometieron en `main` dos commits: `17dc4f5` (dataset al 02-10, 517,0 HH) y `c3115c2` (maestro reconstruido y `sync_sharepoint_master.py`). Esos commits volvieron a publicar el dataset por persona, el Excel maestro y la clave `ICA2026_ADMIN`. El 2026-10-18 se verificó que `/data/timesheet_records.json` respondía 200 en el sitio publicado.

La integración de la Fase 0 aplica estas medidas:

- retira esos archivos del árbol;
- saca el pipeline de ingesta del repo y lo lleva a `Gestion ICA/Timesheet_Pipeline/` (local, con `SHA256SUMS.txt`);
- restringe el despliegue a `site/`.

Se mantiene el criterio de no reescribir la historia de git.

---

## 2. Qué nunca debe entrar al repositorio

| Nunca | Motivo |
|---|---|
| PINs, claves maestras, `data/user_pins.json` | Se entregan al navegador y quedan descargables. Ya cubierto por `.gitignore`. |
| URL de trigger HTTP de Power Automate (`...?sig=...`) | La firma en la URL **es** una credencial bearer. Quien la tenga escribe en la lista. |
| Client secret o certificado de aplicación | Un SPA no puede custodiarlos. Si hace falta uno, la arquitectura está mal. |
| Datos reales del equipo (nombres, correos, horas por persona) | La fuente de verdad es SharePoint, con permisos. El repo solo lleva semilla vacía o anonimizada. |

## 3. Qué sí puede entrar, y por qué

El **`client_id`** y el **`tenant_id`** de la App Registration de Entra ID **sí van al repositorio**. No es una concesión: es el diseño.

OAuth 2.0 (RFC 6749 §2.2) clasifica las aplicaciones de página única como *public clients*: todo su código se entrega al agente de usuario, así que no pueden custodiar un secreto. El `client_id` es un **identificador**, no un autenticador — Entra ID, en la plataforma "Single-page application", no permite siquiera emitir un client secret.

La frontera de seguridad son tres cosas que un atacante con el `client_id` no puede sortear:

1. **Allowlist de redirect URI con coincidencia exacta.** Entra solo entrega el authorization code a una URI registrada. Sin comodines.
2. **PKCE (S256).** El `code_verifier` nunca sale del navegador; un code interceptado es inútil.
3. **Sign-in interactivo** sujeto a MFA, Conditional Access y `Assignment required` del tenant.

---

## 4. Modelo de acceso objetivo

La confidencialidad **no la da el scope de Graph**. Con permisos delegados el acceso efectivo es la intersección de (permiso de la app) ∩ (permisos del usuario en SharePoint): `Sites.ReadWrite.All` delegado no otorga al usuario acceso a nada que no tuviera ya.

La da la configuración de la lista:

```
Timesheet_ICA_2026 → Configuración avanzada → Permisos de nivel de elemento
  Lectura:  "Leer solo los elementos creados por el usuario"
  Creación: "Crear y editar solo los elementos creados por el usuario"
```

Con eso, un consultor que pide `GET /items` recibe **solo sus propias filas**: el servidor no envía las ajenas. No hay ranking que ocultar en pantalla porque los datos de los demás nunca llegan al navegador. Esa es la diferencia con el candado anterior, que solo dejaba de dibujarlos.

---

## 5. Estado actual (tras la Fase 0)

- La app **no autentica**. Lo declara en pantalla en lugar de simular una sesión.
- No hay métricas por persona en el sitio publicado.
- No hay endpoint de escritura configurable. El envío usaba `mode: 'no-cors'`, que descarta el `Content-Type` y resuelve la promesa con respuesta opaca sea 200 o 500: la app afirmaba haber sincronizado sin haber escrito nada.
- Todo texto libre se escapa antes de inyectarse en el DOM (`esc()` en `js/app.js`, `icaEsc()` en `js/calendar_form.js`), y ambas páginas llevan CSP. Esto se hizo **antes** de que exista un token en el navegador: a partir de ese momento un XSS almacenado equivale a robo de token.
- Los PINs, la sesión de admin y el endpoint heredados se purgan de `localStorage` en cada carga (`purgeLegacyCredentials`).

### Deuda conocida

El CSP lleva `'unsafe-inline'` en `script-src` y `style-src` porque `index.html` usa un `<script>` inline (`switchView`), atributos `onclick` y estilos en línea. Retirarlo exige mover ese código a un archivo y sustituir los `onclick` por listeners — pendiente para la Fase 6, donde además se vendoriza MSAL para no depender de CDN.
