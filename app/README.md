# Espejo Fotos — App

App de espejo fotográfico para eventos (Electron + React + TypeScript).

**Fase actual:** preview vía **capturadora HDMI** (UVC) + disparo **tether PTP 2** (`tether-ptp2`). Detalle: `docs/TETHER-CAPTURA.md`.

## Entorno de desarrollo

**Usar Windows nativo** (PowerShell o CMD), no WSL.

- Electron, webcam y guardado de fotos funcionan sin workarounds.
- Mismo entorno que la mini PC del espejo en eventos.

Abre el proyecto desde una ruta de Windows, por ejemplo:

`C:\Users\...\workspace3`

(no edites solo dentro de `\\wsl$\...` para correr la app).

## Requisitos

- **Windows 10/11**
- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- Webcam o cámara integrada (desarrollo)

## Instalación

```powershell
cd app
npm install
```

## Desarrollo

```powershell
npm run dev
```

1. Se abre la ventana de Electron.
2. Permite **Cámara** cuando Windows lo pida.
3. Si no aparece: **Configuración → Privacidad y seguridad → Cámara** → activar para apps de escritorio.

### Flujo de prueba

1. **Idle** — preview en vivo + filtros + «Tomar foto»
2. **Countdown** — 3, 2, 1
3. **Review** — confirmar o repetir
4. Fotos guardadas en `eventos\demo\fotos\`

### Otros comandos

```powershell
npm run typecheck             # revisar TypeScript
npm run build:download-page   # página web del QR → resources/download-page/
npm run build:portable        # .exe portable (incluye página QR)
```

Salida típica: `app\release\Espejo Fotos-0.1.0-portable.exe`

El QR abre `http://{IP}:8787/f/foto-….jpg?theme=…` (misma WiFi/hotspot). La foto está en `/fotos/…`.

`npm run dev:web` — solo UI en el navegador (sin diálogo de carpeta; las fotos se descargan).

## Wizard de operador

1. **Carpeta** — eliges dónde guardar las fotos (diálogo de Windows).
2. **Cámara** — preview + rotación.
3. **Captura** — Tether o Preview HDMI.
4. **Color** — tema neón.
## Estructura

```
FotoMirror/
  app/           ← código Electron + React
  eventos/       ← legado / assets opcionales
  docs/          ← contexto del proyecto
```

## Próximos pasos (Fase B)

- Capturadora HDMI (mismo `getUserMedia`, otro dispositivo)
- Validar build portable en la mini PC del espejo
- Assigned Access / auto-inicio Windows

## Build para el espejo (compartir por red)

```powershell
cd app
npm run dist
```

Salida en `app\release\`:

| Archivo | Uso |
|---------|-----|
| `Espejo Fotos-0.1.0-portable.exe` | Un solo `.exe` (~73 MB) — lo más fácil de copiar |
| `win-unpacked\` | Carpeta completa — copia toda la carpeta al espejo |

### Copiar por red local

**Opción A — Portable (recomendada)**  
1. En tu PC: copia `app\release\Espejo Fotos-0.1.0-portable.exe` a una carpeta compartida, USB, o OneDrive/LAN.  
2. En la mini PC del espejo: ejecuta el `.exe` (no necesita instalador).  
3. La primera vez Windows puede pedir permiso de firewall / SmartScreen → «Ejecutar de todas formas».

**Opción B — Carpeta compartida Windows**  
1. En tu PC, comparte `app\release` (clic derecho → Propiedades → Compartir).  
2. En el espejo: `\\TU-PC\release\` y copia `Espejo Fotos-0.1.0-portable.exe` o toda `win-unpacked\`.  
3. Si usas `win-unpacked`, ejecuta `Espejo Fotos.exe` dentro de esa carpeta.

**Opción C — PowerShell (misma red)**  
Desde el espejo, si tienes una carpeta compartida en tu PC:

```powershell
Copy-Item "\\IP-DE-TU-PC\share\Espejo Fotos-0.1.0-portable.exe" "$env:USERPROFILE\Desktop\"
```

### Notas en la mini PC

- Instala **Imaging Edge Webcam** si usas la Sony por USB.
- Las fotos se guardan junto a la app empaquetada en `resources\eventos\{slug}\fotos\` (portable: carpeta temporal de extracción).
- Para actualizar: vuelve a hacer `npm run dist` y reemplaza el `.exe` en el espejo.
- El evento demo va incluido; puedes editar `resources\eventos\` en `win-unpacked` sin recompilar.
