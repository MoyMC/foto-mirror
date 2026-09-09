import type { EventSignFontId, EventSignSizeId } from './lib/eventSign'
import type { OverlayMode } from './lib/overlay'
import type { SlideshowIdleSeconds } from './lib/slideshow'
import type { AppThemeId } from './lib/themes'
import type { PreviewRotation } from './lib/orientation'

export type AppPhase = 'idle' | 'countdown' | 'strip-flash' | 'review' | 'share'

export type PhotoMode = 'individual' | 'strip2' | 'strip3'

export interface StripCaptureFrame {
  rawPhoto: string
  tetherSourcePath: string | null
  usedFallback: boolean
  fallbackReason: string | null
}

export interface StripPoseSaveInput {
  pose: number
  originalDataUrl?: string
  originalFilePath?: string
  editedDataUrl: string
  reuseOriginalAsEdited: boolean
}

export interface SaveStripPhotosInput {
  photosDir: string
  stripId: string
  stripKind: 'strip2' | 'strip3'
  stripDataUrl: string
  poses: StripPoseSaveInput[]
  themeId?: string
  signText?: string | null
  previewRotation?: number | null
}

export interface StripManifest {
  type: 'strip'
  id: string
  stripKind: 'strip2' | 'strip3'
  files: {
    strip: string
    poses: string[]
  }
  signText?: string | null
  themeId?: string | null
}

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
  overlayMode: OverlayMode
  overlayScale: number
  slideshowMemoriesDir: string | null
  slideshowIncludeEventPhotos: boolean
  slideshowIdleEnabled: boolean
  slideshowIdleSeconds: SlideshowIdleSeconds
  slideshowAudioEnabled: boolean
  printEnabled: boolean
  /** Windows printer queue, or simulate sentinel from main. */
  printerName: string
}

export interface PrinterOption {
  name: string
  isDefault: boolean
}

export interface PrintSettings {
  enabled: boolean
  printerName: string
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
  printMeta?: {
    signText?: string | null
    signX?: number
    signY?: number
    signFontId?: string
    signSizeId?: string
    themeId?: string
    previewRotation?: number
    needsOrientationPass?: boolean
    overlayMode?: 'none' | 'text' | 'png'
    overlayScale?: number
  }
}

export interface ElectronAPI {
  selectPhotosDir: () => Promise<string | null>
  selectSlideshowDir: () => Promise<string | null>
  listSlideshowImages: (dir: string) => Promise<string[]>
  listEventSlideshowImages: (photosDir: string) => Promise<string[]>
  pathToFileUrl: (filePath: string) => Promise<string>
  setSlideshowMemoriesDir: (dir: string | null) => Promise<void>
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
  saveStripPhotos: (input: SaveStripPhotosInput) => Promise<SavePhotoResult>
  importPhotoFile: (
    sourcePath: string,
    filename: string,
    photosDir: string,
    themeId?: string,
  ) => Promise<SavePhotoResult>
  deletePhotoFile: (filePath: string) => Promise<{ ok: boolean }>
  tetherStatus: () => Promise<TetherStatus>
  tetherCapture: (photosDir: string, timeoutMs?: number) => Promise<TetherCaptureResult>
  listPrinters: () => Promise<PrinterOption[]>
  getPrintSettings: () => Promise<PrintSettings>
  setPrintSettings: (settings: Partial<PrintSettings>) => Promise<PrintSettings>
  getSimulatePrinter: () => Promise<{ id: string; label: string }>
  selectOverlayPng: () => Promise<string | null>
  installOverlayPng: (photosDir: string, sourcePath: string) => Promise<string>
  clearOverlayPng: (photosDir: string) => Promise<void>
  getOverlayPngPath: (photosDir: string) => Promise<string | null>
  getOverlayPngDataUrl: (photosDir: string) => Promise<string | null>
  openExternal: (url: string) => Promise<void>
  quitApp: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
