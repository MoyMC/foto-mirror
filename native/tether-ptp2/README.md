# tether-ptp2

Helper CLI Windows (PTP 2 / WIA) para Sony α6400 — Connect + S2 + descarga JPEG.

## Build

```bat
msbuild tether-ptp2.sln /p:Configuration=Release /p:Platform=Win32
```

Salida: `app/resources/tether-ptp2/tether-ptp2.exe`

## Protocolo (stdin / stdout JSON)

| Entrada | Salida |
|---------|--------|
| *(al arrancar)* | `{"ok":true,"cmd":"ready"}` |
| `connect` | `{"ok":true,"cmd":"connect","model":"...","canShoot":true}` |
| `capture C:\ruta\carpeta` | `{"ok":true,"cmd":"capture","filePath":"..."}` |
| `status` | `{"ok":true,"cmd":"status","connected":true,"canShoot":true}` |
| `disconnect` / `quit` | ok |

Cierra Imaging Edge y el sample CameraControlPTP antes de `connect`.
