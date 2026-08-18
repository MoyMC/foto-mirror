# Espejo fotográfico para eventos — Contexto del proyecto

> **Propósito de este archivo:** Documentar decisiones, requisitos y plan técnico para que agentes futuros (o el desarrollador) retomen el trabajo sin perder contexto.  
> **Última actualización:** 2026-05-25  
> **Ubicación del negocio:** Zacatecas, México

---

## Resumen ejecutivo

El usuario compró un **Magic Mirror Photo Booth** (kit ~USD $1,839) que incluye:

| Componente | Especificación (según proveedor) |
|------------|----------------------------------|
| Espejo | Vidrio 65" |
| Pantalla táctil | 43" (interfaz principal) |
| Mini PC incluida | Intel i5, 8 GB RAM, 256 GB SSD |
| Software incluido | Versión **trial** de “DSLR software” con **marca de agua** en impresiones |
| SO | Windows |
| Pendiente de envío | Impresora y cámara (costos de envío en revisión) |
| Logística | Envío a México, estimado 30–35 días (marítimo) |

**Objetivo:** App **propia**, **100% local/offline** para eventos, con preview en vivo, filtros, plantillas por evento, y entrega digital (QR primero; WhatsApp/Instagram después).

**Stack acordado:** **Electron + React + TypeScript** (UI). Integración cámara/captura posiblemente vía proceso nativo o sidecar (por definir en implementación).

---

## Perfil del desarrollador

- **Fuerte:** Node.js, React, APIs web.
- **Algo de:** Java (APIs), React Native / Expo.
- **Sin experiencia:** Apps de escritorio → conviene empezar con Electron y patrones web; documentar setup Windows explícitamente.

---

## Presupuesto (MXN, referencia 2025–2026)

| Partida | Presupuesto | Notas |
|---------|-------------|--------|
| Mini PC (producción) | ~$8,000 | Solo la PC; no incluye capturadora |
| Cámara | ~$16,000 | Objetivo: Sony α6400; kit vs body por confirmar |
| Lente | Por definir | Ver sección Cámara |
| Capturadora HDMI | ~$800–$3,000 | No estaba en el plan inicial; **requerida** para preview en vivo fiable |
| Cables/accesorios | ~$500–$1,500 | Micro HDMI → HDMI, USB-C, baterías extra, etc. |

---

## MVP — Alcance por versiones

### v1 (primera versión en producción)

- [ ] Solo **fotos individuales** (no GIF/burst/video).
- [ ] Botón en pantalla → **cuenta regresiva** visible (ej. 3–2–1).
- [ ] **Preview en vivo** en pantalla 43".
- [ ] Filtros tipo Instagram (LUT/presets), **marcos PNG**, **logo** por evento (esquina).
- [ ] **Plantilla por evento** (carpeta con `config.json`, assets).
- [ ] **Modo kiosco** pantalla completa (sin salir a Windows fácilmente).
- [ ] Guardado local por sesión/evento.
- [ ] **QR** para descarga en **red local** (hotspot/WiFi del espejo → mini servidor HTTP en la PC).
- [ ] Operación **offline** obligatoria para captura y QR local.
- [ ] Duración típica de evento: **2–6 horas** (no bloqueante si se configura energía/ventilación).

### v2 (siguiente)

- [ ] Impresión en evento (cola, driver Windows).
- [ ] WhatsApp / Instagram (requiere internet o flujo asistido).
- [ ] GIF, burst, video corto.
- [ ] IA (quitar fondo, etc.).

---

## Flujo de usuario (v1)

1. Invitado se acerca al espejo.
2. Toca **“Tomar foto”**.
3. Cuenta regresiva en pantalla.
4. Captura (cámara) + preview con filtro/marco.
5. Confirmar / repetir.
6. Opcional: escanear **QR** para llevarse la foto (WiFi local del booth).

## Flujo del operador (antes del evento)

1. Crear carpeta de evento con plantilla y logo.
2. Probar cámara, enfoque, luz, preview e impresión (cuando exista v2).
3. Activar modo kiosco.
4. Al cerrar: backup (SSD externo recomendado).

---

## Arquitectura técnica (objetivo)

```
[Pantalla táctil 43"] ←→ [App Electron - React UI]
                              ↓
                    [Motor filtros / plantillas]
                              ↓
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
  [Capturadora HDMI]   [Sony USB / SDK]    [Servidor QR local]
         ↑                    ↑
  [HDMI clean out]      [Disparo / transferencia RAW/JPEG]
         ↑
  [Sony α6400 (+ lente)]
```

### Preview en vivo (decisión importante)

La α6400 **no es una webcam**. Para preview fluido en 43" se recomienda:

