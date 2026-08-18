# Espejo Fotos — Estado de implementación

> **Propósito:** Contexto técnico de lo ya construido para que agentes futuros retomen el trabajo sin releer todo el chat.  
> **Complementa:** `docs/ESPEJO-FOTOS-CONTEXTO.md` (negocio, MVP, hardware, plan por fases).  
> **Última actualización:** 2026-08-07  
> **Repo:** `FotoMirror/` (desarrollo en **Windows nativo**, no WSL)

---

## Resumen

Prototipo funcional **Fase A + captura tether PTP 2**: app Electron + React + TypeScript con flujo completo de foto, wizard de 3 pasos (carpeta → preview → modo captura), filtros, guardado local, QR en LAN y **build portable Windows**.

**Hardware / captura actual:**
- Espejo físico (mini PC Windows); display **1080×1920** portrait.
- Sony α6400: **USB PC remoto + PTP 2** (`tether-ptp2`) para JPEG nativo (~MB).
- Preview: **HDMI → capturadora UVC** (p. ej. USB3 Video). El preview se ve peor que la foto final (compresión de capturadora); es esperado.
- Imaging Edge **no** requerido en runtime (debe estar cerrado; compite por USB).
- Detalle técnico tether: `docs/TETHER-CAPTURA.md`.
- App portable: `app/release/Espejo Fotos-0.1.0-portable.exe` (rebuild para incluir helper).

---

## Estructura del repositorio

```
FotoMirror/
  app/                    ← Electron + React + Vite + TypeScript
    electron/
      main.ts             ← ventana, IPC, save/import foto, tether, photo server
      preload.ts          ← bridge electronAPI
      tetherBridge.ts     ← proceso helper PTP 2
      photoServer.ts      ← HTTP estático fotos (puerto 8787)
    resources/tether-ptp2/ ← tether-ptp2.exe (extraResources)
    src/
      App.tsx             ← orquestación fases + wizard 3 pasos
      components/         ← pantallas y selectores
      hooks/              ← cámara, compositor (res. nativa), filtros
      lib/                ← appConfig, filters, sessionConfig
  native/tether-ptp2/     ← helper C++ PTP 2 / WIA
  docs/
    TETHER-CAPTURA.md     ← arquitectura tether + operación cámara
  eventos/                ← (legado / assets; wizard actual usa carpeta libre)
  docs/
    ESPEJO-FOTOS-CONTEXTO.md   ← requisitos y plan original
    IMPLEMENTACION-ESTADO.md   ← este archivo
    TETHER-CAPTURA.md          ← tether PTP 2 + cables + operación
  .vscode/settings.json   ← no auto-abrir localhost:5173 en navegador
```

**Importante:** `package.json` está en `app/`, no en la raíz. Comandos siempre desde `cd app`.

---

## Cómo ejecutar

```powershell
cd app
npm install
npm run dev          # Electron + Vite (ventana del espejo)
npm run typecheck    # TypeScript
npm run dist         # Build Windows portable → app/release/
npm run dev:web      # solo UI en navegador (sin guardar en eventos/)
```

- **Node.js 20+**, Windows 10/11.
- No abrir `http://localhost:5173` en el navegador mientras corre la app: compite por la cámara con Electron.
- Vite: `server.open: false` en `vite.config.ts`.
- Cursor: `.vscode/settings.json` ignora auto-forward del puerto 5173.
- **Build para el espejo:** `npm run dist` genera `release/Espejo Fotos-0.1.0-portable.exe` (~73 MB). Ver `app/README.md` sección «Build para el espejo».
- En producción, `eventos/` se empaqueta en `resources/eventos` y se sirve en `http://127.0.0.1:8788`.

---

## Flujo de la aplicación

### Fases (`AppPhase`)

| Fase | Pantalla | Descripción |
|------|----------|-------------|
| *(wizard)* | `SetupWizard` | Configuración antes del evento |
| `idle` | `IdleScreen` | Preview + filtros + «Tomar foto» |
| `countdown` | `CountdownScreen` | 3-2-1 configurable |
| `review` | `ReviewScreen` | Confirmar o repetir |
| `share` | `ShareScreen` | QR para descarga (solo Electron) |

### Wizard de operador (3 pasos)

1. **Carpeta** — diálogo Electron; fotos confirmadas van ahí (`FolderSelector`).
2. **Cámara** — `videoinput` (capturadora HDMI / UVC); preview detrás del panel.
3. **Captura** — **Tether USB** (PTP 2) o **Preview HDMI**; Reintentar PTP + Probar captura.

