# Captura tethered (Sony) + fallback preview

> Estado: **integrado en FotoMirror** (2026-08-07).  
> Cámara: α6400 (ILCE-6400).  
> Preview: **HDMI → capturadora UVC**.  
> Disparo: **USB PC Remote + PTP 2** (`tether-ptp2`), sin Imaging Edge en runtime.

Ver también: `docs/IMPLEMENTACION-ESTADO.md` (Fase B).

---

## Decisión de producto

| Enfoque | ¿Sirve para kiosco? |
|---------|---------------------|
| Imaging Edge Remote + app | ❌ Dos procesos; operador técnico |
| **Camera Remote Command (PTP 2) + helper** | ✅ Una sola app en kiosco |
| digiCamControl | ❌ Sin disparo USB Sony |
| Solo frame del preview HDMI | ✅ Fallback; calidad limitada (~cientos de KB) |

---

## Cables (ambos)

| Cable | Rol |
|--------|-----|
| **USB** (cámara → PC) | Connect PTP, disparo S2, descarga JPEG nativo |
| **HDMI** (cámara → capturadora → PC) | Preview en vivo en el espejo |

Sin USB no hay tether. Sin HDMI no hay preview fluido.

**Cámara:** USB Connection = **PC remoto**; Dest. guard. img fija = **PC** o **PC+Cámara**.  
**Cerrar** Imaging Edge Remote/Webcam y el sample `CameraControlPTP` antes de abrir FotoMirror (compiten por USB).

---

## Protocolo: PTP 2 (no PTP 3)

ZIP: `CameraRemoteCommand-2.02.00` (`README.pdf` → Protocol Compatibility).

| Modelo | PTP 3 | PTP 2 | USB | IP |
|--------|-------|-------|-----|-----|
| **ILCE-6400(A)** | ❌ | ✅ | ✅ | ❌ |

- Sample de referencia: `Examples\example-v2-windows`.  
- El sample **v3** puede mostrar modelo/S2 pero **no** baja fotos bien en α6400.

---

## Arquitectura en la app

```
[FotoMirror Electron]
   ├─ Preview: getUserMedia(USB3 Video / capturadora HDMI)
   ├─ Helper: resources/tether-ptp2/tether-ptp2.exe  (proceso persistente)
   │     connect → sesión PTP (quita “Conectando…” en HDMI)
   │     capture → S1/S2 + GetObject → DSC….JPG
   └─ Fallback: captureFrame(video) si tether falla
```

### Wizard

1. Carpeta de fotos  
2. Cámara preview (elegir capturadora)  
3. Modo captura: **Tether USB** | **Preview HDMI** + Reintentar PTP + Probar captura  

Badge operador: `Captura: Tether` / `Preview`.  
En review: `Tether (JPEG nativo)` o `Preview (fallback)` + motivo.

### Flujo captura (modo tether)

```
Countdown 0
  → tether-capture (timeout ~10 s)
  → OK: JPEG nativo (varios MB, ej. ~8 MB)
       · filtro Normal al confirmar: renombra DSC….JPG → foto-<ts>.jpg (un solo archivo)
       · con filtro: guarda foto procesada a resolución nativa; borra DSC
  → falla: frame HDMI (~300 KB) + aviso fallback
```

### IPC Electron

| Canal | Resultado |
|-------|-----------|
| `tether-status` | Connect si hace falta → `{ available, canShoot, cameraModel?, reason? }` |
| `tether-capture` | `{ ok, filePath?, dataUrl?, error? }` |
| `import-photo-file` | Mueve/renombra JPEG nativo a `foto-….jpg` |
| `delete-photo-file` | Limpia DSC en retake / tras filtro |

Código: `app/electron/tetherBridge.ts`, `app/electron/main.ts`.

---

## Helper nativo `tether-ptp2`

| | |
|--|--|
| Fuente | `native/tether-ptp2/` |
| Binario | `app/resources/tether-ptp2/tether-ptp2.exe` |
| Empaquetado | `extraResources` → `tether-ptp2/` en portable |

### Build

```bat
msbuild native\tether-ptp2\tether-ptp2.sln /p:Configuration=Release /p:Platform=Win32
```

### Protocolo stdin / stdout (JSON por línea)

| Entrada | Salida |
|---------|--------|
| *(arranque)* | `{"ok":true,"cmd":"ready"}` |
| `connect` | `{"ok":true,"cmd":"connect","model":"...","canShoot":true}` |
| `capture C:\ruta\carpeta` | `{"ok":true,"cmd":"capture","filePath":"..."}` |
| `status` / `disconnect` / `quit` | ok / error JSON |

Tras Connect: Save Media → Host Device; pump periódico para mantener sesión remota.

---

## Checklist (hecho)

- [x] ZIP Camera Remote Command; α6400 = **PTP 2**
- [x] Sample v2: Connect + S2 + JPEG en carpeta
- [x] Helper CLI + Electron bridge
- [x] Wizard paso 3 + `canShoot` + Probar captura
- [x] JPEG nativo sin bajar a 1080p; sin duplicar DSC/`foto-`
- [x] Fallback preview con aviso en UI

### Pendiente / no hacer (por ahora)

- [ ] Presets booth por PTP (ISO máx, f/, obturador) — opcional  
- [ ] Cambiar dial Movie ↔ Auto/P/A/S/M por remoto — **no fiable en α6400** (dial físico); modo video además suele dejar HDMI negro con la capturadora  
- [ ] Validar QR (A5) y empaquetar portable con helper en el espejo de producción  

---

## Operación recomendada (booth)

1. Dial de la cámara en **A** o **M** (foto), no Movie ni Auto “escena”.  
2. Buena luz de evento (el preview HDMI siempre se verá peor que el JPEG nativo).  
3. En wizard: capturadora como preview; **Tether** si `canShoot`.  
4. Imaging Edge **cerrado**.

---

## Criterio de done (producto)

1. Kiosco: solo FotoMirror (helper embebido).  
2. Disparo JPEG nativo &lt; ~10 s o fallback con aviso.  
3. Un archivo final `foto-….jpg` (~MB si tether OK).  
4. Imaging Edge **no** requerido en runtime.
