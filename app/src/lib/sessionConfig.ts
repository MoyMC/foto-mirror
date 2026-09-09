import type { CaptureMode, SessionConfig } from '../types'
import {
  DEFAULT_EVENT_SIGN_X,
  DEFAULT_EVENT_SIGN_Y,
  clampSignPercent,
  normalizeEventSign,
  normalizeSignFontId,
  normalizeSignSizeId,
} from './eventSign'
import {
  DEFAULT_PREVIEW_ROTATION,
  normalizePreviewRotation,
  type PreviewRotation,
} from './orientation'
import {
  applyAppTheme,
  normalizeThemeId,
  type AppThemeId,
} from './themes'
import {
  DEFAULT_SLIDESHOW_IDLE_SECONDS,
  normalizeSlideshowIdleSeconds,
} from './slideshow'
import { clampOverlayScale, normalizeOverlayMode } from './overlay'

const SESSION_KEY = 'espejo-fotos:session'
export const CAMERA_DEVICE_KEY = 'espejo-fotos:camera-device-id'
export const PHOTOS_DIR_KEY = 'espejo-fotos:photos-dir'
export const CAPTURE_MODE_KEY = 'espejo-fotos:capture-mode'
export const THEME_KEY = 'espejo-fotos:theme-id'
export const PREVIEW_ROTATION_KEY = 'espejo-fotos:preview-rotation'
export const EVENT_SIGN_KEY = 'espejo-fotos:event-sign'
export const EVENT_SIGN_X_KEY = 'espejo-fotos:event-sign-x'
export const EVENT_SIGN_Y_KEY = 'espejo-fotos:event-sign-y'
export const EVENT_SIGN_FONT_KEY = 'espejo-fotos:event-sign-font'
export const EVENT_SIGN_SIZE_KEY = 'espejo-fotos:event-sign-size'
export const SLIDESHOW_MEMORIES_DIR_KEY = 'espejo-fotos:slideshow-memories-dir'
export const SLIDESHOW_INCLUDE_EVENT_KEY = 'espejo-fotos:slideshow-include-event'
export const SLIDESHOW_IDLE_ENABLED_KEY = 'espejo-fotos:slideshow-idle-enabled'
export const SLIDESHOW_IDLE_SECONDS_KEY = 'espejo-fotos:slideshow-idle-seconds'
export const SLIDESHOW_AUDIO_KEY = 'espejo-fotos:slideshow-audio'
export const PRINT_ENABLED_KEY = 'espejo-fotos:print-enabled'
export const PRINTER_NAME_KEY = 'espejo-fotos:printer-name'
export const OVERLAY_MODE_KEY = 'espejo-fotos:overlay-mode'
export const OVERLAY_SCALE_KEY = 'espejo-fotos:overlay-scale'

/** Must match electron/printConfig SIMULATE_PRINTER_ID */
export const SIMULATE_PRINTER_ID = '__fotomirror_simulate__'
export const DEFAULT_PRINTER_NAME = 'DS-RX1'

function normalizeCaptureMode(value: unknown): CaptureMode {
  return value === 'tethered' ? 'tethered' : 'preview'
}

function normalizePrinterName(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return DEFAULT_PRINTER_NAME
}

export function loadSessionConfig(): SessionConfig | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<SessionConfig>
    if (!data.cameraDeviceId || !data.photosDir) return null
    return {
      cameraDeviceId: data.cameraDeviceId,
      photosDir: data.photosDir,
      captureMode: normalizeCaptureMode(data.captureMode),
      themeId: normalizeThemeId(data.themeId),
      previewRotation: normalizePreviewRotation(data.previewRotation),
      eventSignText: normalizeEventSign(data.eventSignText),
      eventSignX: clampSignPercent(data.eventSignX, DEFAULT_EVENT_SIGN_X),
      eventSignY: clampSignPercent(data.eventSignY, DEFAULT_EVENT_SIGN_Y),
      eventSignFontId: normalizeSignFontId(data.eventSignFontId),
      eventSignSizeId: normalizeSignSizeId(data.eventSignSizeId),
      overlayMode: normalizeOverlayMode(data.overlayMode),
      overlayScale: clampOverlayScale(data.overlayScale),
      slideshowMemoriesDir: data.slideshowMemoriesDir ?? null,
      slideshowIncludeEventPhotos: Boolean(data.slideshowIncludeEventPhotos),
      slideshowIdleEnabled: data.slideshowIdleEnabled !== false,
      slideshowIdleSeconds: normalizeSlideshowIdleSeconds(data.slideshowIdleSeconds),
      slideshowAudioEnabled: Boolean(data.slideshowAudioEnabled),
      printEnabled: Boolean(data.printEnabled),
      printerName: normalizePrinterName(data.printerName),
    }
  } catch {
    return null
  }
}