Al pulsar **Comenzar**:
- Guarda sesión (`cameraDeviceId`, `photosDir`, `captureMode`).
- Arranca servidor HTTP de fotos (`startPhotoServer`).
- Si tether: Connect PTP (quita “Conectando…” en HDMI).
- Entra a fase `idle`.

Botón **Configuración** vuelve al wizard.

### Flujo invitado

1. Elegir filtro / segundos.
2. Tomar foto → countdown → tether JPEG nativo **o** frame preview (fallback).
3. Review (badge nativo / fallback) → confirmar o repetir.
4. Guardado en `{photosDir}/foto-{timestamp}.jpg`  
   - Tether + filtro Normal: renombra `DSC….JPG` → un solo archivo (~MB).  
   - Fallback / filtro: canvas a resolución del origen.
5. Share con QR (`http://{IP}:8787/…`).

En `dev:web` (sin Electron): sin tether ni QR; descarga en navegador.

---

## Stack y dependencias

| Capa | Tecnología |
|------|------------|
| UI | React 19, TypeScript |
| Desktop | Electron 35, vite-plugin-electron |
| Build | Vite 6 |
| QR | `qrcode` (generación en renderer) |
| Cámara | `navigator.mediaDevices.getUserMedia` |
| Filtros / composición | Canvas 2D + CSS `filter` |
| Servidor fotos | `http` nativo Node (main process), puerto **8787** |

---

## Módulos clave

### Cámara — `hooks/useCamera.ts`

- Enumera dispositivos, pide permiso si hace falta (`listVideoInputs`).
- Abre stream por `deviceId` exacto.
- Errores mapeados a español (`NotReadableError`, permisos, etc.).
- `captureFrame(preset)` usa `captureFilteredFrame` de `lib/filters.ts`.
- `pickDefaultDeviceId`: prioridad → sesión guardada → `preferredCameraLabel` en config → Sony/Imaging Edge → primera cámara.
- **Sin `StrictMode`** en `main.tsx` (evita doble montaje de cámara en dev).

### Filtros — `lib/filters.ts`

Presets estilo Instagram (10): Normal, Clarendon, Gingham, Juno, Lark, Ludwig, Valencia, X-Pro II, Nashville, Moon.

- Preview: `cssFilter` en `<video style={{ filter }}>`.
- Captura: canvas con `ctx.filter` + ajustes opcionales (`warmth`, `fade`, `vignette`).
- `resolveFilters(config.filters)`: si `filters: []` en config → todos los presets; si hay lista → merge con builtins por `id`.

Miniaturas: `hooks/useFilterThumbnails.ts` + `components/FilterBar.tsx`.

### Plantillas — `hooks/usePhotoCompositor.ts`

- Superpone marco y logo sobre foto capturada (canvas).
- Rutas desde `resolveEventAssets(config, eventSlug)` en `lib/eventConfig.ts`.
- Soporta `frameFile` / `logoFile` en config (SVG o PNG).

### Eventos — `lib/eventConfig.ts`

- `listEvents()` → IPC `list-events` en Electron.
- `loadEventConfig(slug)` → fetch `/eventos/{slug}/config.json` (middleware Vite en dev).
- Assets servidos en dev por plugin `serveEventos` en `vite.config.ts`.

### Sesión — `lib/sessionConfig.ts`

Claves `localStorage`:
- `espejo-fotos:session` (JSON completo)
- `espejo-fotos:camera-device-id`
- `espejo-fotos:event-slug`

### Electron — `electron/main.ts`

| IPC | Función |
|-----|---------|
| `list-events` | Escanea `eventos/*/config.json` |
| `get-event-config` | Lee `config.json` del slug (producción sin Vite) |
| `get-eventos-base-url` | `http://127.0.0.1:8788` en pack; vacío en dev |
| `start-photo-server` | HTTP en `0.0.0.0:8787` sirve `fotos/` del evento |
| `save-photo` | Escribe JPEG + devuelve `downloadUrl` |
| `get-event-assets-path` | Ruta filesystem del evento |
| `open-external` | Abre URL en navegador del sistema |

Ventana: **fullscreen** siempre; **kiosk** en producción (`!isDev`).

En producción: `eventsServer.ts` sirve assets en `127.0.0.1:8788`; `eventos/` va en `resources/eventos` (electron-builder `extraResources`).

---

## Configuración por evento (`eventos/{slug}/config.json`)

