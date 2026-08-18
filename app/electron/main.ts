import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  buildPhotoDownloadUrl,
  getDownloadBaseUrl,
  startPhotoServer,
  stopPhotoServer,
} from './photoServer'
import {
  getEventosBaseUrl,
  startEventsServer,
  stopEventsServer,
} from './eventsServer'
import { captureTethered, disconnectTether, getTetherStatus } from './tetherBridge'

const isDev = !app.isPackaged

function getEventsRoot() {
  if (isDev) {
    return path.join(app.getAppPath(), '..', 'eventos')
  }
  return path.join(process.resourcesPath, 'eventos')
}

function resolveAppIcon(): string {
  return path.join(app.getAppPath(), 'build', 'icon.ico')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: !isDev,
    autoHideMenuBar: true,
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  if (!isDev) {
    await startEventsServer(getEventsRoot())
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  void disconnectTether()
  stopPhotoServer()
  stopEventsServer()
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('select-photos-dir', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Carpeta para guardar fotos',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('get-eventos-base-url', () => {
  if (isDev) return ''
  return getEventosBaseUrl()
})

ipcMain.handle('start-photo-server', async (_event, photosDir: string) => {
  return startPhotoServer(photosDir)
})

ipcMain.handle('get-download-base-url', () => getDownloadBaseUrl())

ipcMain.handle(
  'save-photo',
  async (
    _event,
    dataUrl: string,
    filename: string,
    photosDir: string,
    themeId?: string,
  ) => {
    await fs.mkdir(photosDir, { recursive: true })

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const filePath = path.join(photosDir, filename)
    await fs.writeFile(filePath, buffer)

    return {
      filePath,
      downloadUrl: buildPhotoDownloadUrl(filename, themeId),
    }
  },
)

ipcMain.handle(
  'import-photo-file',
  async (
    _event,
    sourcePath: string,
    filename: string,
    photosDir: string,
    themeId?: string,
  ) => {
    await fs.mkdir(photosDir, { recursive: true })
    const filePath = path.join(photosDir, filename)
    try {
      await fs.rename(sourcePath, filePath)
    } catch {
      await fs.copyFile(sourcePath, filePath)
      await fs.unlink(sourcePath).catch(() => undefined)
    }
    return {
      filePath,
      downloadUrl: buildPhotoDownloadUrl(filename, themeId),
    }
  },
)

ipcMain.handle('delete-photo-file', async (_event, filePath: string) => {
  try {
    await fs.unlink(filePath)
    return { ok: true }
  } catch {
    return { ok: false }
  }
})

ipcMain.handle('open-external', (_event, url: string) => {
  return shell.openExternal(url)
})

ipcMain.handle('tether-status', async () => getTetherStatus())

ipcMain.handle(
  'tether-capture',
  async (_event, photosDir: string, timeoutMs?: number) => {
    return captureTethered({ photosDir, timeoutMs })
  },
)

ipcMain.handle('quit-app', () => {
  app.quit()
})
