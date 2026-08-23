import type { EventSignFontId, EventSignSizeId } from './lib/eventSign'
import type { AppThemeId } from './lib/themes'
import type { PreviewRotation } from './lib/orientation'

export type AppPhase = 'idle' | 'countdown' | 'review' | 'share'

/** Cómo se toma la foto final tras el countdown. */
export type CaptureMode = 'preview' | 'tethered'

export type { AppThemeId, PreviewRotation }

export interface SessionConfig {
  cameraDeviceId: string
  photosDir: string
  captureMode: CaptureMode
  themeId: AppThemeId
  previewRotation: PreviewRotation
  eventSignText: string
  eventSignX: number
  eventSignY: number
  eventSignFontId: EventSignFontId
  eventSignSizeId: EventSignSizeId
}

export interface TetherStatus {
  available: boolean
  canShoot: boolean
  cameraModel?: string
  reason?: string
}

export interface TetherCaptureResult {
  ok: boolean
  filePath?: string
  dataUrl?: string
  error?: string
}

export interface EventTexts {
  idleButton: string
  reviewConfirm: string
  reviewRetake: string
  countdownLabel: string
  shareDone?: string
  shareHint?: string
}

export interface FilterAdjustments {
  warmth?: number
  fade?: number
  vignette?: number
}

export interface FilterPreset {
  id: string
  name: string
  cssFilter: string
  adjustments?: FilterAdjustments
}

export interface VideoInputDevice {
  deviceId: string
  label: string
}

export interface AppConfig {
  name: string
  countdownSeconds: number
  captureWidth: number
  captureHeight: number
  texts: EventTexts
  filters: FilterPreset[]
  defaultFilterId: string
  preferredCameraLabel?: string
  /** PIN para Configuración / Salir en modo evento (C4). */
  operatorPin: string
}

export interface SavePhotoResult {
  filePath: string
  downloadUrl: string
}

export interface SaveEventPhotosInput {
  photosDir: string
  filename: string
  originalDataUrl?: string
  originalFilePath?: string
  editedDataUrl?: string
  reuseOriginalAsEdited: boolean
  themeId?: string
}

export interface ElectronAPI {
  selectPhotosDir: () => Promise<string | null>
  getEventosBaseUrl: () => Promise<string>
  startPhotoServer: (photosDir: string) => Promise<string>
  getDownloadBaseUrl: () => Promise<string>
  savePhoto: (
    dataUrl: string,
    filename: string,
    photosDir: string,
    themeId?: string,
  ) => Promise<SavePhotoResult>
  saveEventPhotos: (input: SaveEventPhotosInput) => Promise<SavePhotoResult>
  importPhotoFile: (
    sourcePath: string,
    filename: string,
    photosDir: string,
    themeId?: string,
  ) => Promise<SavePhotoResult>
  deletePhotoFile: (filePath: string) => Promise<{ ok: boolean }>
  tetherStatus: () => Promise<TetherStatus>
  tetherCapture: (photosDir: string, timeoutMs?: number) => Promise<TetherCaptureResult>
  openExternal: (url: string) => Promise<void>
  quitApp: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