Ejemplo actual (`demo`):

```json
{
  "name": "Evento Demo 32",
  "slug": "demo",
  "countdownSeconds": 3,
  "captureWidth": 1280,
  "captureHeight": 720,
  "texts": { "idleButton": "...", "reviewConfirm": "...", ... },
  "defaultFilterId": "normal",
  "preferredCameraLabel": "Imaging Edge",
  "frameFile": "marco.svg",
  "logoFile": "logo.svg",
  "filters": []
}
```

| Campo | Uso |
|-------|-----|
| `preferredCameraLabel` | Fragmento del nombre para preseleccionar cámara (ej. Sony) |
| `frameFile` / `logoFile` | Archivos en la carpeta del evento |
| `filters` | `[]` = todos los presets Instagram; o subset por `id` |
| `texts.shareHint` / `shareDone` | Pantalla QR (opcionales, hay defaults) |

---

## MVP v1 — checklist vs implementado

| Requisito | Estado |
|-----------|--------|
| Fotos individuales | ✅ |
| Countdown visible | ✅ |
| Preview en vivo | ✅ (HDMI → capturadora UVC) |
| Filtros tipo Instagram | ✅ (CSS + canvas; no LUT archivo) |
| Carpeta de salida (wizard) | ✅ |
| Modo captura tether / preview | ✅ (wizard paso 3 + fallback) |
| JPEG nativo Sony (PTP 2) | ✅ (`tether-ptp2`; ~MB) |
| Modo kiosco | ✅ parcial (fullscreen + kiosk en build; falta Assigned Access / auto-inicio Windows) |
| Guardado local | ✅ (`foto-*.jpg` en carpeta elegida) |
| QR red local | ✅ (Electron + 8787; validar A5 en espejo) |
| Offline en runtime | ✅ |
| Build portable Windows | ✅ (`npm run dist`; incluir `tether-ptp2` en resources) |
| Imaging Edge en runtime | ❌ no requerido (debe estar cerrado) |
| Impresión | ❌ v2 |
| AR / filtros cara | ❌ pospuesto |

---

## Plan de implementación (lo que falta)

> **Cómo usar esta sección:** marcar `[x]` al completar; añadir una línea en **Registro de avances** al final de cada ítem.  
> **Orden:** fases de arriba hacia abajo. No empezar Fase D/E si A–C no están validadas en el espejo físico.

### Fase A — Puesta en marcha en el espejo (ahora)

Objetivo: la app corre estable en la mini PC del espejo con la cámara que haya.

| # | Tarea | Estado | Notas |
|---|--------|--------|-------|
| A1 | Copiar portable al espejo y ejecutar | ✅ | Portable abre en mini PC (2026-08-05) |
| A2 | Detectar cámara en Windows del espejo | ✅ | Puede tomar fotos (cámara OK) |
| A3 | Completar wizard (evento + cámara) en el espejo | ✅ | Flujo operativo |
| A4 | Flujo idle → countdown → review → guardar | ✅ | Confirma que toma y guarda fotos |
| A5 | Probar QR en LAN / hotspot del espejo | ⬜ | Firewall puerto **8787**; misma WiFi teléfono–PC |
| A6 | Documentar problemas encontrados en espejo | 🔄 | Ajuste UI a display pendiente |

**Criterio de done:** un invitado de prueba toma foto, confirma y descarga por QR desde el teléfono.

---

### Fase B — Calidad de imagen y captura

Objetivo: dejar de depender del preview USB comprimido para la foto final.

| # | Tarea | Estado | Notas |
|---|--------|--------|-------|
| B1 | Integrar capturadora HDMI | ✅ | En uso (USB3 Video); preview UVC en wizard |
| B2 | `captureWidth`/`Height` 1920×1080 | ✅ | Defaults; aplica al frame preview / fallback |
| B3 | Disparo alta resolución Sony (USB / PTP) | ✅ | `tether-ptp2` PTP **2**; JPEG nativo ~MB; ver `TETHER-CAPTURA.md` |
| B4 | `captureMode: preview \| tethered` + fallback | ✅ | Wizard paso 3; aviso en review; rename DSC→foto |

**Criterio de done:** foto guardada nítida (JPEG nativo Sony vía tether) con filtro opcional; preview HDMI solo para espejo / fallback.

**Nota:** no cambiar dial Movie↔foto por PTP en cuenta regresiva (α6400 dial físico; HDMI negro en Movie). Dejar dial en A/M.

