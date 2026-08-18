import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectPhotosDir: () => ipcRenderer.invoke('select-photos-dir') as Promise<string | null>,
  getEventosBaseUrl: () => ipcRenderer.invoke('get-eventos-base-url') as Promise<string>,
  startPhotoServer: (photosDir: string) =>
    ipcRenderer.invoke('start-photo-server', photosDir) as Promise<string>,
  getDownloadBaseUrl: () => ipcRenderer.invoke('get-download-base-url') as Promise<string>,
  savePhoto: (dataUrl: string, filename: string, photosDir: string, themeId?: string) =>
    ipcRenderer.invoke('save-photo', dataUrl, filename, photosDir, themeId) as Promise<{
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
