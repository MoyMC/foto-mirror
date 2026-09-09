import { loadAppEnv } from './loadEnv'

loadAppEnv()

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  buildPhotoDownloadUrl,
  buildSlideshowImageUrl,
  getDownloadBaseUrl,
  setSlideshowMemoriesDir,
  startPhotoServer,
  stopPhotoServer,
} from './photoServer'
import {
  getEventosBaseUrl,
  startEventsServer,
  stopEventsServer,
} from './eventsServer'
import { listImageFilesInDir, listMediaFilesInDir } from './slideshowBridge'
import { captureTethered, disconnectTether, getTetherStatus } from './tetherBridge'
import {
  closeEventRegistry,
  getEventRegistry,
  openEventRegistry,
  photoIdFromFilename,
} from './eventRegistry'
import { startPrintWorker, stopPrintWorker } from './printWorker'
import { getPrinters } from 'pdf-to-printer'
import {
  getPrintSettings,
  setPrintSettings,
  SIMULATE_PRINTER_ID,
  SIMULATE_PRINTER_LABEL,
  type PrintRuntimeSettings,
} from './printConfig'

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
  const registry = getEventRegistry()
  if (registry) registry.closeSession()
  stopPrintWorker()
  closeEventRegistry()
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

ipcMain.handle('select-slideshow-dir', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Carpeta de recuerdos (fotos y videos)',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('list-slideshow-images', async (_event, dir: string) => {
  if (!dir || typeof dir !== 'string') return []
  return listMediaFilesInDir(dir)
})

ipcMain.handle('list-event-slideshow-images', async (_event, photosDir: string) => {
  if (!photosDir || typeof photosDir !== 'string') return []
  return listImageFilesInDir(path.join(photosDir, 'editadas'))
})

ipcMain.handle('path-to-file-url', (_event, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') return ''
  return buildSlideshowImageUrl(filePath) ?? ''
})

ipcMain.handle('set-slideshow-memories-dir', (_event, dir: string | null) => {
  setSlideshowMemoriesDir(dir && typeof dir === 'string' ? dir : null)
})

ipcMain.handle('get-eventos-base-url', () => {
  if (isDev) return ''
  return getEventosBaseUrl()
})

ipcMain.handle('start-photo-server', async (_event, photosDir: string) => {
  const registry = openEventRegistry(photosDir)
  startPrintWorker(registry)
  return startPhotoServer(photosDir)
})

ipcMain.handle('list-printers', async () => {
  try {
    const printers = await getPrinters()
    return printers.map((p) => ({
      name: p.name,
      isDefault: Boolean((p as { isDefault?: boolean }).isDefault),
    }))
  } catch (err) {
    console.error('[print] list-printers failed:', err)
    return [] as Array<{ name: string; isDefault: boolean }>
  }
})

ipcMain.handle('get-print-settings', () => getPrintSettings())

ipcMain.handle(
  'set-print-settings',
  (_event, settings: Partial<PrintRuntimeSettings>) => setPrintSettings(settings ?? {}),
)

ipcMain.handle('get-simulate-printer', () => ({
  id: SIMULATE_PRINTER_ID,
  label: SIMULATE_PRINTER_LABEL,
}))

ipcMain.handle('select-overlay-png', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Elegir PNG del evento',
    properties: ['openFile'],
    filters: [{ name: 'PNG', extensions: ['png'] }],
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle('install-overlay-png', async (_event, photosDir: string, sourcePath: string) => {
  if (!photosDir || !sourcePath) throw new Error('Falta carpeta o archivo PNG')
  const destDir = path.join(photosDir, '.fotomirror')
  await fs.mkdir(destDir, { recursive: true })
  const dest = path.join(destDir, 'overlay.png')
  await fs.copyFile(sourcePath, dest)
  return dest
})

ipcMain.handle('clear-overlay-png', async (_event, photosDir: string) => {
  if (!photosDir) return
  const dest = path.join(photosDir, '.fotomirror', 'overlay.png')
  await fs.unlink(dest).catch(() => undefined)
})

ipcMain.handle('get-overlay-png-path', async (_event, photosDir: string) => {
  if (!photosDir) return null
  const dest = path.join(photosDir, '.fotomirror', 'overlay.png')
  try {
    await fs.access(dest)
    return dest
  } catch {
    return null
  }
})

ipcMain.handle('get-overlay-png-data-url', async (_event, photosDir: string) => {
  if (!photosDir) return null
  const dest = path.join(photosDir, '.fotomirror', 'overlay.png')
  try {
    const buf = await fs.readFile(dest)
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
})

ipcMain.handle('get-download-base-url', () => getDownloadBaseUrl())

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64, 'base64')
}