1. **Salida HDMI** desde la cámara (modo limpio sin overlays si es posible).
2. **Capturadora HDMI → USB 3** en la mini PC (aparece como dispositivo de video UVC).
3. La app muestra ese stream y aplica filtros/overlays en tiempo real (Canvas/WebGL).

El **disparo de foto en alta resolución** va por **USB + Camera Remote Command (PTP 2)** embebido en FotoMirror (`tether-ptp2`). Imaging Edge Remote **no** se usa en el kiosco (compite por USB). Detalle: `docs/TETHER-CAPTURA.md`.

### Entrega digital sin internet en el venue

| Canal | Offline puro | Con WiFi del salón / hotspot del espejo |
|-------|----------------|-------------------------------------------|
| QR a foto | Sí (HTTP en LAN 192.168.x.x) | Sí |
| WhatsApp / Instagram | No automático al invitado | v2 o manual por operador |

---

## Estructura de carpetas por evento (propuesta)

```
eventos/
  {slug-evento}/
    config.json       # countdown, textos, resolución UI
    logo.png
    marco.png         # PNG transparente
    filtros.json      # LUT / preset ids
    fotos/            # salida por sesión
```

---

## ¿Qué es el “DSLR software” del proveedor?

Software comercial de **cabina fotográfica** (photobooth) que controla cámaras DSLR/mirrorless por USB, muestra preview, aplica plantillas e imprime. Ejemplos de categoría: DSLRBooth, Sparkbooth, Breeze, Darkroom Booth, etc.

El kit trae **trial con watermark** → motivación principal para **app propia**.

---

## Cámara — Recomendación y alternativas

### Opción principal (elegida por el usuario): **Sony Alpha α6400**

| Ventaja | Detalle |
|---------|---------|
| Autofoco | Muy bueno (Real-time Eye AF) para rostros en evento |
| Calidad foto | 24 MP APS-C, excelente para impresión futura |
| Ecosistema | Lentes E-mount amplias |
| Uso booth | HDMI + USB tethering bien documentado |
| Precio ref. MX | Kit 16-50: ~$17,889 (oferta Profoto); kit 18-135: ~$22,799–$23,699 |

**Lente:** Comprar **kit 16-50 mm** si el presupuesto aprieta; medir distancia espejo–sujeto al montar. **18-135** solo si necesitas zoom flexible sin cambiar posición del espejo.

**Cables:** Micro HDMI → HDMI hacia capturadora; cable USB para control/descarga.

### Alternativa misma marca (más barata): **Sony ZV-E10 (kit 16-50)**

| vs α6400 | |
|----------|--|
| Precio ref. | ~$15,499 MXN (Profoto) — ahorra ~$2k+ vs a6400 kit |
| Preview USB | Más fácil como “webcam” USB-C (menos dependencia temporal de capturadora) |
| Pierde | Sin visor electrónico; AF ráfaga inferior; cuerpo más “vlog” |

**Para este proyecto (HDMI + capturadora):** α6400 sigue siendo la mejor opción si el presupuesto lo permite por **AF y robustez en eventos**.

### Alternativa otra marca: **Canon EOS R50 (kit 18-45)**

| vs α6400 | |
|----------|--|
| Precio ref. | ~$14,499–$14,799 MXN (Fotomecánica) |
| USB | UVC / webcam nativa (útil para prototipos) |
| Contra | Montura RF ≠ E-mount; otro ecosistema de lentes |

**Solo recomendar** si el usuario no ha comprado Sony y quiere ahorrar; si ya decidió α6400, no cambiar sin razón.

### No recomendado para este caso

- Cámaras sin salida HDMI limpia o sin control USB.
- Webcams genéricas (calidad e impresión futura limitadas).

---

## Mini PC — Amazon México (listing B0DJW39V9T)

**URL:** https://www.amazon.com.mx/dp/B0DJW39V9T

**Importante:** El título de la página dice “SER8 / 8745HS / 32 GB / 1 TB”, pero la variante **preseleccionada** en “Tamaño” suele ser **`SER5 MAX 24G/500G/7735HS`** (mismo ASIN). Siempre confirmar el texto bajo **Tamaño:** antes de pagar. Hay reseñas de gente que recibió otro modelo.

### Variantes en ese listing (9 opciones)

| Variante (Tamaño) | ASIN | Veredicto para el espejo |
|-------------------|------|---------------------------|
| **SER5 MAX 24G/500G/7735HS** | B0DJW39V9T | **Comprar esta** si está ~$8–9k MXN |
| R7-8745HS 24GB+1TB | B0DJW1P8QK | Buena 2ª opción (GPU 780M + 1 TB) si el precio es similar |
| EQR7 24G/500G/7735HS | B0DL9LPVXK | Alternativa (mismo CPU 7735HS); comparar precio |
| SER5 32G/1TB/5825U | B0C54VK258 | Evitar (CPU 5825U más débil) |
| SER5 32G/500G/5825U | B0C4TKTW2D | Evitar (5825U) |
| EQR6 24G/500G/6600U | B0CJB9T7N7 | Evitar (GPU 660M más débil) |
| SER9 MAX / Pro / 64G | varios | Evitar (sobre presupuesto) |