---

### Fase C — Operación de evento (kiosco Windows)

Objetivo: el espejo se enciende y queda listo sin intervención técnica.

| # | Tarea | Estado | Notas |
|---|--------|--------|-------|
| C1 | Auto-inicio de la app al encender Windows | ⬜ | Acceso directo en carpeta Inicio o tarea programada |
| C2 | Desactivar suspensión / apagado de pantalla | ⬜ | Plan de energía “alto rendimiento” |
| C3 | Assigned Access / usuario kiosco (sin escritorio fácil) | ⬜ | Ver `ESPEJO-FOTOS-CONTEXTO.md` |
| C4 | Atajo operador para salir / volver a wizard | ✅ | Toque largo esquina sup. izq. + PIN `2580`; badges técnicos solo en wizard o con PIN |
| C5 | Icono de app propio (no default Electron) | ✅ | `app/build/icon.ico` (opción espejo); `win.icon` en electron-builder |

**Criterio de done:** encender PC → app en fullscreen → listo para invitados; operador puede salir con atajo.

---

### Fase D — Contenido y operación por evento

Objetivo: preparar un evento real sin tocar código.

| # | Tarea | Estado | Notas |
|---|--------|--------|-------|
| D1 | Plantilla de carpeta evento (`eventos/_plantilla/`) | ⬜ | config + marco.png + logo.png + fotos/.gitkeep |
| D2 | Segundo evento de prueba (ej. `boda`) con PNG reales | ⬜ | Validar wizard lista varios eventos |
| D3 | Exportar / backup fotos a USB desde la app | ⬜ | Botón operador o script post-evento |
| D4 | Hotspot documentado (router o Windows Mobile Hotspot) | ⬜ | Instrucciones en docs para QR offline de venue |

**Criterio de done:** operador crea carpeta de evento, copia assets, arranca wizard, cierra con backup en USB.

---

### Fase E — Mejoras de producto (opcional / v1.1)

| # | Tarea | Estado | Notas |
|---|--------|--------|-------|
| E1 | LUT desde archivo (`.cube` / PNG) | ⬜ | Solo si CSS presets no bastan |
| E2 | AR / máscaras (MediaPipe FaceMesh) | ⬜ | Cara perro, etc.; evaluar CPU mini PC |
| E3 | Impresión en evento | ⬜ | **v2** |
| E4 | WhatsApp / Instagram | ⬜ | **v2** |
| E5 | GIF / burst / video | ⬜ | **v2** |

---

## Registro de avances

> Formato: `YYYY-MM-DD | ID | qué se hizo | resultado`

| Fecha | Ítem | Avance | Resultado |
|-------|------|--------|-----------|
| 2026-06-03 | — | Migración WSL → Windows; cámara Electron estable | ✅ |
| 2026-06-05 | — | Wizard evento+cámara; filtros Instagram; QR 8787 | ✅ |
| 2026-08-05 | — | Build portable `npm run dist`; eventsServer prod; espejo físico en casa | ✅ |
| 2026-08-05 | A1–A4 | Portable en espejo; cámara detectada; toma y guarda fotos | ✅ |
| 2026-08-05 | UI | Layout portrait 1080×1920: controles arriba; botón Salir; chrome operador | ✅ |
| 2026-08-05 | A5 | QR en LAN del espejo | ⬜ pendiente |
| 2026-08-07 | B3/B4 | PTP 2 helper + wizard captura; JPEG nativo; sin DSC duplicado | ✅ |
| 2026-08-07 | — | Confirmado α6400 = PTP 2 (no v3); Imaging Edge fuera de runtime | ✅ |

---

## Problemas conocidos y soluciones

### Cámara en uso / preview falla

- Cerrar pestaña navegador en `localhost:5173`.
- Cerrar app Cámara de Windows, Zoom, Teams, OBS.
- Sony: menú **USB Connection → PC Remote**, **Ctrl w/ Smartphone → Off**, cable **Micro USB de datos**.
- Imaging Edge Webcam no tiene icono en Inicio; aparece como **Sony Camera (Imaging Edge)** en Configuración → Cámaras.
- **En la mini PC del espejo** hay que instalar Imaging Edge Webcam aparte (no basta con haberlo instalado en la laptop de desarrollo).

### Sony solo como disco USB

- Modo incorrecto: debe ser PC Remote, no almacenamiento masivo.

### Calidad de imagen baja en el preview HDMI

