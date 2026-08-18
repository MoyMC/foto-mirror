import type { AppConfig } from '../types'

/** Ajustes globales de la app (ya no por carpeta de evento). */
export const appConfig: AppConfig = {
  name: 'Espejo Fotos',
  countdownSeconds: 3,
  captureWidth: 1920,
  captureHeight: 1080,
  texts: {
    idleButton: 'Tomar foto',
    reviewConfirm: '¡Listo!',
    reviewRetake: 'Otra vez',
    countdownLabel: '¡Sonríe!',
    shareDone: 'Siguiente invitado',
    shareHint: 'Escanea el QR para descargar tu foto',
  },
  defaultFilterId: 'normal',
  preferredCameraLabel: 'Imaging Edge',
  operatorPin: '2580',
  filters: [],
}