**No confundir** el título “SER8” con la variante elegida en el selector.

---

## Mini PC (~$8,000 MXN) — Búsqueda y GPU

### ¿Se le puede montar tarjeta gráfica dedicada a una mini PC?

**En la mayoría de mini PCs compactas (Beelink, Kamrui, etc.): NO.**

- No traen ranura **PCIe x16** para GPU de escritorio.
- La RAM suele ser **soldada** (no ampliable en muchos modelos).
- **eGPU por Thunderbolt** casi nunca existe en este rango de precio.

**Opciones realistas:**

1. **Comprar mini PC con iGPU potente** (AMD Radeon 680M / 780M) — suficiente para filtros 1080p en Electron.
2. **Mini PC “gaming” con GPU dedicada ya integrada** (más caras, a menudo >$12k MXN).
3. **PC SFF / ITX** con case que sí acepte GPU (presupuesto y espacio dentro del espejo por validar).

**Conclusión para el proyecto:** Priorizar **Ryzen 7 6800H/6800U (Radeon 680M)** o similar; no planear “agregar GPU después” en una mini genérica.

### Candidatos (precios orientativos México — verificar antes de comprar)

| Modelo | Specs | Precio ref. | Veredicto |
|--------|-------|-------------|-----------|
| **Beelink SER5 MAX** (6800H/6800U) | 24–32 GB LPDDR5, 500 GB NVMe, Radeon 680M, Win 11 | ~$8,999 (Compuexpress, etc.) | **Mejor opción** — ~$1k sobre presupuesto pero 32 GB y GPU fuerte |
| **Beelink SER5 PRO** | Ryzen 7, 16 GB, 1 TB | Ver Lapson México | Buena si aparece ≤$8,500 |
| **Beelink EQR6** (6600U) | 24 GB, 500 GB, Radeon 660M | Variable importación | Alternativa si SER5 no hay stock |
| **Kamrui 11 Pro** (4300U) | 16 GB, 512 GB | ~$6,299 Amazon MX | **Evitar para producción** — muy justa para preview+filtros |
| Mini PC del kit (i5/8 GB) | — | Incluida | Respaldo o máquina de desarrollo |

**Requisitos mínimos confirmados:**

- 16 GB RAM (32 GB ideal).
- 512 GB SSD NVMe.
- USB 3.0+ **libres** (capturadora + cámara).
- Salida de video para pantalla 43" (HDMI o DP).
- Windows 11 Pro preferible (kiosco).

**Negociación de presupuesto:** Subir ~$1,000 a **SER5 MAX** o buscar oferta **SER5 PRO 16 GB** en Mercado Libre / Amazon MX con MSI de pago.

---

## Capturadora HDMI — Por qué hace falta y qué comprar

**Motivo:** El preview en vivo en el espejo usa el **video HDMI** de la cámara; la mini PC lo recibe como webcam vía capturadora.

### Tier recomendado

| Producto | Precio ref. MX | Notas |
|----------|----------------|--------|
| **Elgato Cam Link 4K** | ~$2,435 (Fotomecánica) | 1080p60, USB 3, confiable; **requiere USB 3** (no USB 2) |
| **Steren capturadora HDMI→USB** | ~$800 (steren.com.mx) | Económica; en Windows a menudo **1080p30** — puede bastar para v1 |
| **Genérica UVC “HDMI to USB 1080”** | ~$1,500–$2,500 ML | Revisar reviews; muchas clones son 1080p30 |
| **Metrocámaras / CAP-2 Datavideo** | Consultar | Perfil broadcast, 1080p60 |

### Compras adicionales

- Cable **Micro HDMI (tipo D) → HDMI** hacia capturadora (longitud según gabinete).
- Si la capturadora es USB-C, adaptador/hub **USB 3** con buena alimentación.
- Evitar conectar capturadora en **USB 2** (Elgato Cam Link no funciona).

### Validación al recibir hardware

1. Probar en **OBS** o Cámara de Windows que el dispositivo entregue 1080p estable.
2. Medir **latencia** ojo-hand (cuenta regresiva alineada con preview).

---

## Lista de compra sugerida (checklist)