- Esperado: la capturadora comprime; poca luz + Auto/ISO alto empeora.
- La **foto final tether** debe pesar ~MB (no ~300 KB). Si pesa ~300 KB → estuvo en fallback preview.
- Dial en **A/M** (foto). Modo **Movie** suele dejar el HDMI negro con PC remoto + capturadora.
- Mitigación foto: modo Tether + buena luz. Imaging Edge **cerrado**.

### Calidad baja por Imaging Edge Webcam (legado)

- Stream USB tipo webcam (~720p). Ya no es el camino de producción.
- Preferir HDMI capturadora + tether PTP 2.

### QR no funciona en dev:web

- Esperado: servidor HTTP solo en proceso main de Electron.

### QR en teléfono no descarga

- PC y teléfono deben estar en la **misma red WiFi**.
- Firewall Windows puede bloquear puerto **8787** — permitir en red privada.
- URL usa IP LAN (`getLocalIp()`), no `localhost`.

### Compartir archivos por red Windows

- Marcar red como **privada**.
- Credenciales = usuario/contraseña de la PC **destino** (`PC\usuario` o correo Microsoft).
- Alternativa rápida: copiar el `.exe` por USB.

---

## Decisiones de implementación

| Fecha | Decisión |
|-------|----------|
| 2026-06-03 | Desarrollo migrado de WSL2 a **Windows nativo** |
| 2026-06-03 | `server.open: false`; no usar navegador para dev |
| 2026-06-03 | Quitado StrictMode (cámara estable en dev) |
| 2026-06-05 | Wizard 2 pasos: evento + cámara |
| 2026-08-05 | Empaquetado con **electron-builder** (portable + dir); `eventos/` en `extraResources` |
| 2026-08-05 | En producción, assets de evento vía `eventsServer` `127.0.0.1:8788` |
| 2026-08-05 | Plan por fases A→E: espejo → calidad → kiosco → operación → v1.1/v2 |
| 2026-08-07 | Wizard 3 pasos: carpeta + cámara preview + modo captura |
| 2026-08-07 | Disparo kiosco = **Camera Remote Command PTP 2** (`tether-ptp2`), no Imaging Edge |
| 2026-08-07 | Confirm tether: renombrar DSC→`foto-*.jpg` (un archivo); compositor a res. nativa |

---

## Próxima acción concreta

1. ~~A1–A4~~ ✅ · ~~B1–B4 captura tether~~ ✅  
2. **A5:** Probar QR en LAN del espejo.  
3. Rebuild portable con `resources/tether-ptp2` y copiar al espejo.  
4. Fase C (kiosco: auto-inicio, etc.).

---

## Notas para agentes

- Idioma del usuario: **español**.
- No crear commits salvo que lo pida.
- Cambios mínimos; UI touch-first (botones grandes, 43").
- `npm install` y `npm run dev` desde **`app/`**.
- Leer también `app/README.md` para comandos rápidos.
- Documento de negocio/plan: `docs/ESPEJO-FOTOS-CONTEXTO.md`.
- Tether / PTP / cables: `docs/TETHER-CAPTURA.md`.
- Helper: `native/tether-ptp2/` → build a `app/resources/tether-ptp2/tether-ptp2.exe`.

---

## Archivos principales (mapa rápido)

| Archivo | Rol |
|---------|-----|
| `app/src/App.tsx` | Estado global, fases, wizard 3 pasos, tether/fallback |
| `app/src/components/SetupWizard.tsx` | Carpeta + cámara + modo captura |
| `app/src/components/ReviewScreen.tsx` | Review + badge nativo/fallback |
| `app/src/components/IdleScreen.tsx` | Filtros + botón disparo |
| `app/src/components/ShareScreen.tsx` | QR post-foto |
| `app/src/hooks/useCamera.ts` | Stream preview y frame fallback |
| `app/src/hooks/usePhotoCompositor.ts` | Compose a resolución nativa |
| `app/src/lib/filters.ts` | Presets y pipeline canvas |
| `app/src/lib/sessionConfig.ts` | photosDir, cameraId, captureMode |
| `app/electron/main.ts` | IPC, save/import/delete foto |
| `app/electron/tetherBridge.ts` | Spawn/comandos `tether-ptp2` |
| `app/electron/photoServer.ts` | Servidor descarga LAN (8787) |
| `native/tether-ptp2/` | Helper C++ PTP 2 |
| `docs/TETHER-CAPTURA.md` | Doc tether completa |
| `app/release/` | Build portable (generado, no commitear) |
