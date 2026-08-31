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
  }) =>
    ipcRenderer.invoke('save-event-photos', input) as Promise<{
      filePath: string
      downloadUrl: string
    }>,
  saveStripPhotos: (input: {
    photosDir: string
    stripId: string
    stripDataUrl: string
    poses: Array<{
      pose: 1 | 2 | 3
      originalDataUrl?: string
      originalFilePath?: string
      editedDataUrl: string
      reuseOriginalAsEdited: boolean
    }>
    themeId?: string
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
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  quitApp: () => ipcRenderer.invoke('quit-app'),
})