export function saveSessionConfig(config: SessionConfig): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(config))
  localStorage.setItem(CAMERA_DEVICE_KEY, config.cameraDeviceId)
  localStorage.setItem(PHOTOS_DIR_KEY, config.photosDir)
  localStorage.setItem(CAPTURE_MODE_KEY, config.captureMode)
  localStorage.setItem(THEME_KEY, config.themeId)
  localStorage.setItem(PREVIEW_ROTATION_KEY, String(config.previewRotation))
  localStorage.setItem(EVENT_SIGN_KEY, config.eventSignText)
  localStorage.setItem(EVENT_SIGN_X_KEY, String(config.eventSignX))
  localStorage.setItem(EVENT_SIGN_Y_KEY, String(config.eventSignY))
  localStorage.setItem(EVENT_SIGN_FONT_KEY, config.eventSignFontId)
  localStorage.setItem(EVENT_SIGN_SIZE_KEY, config.eventSignSizeId)
  localStorage.setItem(OVERLAY_MODE_KEY, config.overlayMode)
  localStorage.setItem(OVERLAY_SCALE_KEY, String(config.overlayScale))
  localStorage.setItem(SLIDESHOW_MEMORIES_DIR_KEY, config.slideshowMemoriesDir ?? '')
  localStorage.setItem(
    SLIDESHOW_INCLUDE_EVENT_KEY,
    config.slideshowIncludeEventPhotos ? '1' : '0',
  )
  localStorage.setItem(
    SLIDESHOW_IDLE_ENABLED_KEY,
    config.slideshowIdleEnabled ? '1' : '0',
  )
  localStorage.setItem(SLIDESHOW_IDLE_SECONDS_KEY, String(config.slideshowIdleSeconds))
  localStorage.setItem(SLIDESHOW_AUDIO_KEY, config.slideshowAudioEnabled ? '1' : '0')
  localStorage.setItem(PRINT_ENABLED_KEY, config.printEnabled ? '1' : '0')
  localStorage.setItem(PRINTER_NAME_KEY, config.printerName)
  applyAppTheme(config.themeId)
}

export function loadStoredPhotosDir(): string | null {
  return localStorage.getItem(PHOTOS_DIR_KEY)
}

export function loadStoredCaptureMode(): CaptureMode {
  return normalizeCaptureMode(localStorage.getItem(CAPTURE_MODE_KEY))
}

export function loadStoredThemeId(): AppThemeId {
  return normalizeThemeId(localStorage.getItem(THEME_KEY))
}

export function loadStoredPreviewRotation(): PreviewRotation {
  return normalizePreviewRotation(
    localStorage.getItem(PREVIEW_ROTATION_KEY) ?? DEFAULT_PREVIEW_ROTATION,
  )
}

export function loadStoredEventSignText(): string {
  return normalizeEventSign(localStorage.getItem(EVENT_SIGN_KEY) ?? '')
}

export function loadStoredEventSignX(): number {
  return clampSignPercent(localStorage.getItem(EVENT_SIGN_X_KEY), DEFAULT_EVENT_SIGN_X)
}

export function loadStoredEventSignY(): number {
  return clampSignPercent(localStorage.getItem(EVENT_SIGN_Y_KEY), DEFAULT_EVENT_SIGN_Y)
}

export function loadStoredEventSignFontId() {
  return normalizeSignFontId(localStorage.getItem(EVENT_SIGN_FONT_KEY))
}

export function loadStoredEventSignSizeId() {
  return normalizeSignSizeId(localStorage.getItem(EVENT_SIGN_SIZE_KEY))
}

export function loadStoredOverlayMode() {
  return normalizeOverlayMode(localStorage.getItem(OVERLAY_MODE_KEY))
}

export function loadStoredOverlayScale() {
  return clampOverlayScale(localStorage.getItem(OVERLAY_SCALE_KEY))
}

export function loadStoredSlideshowMemoriesDir(): string | null {
  const raw = localStorage.getItem(SLIDESHOW_MEMORIES_DIR_KEY)
  return raw || null
}

export function loadStoredSlideshowIncludeEventPhotos(): boolean {
  return localStorage.getItem(SLIDESHOW_INCLUDE_EVENT_KEY) === '1'
}

export function loadStoredSlideshowIdleEnabled(): boolean {
  const raw = localStorage.getItem(SLIDESHOW_IDLE_ENABLED_KEY)
  if (raw === null) return true
  return raw === '1'
}

export function loadStoredSlideshowIdleSeconds() {
  return normalizeSlideshowIdleSeconds(
    localStorage.getItem(SLIDESHOW_IDLE_SECONDS_KEY) ?? DEFAULT_SLIDESHOW_IDLE_SECONDS,
  )
}

export function loadStoredSlideshowAudioEnabled(): boolean {
  return localStorage.getItem(SLIDESHOW_AUDIO_KEY) === '1'
}

export function loadStoredPrintEnabled(): boolean {
  return localStorage.getItem(PRINT_ENABLED_KEY) === '1'
}

export function loadStoredPrinterName(): string {
  return normalizePrinterName(localStorage.getItem(PRINTER_NAME_KEY))
}

/** Ruta corta para la barra de operador. */
export function shortPath(fullPath: string): string {
  const normalized = fullPath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 2) return fullPath
  return `…/${parts.slice(-2).join('/')}`
}

export function captureModeLabel(mode: CaptureMode): string {
  return mode === 'tethered' ? 'Tether' : 'Preview'
}
