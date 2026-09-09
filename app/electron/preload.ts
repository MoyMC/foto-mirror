import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectPhotosDir: () => ipcRenderer.invoke('select-photos-dir') as Promise<string | null>,
  selectSlideshowDir: () => ipcRenderer.invoke('select-slideshow-dir') as Promise<string | null>,
  listSlideshowImages: (dir: string) =>
    ipcRenderer.invoke('list-slideshow-images', dir) as Promise<string[]>,
  listEventSlideshowImages: (photosDir: string) =>
    ipcRenderer.invoke('list-event-slideshow-images', photosDir) as Promise<string[]>,
  pathToFileUrl: (filePath: string) =>
    ipcRenderer.invoke('path-to-file-url', filePath) as Promise<string>,
  setSlideshowMemoriesDir: (dir: string | null) =>
    ipcRenderer.invoke('set-slideshow-memories-dir', dir) as Promise<void>,
  getEventosBaseUrl: () => ipcRenderer.invoke('get-eventos-base-url') as Promise<string>,
  startPhotoServer: (photosDir: string) =>
    ipcRenderer.invoke('start-photo-server', photosDir) as Promise<string>,
  getDownloadBaseUrl: () => ipcRenderer.invoke('get-download-base-url') as Promise<string>,
  savePhoto: (dataUrl: string, filename: string, photosDir: string, themeId?: string) =>
    ipcRenderer.invoke('save-photo', dataUrl, filename, photosDir, themeId) as Promise<{
      filePath: string
      downloadUrl: string
    }>,
  saveEventPhotos: (input: {
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
  }) =>
    ipcRenderer.invoke('save-event-photos', input) as Promise<{
      filePath: string
      downloadUrl: string
    }>,
  saveStripPhotos: (input: {
    photosDir: string
    stripId: string
    stripKind: 'strip2' | 'strip3'
    stripDataUrl: string
    poses: Array<{
      pose: number
      originalDataUrl?: string
      originalFilePath?: string
      editedDataUrl: string
      reuseOriginalAsEdited: boolean
    }>
    themeId?: string
    signText?: string | null
    previewRotation?: number | null
  }) =>
    ipcRenderer.invoke('save-strip-photos', input) as Promise<{
      filePath: string
      downloadUrl: string
    }>,
  importPhotoFile: (
    sourcePath: string,
    filename: string,
    photosDir: string,
    themeId?: string,
  ) =>
    ipcRenderer.invoke('import-photo-file', sourcePath, filename, photosDir, themeId) as Promise<{
      filePath: string
      downloadUrl: string
    }>,
  deletePhotoFile: (filePath: string) =>
    ipcRenderer.invoke('delete-photo-file', filePath) as Promise<{ ok: boolean }>,
  tetherStatus: () =>
    ipcRenderer.invoke('tether-status') as Promise<{
      available: boolean
      canShoot: boolean
      cameraModel?: string
      reason?: string
    }>,
  tetherCapture: (photosDir: string, timeoutMs?: number) =>
    ipcRenderer.invoke('tether-capture', photosDir, timeoutMs) as Promise<{
      ok: boolean
      filePath?: string
      dataUrl?: string
      error?: string
    }>,
  listPrinters: () =>
    ipcRenderer.invoke('list-printers') as Promise<Array<{ name: string; isDefault: boolean }>>,
  getPrintSettings: () =>
    ipcRenderer.invoke('get-print-settings') as Promise<{
      enabled: boolean
      printerName: string
    }>,
  setPrintSettings: (settings: { enabled?: boolean; printerName?: string }) =>
    ipcRenderer.invoke('set-print-settings', settings) as Promise<{
      enabled: boolean
      printerName: string
    }>,
  getSimulatePrinter: () =>
    ipcRenderer.invoke('get-simulate-printer') as Promise<{ id: string; label: string }>,
  selectOverlayPng: () => ipcRenderer.invoke('select-overlay-png') as Promise<string | null>,
  installOverlayPng: (photosDir: string, sourcePath: string) =>
    ipcRenderer.invoke('install-overlay-png', photosDir, sourcePath) as Promise<string>,
  clearOverlayPng: (photosDir: string) =>
    ipcRenderer.invoke('clear-overlay-png', photosDir) as Promise<void>,
  getOverlayPngPath: (photosDir: string) =>
    ipcRenderer.invoke('get-overlay-png-path', photosDir) as Promise<string | null>,
  getOverlayPngDataUrl: (photosDir: string) =>
    ipcRenderer.invoke('get-overlay-png-data-url', photosDir) as Promise<string | null>,
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  quitApp: () => ipcRenderer.invoke('quit-app'),
})
