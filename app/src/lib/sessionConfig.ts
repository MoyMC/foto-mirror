import type { CaptureMode, SessionConfig } from '../types'
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

const SESSION_KEY = 'espejo-fotos:session'
export const CAMERA_DEVICE_KEY = 'espejo-fotos:camera-device-id'
export const PHOTOS_DIR_KEY = 'espejo-fotos:photos-dir'
export const CAPTURE_MODE_KEY = 'espejo-fotos:capture-mode'
export const THEME_KEY = 'espejo-fotos:theme-id'
export const PREVIEW_ROTATION_KEY = 'espejo-fotos:preview-rotation'

function normalizeCaptureMode(value: unknown): CaptureMode {
  return value === 'tethered' ? 'tethered' : 'preview'
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