- [ ] Mini PC (SER5 MAX o equivalente Ryzen 7 + 16 GB mínimo)
- [ ] Sony α6400 kit 16-50 (o body + lente elegido)
- [ ] Capturadora HDMI USB 3
- [ ] Cable Micro HDMI → HDMI
- [ ] Cable USB datos (no solo carga) para cámara
- [ ] 2× batería NP-FW50 + cargador (eventos largos)
- [ ] SSD externo USB 3 para backup post-evento
- [ ] (Opcional v1) Router pequeño o hotspot USB para QR WiFi

---

## Plan de desarrollo por fases

### Fase A — Sin hardware del espejo (ahora → llegada del kit)

1. Monorepo o carpeta `app/` Electron + React + TS.
2. UI táctil grande: idle → countdown → review.
3. Motor de plantillas (marco + logo + LUT desde carpeta evento).
4. Preview simulado con webcam de desarrollo o video archivo.

### Fase B — Con cámara y capturadora

1. Integrar stream HDMI (MediaDevices / capturadora UVC) — ✅ en app.
2. Disparo Sony vía Camera Remote Command **PTP 2** (`tether-ptp2`) — ✅; ver `TETHER-CAPTURA.md`.
3. Modo kiosco + políticas Windows (sin suspensión).
4. Servidor estático Express para QR en LAN.

### Fase C — Campo

1. Montaje físico, distancia, enfoque, exposición fija si conviene.
2. Prueba 6 h continua, temperatura, backup.

### Fase D — v2

Impresión, redes, GIF/video, IA.

---

## Configuración Windows (recordatorio)

- Desactivar suspensión y apagado de pantalla en evento.
- Usuario Windows dedicado sin permisos admin para invitados.
- Auto-inicio de la app al encender.
- **Assigned Access** / modo kiosco donde aplique.

---

## Negocio (contexto ligero)

- ~3 eventos/mes estimados al inicio.
- Paquetes por horas + fotos digitales + personalización.
- QR local como diferenciador.
- Impresión diferida a v2 (no bloquea lanzamiento).

---

## Preguntas abiertas (para el usuario / próximos agentes)

1. Distancia aproximada espejo → invitado (¿cuerpo completo o medio cuerpo?).
2. ¿El kit incluye **micro HDMI** en la cámara o solo en la PC?
3. ¿Nombre exacto del software trial cuando llegue el kit?
4. ¿Impresora modelo cuando la confirme el proveedor?
5. Confirmar si compra **α6400 kit** o evaluar **ZV-E10** por ahorro.

---

## Enlaces útiles (verificar precio/stock)

- Cámara α6400: [Profoto kit 16-50](https://profoto.com.mx/products/camara-sony-a6400-mirrorless-con-lente-16-50mm-f-3-5-5-6-ii)
- Alternativa ZV-E10: [Profoto ZV-E10K](https://profoto.com.mx/products/camara-mirrorless-sony-zv-e10k-con-lente-16-50mm-ii)
- Alternativa Canon R50: [Fotomecánica](https://www.fotomecanica.mx/camara-canon-eos-r50-rf-s-18-45mm-f4-5-6-3-is-stm-maleta-tarjeta-garantia-extendida-online.html)
- Capturadora: [Elgato Cam Link 4K - Fotomecánica](https://www.fotomecanica.mx/capturadora-de-video-adata-cam-link-4k-hdmi-a-usb-3-0-10gam9901-el-gato.html) | [Steren](https://www.steren.com.mx/capturadora-de-video-hdmi-a-usb-usb-c.html)
- Mini PC: Beelink SER5 MAX (~$8,999) — buscar en Mercado Libre / Amazon MX / Lapson

---

## Notas para agentes de código

- Idioma del usuario: **español**.
- No crear commits salvo que lo pida.
- Preferir **cambios mínimos** y convenciones React/TS modernas.
- La UI debe pensarse para **touch 43"** (botones grandes, sin hover crítico).
- Probar offline desde el inicio (sin dependencias cloud en runtime).
- **Desarrollo en Windows nativo** (PowerShell/CMD), no WSL — ver `app/README.md`.

---

## Historial de decisiones

| Fecha | Decisión |
|-------|----------|
| 2026-05-25 | MVP v1: fotos, countdown, preview vivo, filtros/plantillas, kiosco, QR local; sin impresión |
| 2026-05-25 | Stack: Electron + React + TypeScript |
| 2026-05-25 | Preview vía HDMI + capturadora; α6400 como cámara objetivo |
| 2026-05-25 | Mini PC del kit no es PC principal de producción |
| 2026-06-03 | Desarrollo de la app en **Windows nativo** (no WSL); repo en `app/` + `eventos/` |
| 2026-08-07 | Disparo kiosco: Camera Remote Command **PTP 2** (`tether-ptp2`); Imaging Edge fuera de runtime |