async function moveOrCopy(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.rename(sourcePath, destPath)
  } catch {
    await fs.copyFile(sourcePath, destPath)
    await fs.unlink(sourcePath).catch(() => undefined)
  }
}

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
    const filePath = path.join(photosDir, filename)
    await fs.writeFile(filePath, dataUrlToBuffer(dataUrl))
    return {
      filePath,
      downloadUrl: buildPhotoDownloadUrl(filename, themeId),
    }
  },
)

ipcMain.handle(
  'save-event-photos',
  async (
    _event,
    input: {
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
    },
  ) => {
    const originalesDir = path.join(input.photosDir, 'originales')
    const editadasDir = path.join(input.photosDir, 'editadas')
    await fs.mkdir(originalesDir, { recursive: true })
    await fs.mkdir(editadasDir, { recursive: true })

    const originalPath = path.join(originalesDir, input.filename)
    const editedPath = path.join(editadasDir, input.filename)

    if (input.originalFilePath) {
      await moveOrCopy(input.originalFilePath, originalPath)
    } else if (input.originalDataUrl) {
      await fs.writeFile(originalPath, dataUrlToBuffer(input.originalDataUrl))
    } else {
      throw new Error('Falta original (archivo o data URL)')
    }

    if (input.reuseOriginalAsEdited) {
      await fs.copyFile(originalPath, editedPath)
    } else if (input.editedDataUrl) {
      await fs.writeFile(editedPath, dataUrlToBuffer(input.editedDataUrl))
    } else {
      throw new Error('Falta foto editada')
    }

    const photoId = photoIdFromFilename(input.filename)
    if (photoId) {
      const registry = getEventRegistry() ?? openEventRegistry(input.photosDir)
      registry.registerIndividual({
        photoId,
        filename: input.filename,
        printMeta: {
          originalFilename: input.filename,
          signText: input.printMeta?.signText ?? null,
          signX: input.printMeta?.signX ?? null,
          signY: input.printMeta?.signY ?? null,
          signFontId: input.printMeta?.signFontId ?? null,
          signSizeId: input.printMeta?.signSizeId ?? null,
          themeId: input.printMeta?.themeId ?? input.themeId ?? null,
          previewRotation: input.printMeta?.previewRotation ?? null,
          needsOrientationPass: input.printMeta?.needsOrientationPass ?? false,
          overlayMode: input.printMeta?.overlayMode ?? null,
          overlayScale: input.printMeta?.overlayScale ?? null,
        },
      })
    }

    return {
      filePath: editedPath,
      downloadUrl: buildPhotoDownloadUrl(input.filename, input.themeId),
    }
  },
)

ipcMain.handle(
  'save-strip-photos',
  async (
    _event,
    input: {
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
    },
  ) => {
    const originalesDir = path.join(input.photosDir, 'originales')
    const editadasDir = path.join(input.photosDir, 'editadas')
    await fs.mkdir(originalesDir, { recursive: true })
    await fs.mkdir(editadasDir, { recursive: true })

    const poseCount = input.stripKind === 'strip2' ? 2 : 3
    const poseFilenames = Array.from(
      { length: poseCount },
      (_, i) => `tira-${input.stripId}-${i + 1}.jpg`,
    )

    for (const poseInput of input.poses) {
      const filename = poseFilenames[poseInput.pose - 1]
      if (!filename) throw new Error(`Pose inválida: ${poseInput.pose}`)
      const originalPath = path.join(originalesDir, filename)
      const editedPath = path.join(editadasDir, filename)

      if (poseInput.originalFilePath) {
        await moveOrCopy(poseInput.originalFilePath, originalPath)
      } else if (poseInput.originalDataUrl) {
        await fs.writeFile(originalPath, dataUrlToBuffer(poseInput.originalDataUrl))
      } else {
        throw new Error(`Falta original para pose ${poseInput.pose}`)
      }

      if (poseInput.reuseOriginalAsEdited) {
        await fs.copyFile(originalPath, editedPath)
      } else {
        await fs.writeFile(editedPath, dataUrlToBuffer(poseInput.editedDataUrl))
      }
    }

    const stripFilename = `tira-${input.stripId}-strip.jpg`
    const stripPath = path.join(editadasDir, stripFilename)
    await fs.writeFile(stripPath, dataUrlToBuffer(input.stripDataUrl))

    const registry = getEventRegistry() ?? openEventRegistry(input.photosDir)
    registry.registerStrip({
      stripId: input.stripId,
      stripKind: input.stripKind,
      stripFilename,
      poseFilenames,
      signText: input.signText ?? null,
      themeId: input.themeId ?? null,
      previewRotation: input.previewRotation ?? null,
    })

    return {
      filePath: stripPath,
      downloadUrl: buildPhotoDownloadUrl(stripFilename, input.themeId),
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
  const registry = getEventRegistry()
  if (registry) registry.closeSession()
  stopPrintWorker()
  closeEventRegistry()
  app.quit()
})
