import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { getEventRegistry } from './eventRegistry'
import { isPrintingEnabled } from './printConfig'
import type { PrintRequestOptions } from './printTypes'

const PORT = 8787

let server: http.Server | null = null
let activePhotosDir: string | null = null
let slideshowMemoriesDir: string | null = null

function getLocalIp(): string {
  for (const iface of Object.values(networkInterfaces())) {
    for (const cfg of iface ?? []) {
      if (cfg.family === 'IPv4' && !cfg.internal) return cfg.address
    }
  }
  return '127.0.0.1'
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
  }
  return types[ext] ?? 'application/octet-stream'
}

function resolveDownloadPageRoot(): string {
  const candidates = [
    typeof process.resourcesPath === 'string'
      ? path.join(process.resourcesPath, 'download-page')
      : '',
    path.join(__dirname, '..', 'resources', 'download-page'),
    path.join(process.cwd(), 'resources', 'download-page'),
  ].filter(Boolean)

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir
  }
  return candidates[0] ?? path.join(__dirname, '..', 'resources', 'download-page')
}

function isSafeFilename(filename: string): boolean {
  return Boolean(filename) && !filename.includes('..') && !filename.includes('/') && !filename.includes('\\')
}

async function sendFile(res: http.ServerResponse, filePath: string, status = 200): Promise<void> {
  const data = await fsPromises.readFile(filePath)
  res.writeHead(status, {
    'Content-Type': contentType(filePath),
    'Content-Length': data.length,
    'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
  })
  res.end(data)
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  return JSON.parse(raw) as unknown
}

function resolvePrintQrFilename(body: unknown, urlPath: string): string | null {
  if (body && typeof body === 'object' && 'qrFilename' in body) {
    const value = (body as { qrFilename?: unknown }).qrFilename
    if (typeof value === 'string' && isSafeFilename(value)) return value
  }
  const match = urlPath.match(/^\/api\/print\/status\/([^/]+)$/)
  if (match) {
    const filename = decodeURIComponent(match[1])
    if (isSafeFilename(filename)) return filename
  }
  return null
}

function printQrFromQuery(rawUrl: string): string | null {
  const query = rawUrl.includes('?') ? rawUrl.split('?')[1] : ''
  const qr = new URLSearchParams(query).get('qr')
  if (!qr) return null
  const filename = decodeURIComponent(qr)
  return isSafeFilename(filename) ? filename : null
}

export function getDownloadBaseUrl(): string {
  return `http://${getLocalIp()}:${PORT}`
}

/** URL HTTP para el renderer (misma máquina; evita bloqueo de file://). */
export function getLocalPhotoServerBaseUrl(): string {
  return `http://127.0.0.1:${PORT}`
}

export function setSlideshowMemoriesDir(dir: string | null): void {
  slideshowMemoriesDir = dir ? path.normalize(dir) : null
}

export function buildSlideshowImageUrl(filePath: string): string | null {
  if (!filePath) return null
  const normalized = path.normalize(filePath)
  const base = getLocalPhotoServerBaseUrl()

  if (slideshowMemoriesDir) {
    const root = path.normalize(slideshowMemoriesDir)
    if (normalized.startsWith(root)) {
      const filename = path.basename(normalized)
      if (!isSafeFilename(filename)) return null
      return `${base}/slideshow/${encodeURIComponent(filename)}`
    }
  }

  if (activePhotosDir) {
    const root = path.normalize(activePhotosDir)
    if (normalized.startsWith(root)) {
      const filename = path.basename(normalized)
      if (!isSafeFilename(filename)) return null
      return `${base}/fotos/${encodeURIComponent(filename)}`
    }
  }

  return null
}

export async function startPhotoServer(photosDir: string): Promise<string> {
  activePhotosDir = path.join(photosDir, 'editadas')
  await fsPromises.mkdir(photosDir, { recursive: true })
  await fsPromises.mkdir(activePhotosDir, { recursive: true })
  await fsPromises.mkdir(path.join(photosDir, 'originales'), { recursive: true })

  if (server) {
    return getDownloadBaseUrl()
  }

  const pageRoot = resolveDownloadPageRoot()

  server = http.createServer(async (req, res) => {
    try {
      const rawUrl = req.url ?? '/'
      const urlPath = decodeURIComponent(rawUrl.split('?')[0] ?? '/')
      const method = req.method ?? 'GET'

      if (method === 'GET' && urlPath === '/api/config') {
        sendJson(res, 200, { printEnabled: isPrintingEnabled() })
        return
      }

      if (method === 'POST' && urlPath === '/api/print') {
        if (!isPrintingEnabled()) {
          sendJson(res, 403, {
            ok: false,
            message: 'La impresión no está habilitada en este evento',
          })
          return
        }
        const registry = getEventRegistry()
        if (!registry) {
          sendJson(res, 503, { ok: false, message: 'Servidor no listo' })
          return
        }
        let body: unknown
        try {
          body = await readJsonBody(req)
        } catch {
          sendJson(res, 400, { ok: false, message: 'JSON inválido' })
          return
        }
        const qrFilename = resolvePrintQrFilename(body, urlPath)
        if (!qrFilename) {
          sendJson(res, 400, { ok: false, message: 'Falta qrFilename' })
          return
        }
        const options: PrintRequestOptions =
          body && typeof body === 'object'
            ? {
                templateId:
                  'templateId' in body && typeof (body as { templateId?: unknown }).templateId === 'string'
                    ? (body as { templateId: string }).templateId
                    : undefined,
                crops:
                  'crops' in body && Array.isArray((body as { crops?: unknown }).crops)
                    ? ((body as { crops: Array<{ x: number; y: number; w: number; h: number }> }).crops)
                    : undefined,
                frameOptions:
                  'frameOptions' in body &&
                  (body as { frameOptions?: unknown }).frameOptions &&
                  typeof (body as { frameOptions?: unknown }).frameOptions === 'object'
                    ? ((body as { frameOptions: PrintRequestOptions['frameOptions'] }).frameOptions)
                    : undefined,
              }
            : {}
        sendJson(res, 200, registry.requestPrint(qrFilename, options))
        return
      }

      if (method === 'GET' && (urlPath === '/api/print/status' || urlPath.startsWith('/api/print/status/'))) {
        const registry = getEventRegistry()
        if (!registry) {
          sendJson(res, 503, { ok: false, message: 'Servidor no listo' })
          return
        }
        const qrFilename = printQrFromQuery(rawUrl) ?? resolvePrintQrFilename(null, urlPath)
        if (!qrFilename) {
          sendJson(res, 400, { ok: false, message: 'Falta qr' })
          return
        }
        sendJson(res, 200, registry.getPrintStatus(qrFilename))
        return
      }

      if (method === 'GET' && urlPath === '/api/strip') {
        const registry = getEventRegistry()
        if (!registry) {
          sendJson(res, 503, { ok: false, message: 'Servidor no listo' })
          return
        }
        const qrFilename = printQrFromQuery(rawUrl)
        if (!qrFilename) {
          sendJson(res, 400, { ok: false, message: 'Falta qr' })
          return
        }
        const manifest = registry.getStripManifest(qrFilename)
        if (!manifest) {
          sendJson(res, 404, { ok: false, message: 'Tira no encontrada' })
          return
        }
        sendJson(res, 200, manifest)
        return
      }

      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }

      // Página de descarga (QR) → SPA
      if (urlPath === '/f' || urlPath.startsWith('/f/')) {
        const indexPath = path.join(pageRoot, 'index.html')
        if (!fs.existsSync(indexPath)) {
          res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('Página de descarga no disponible. Ejecuta npm run build:download-page')
          return
        }
        await sendFile(res, indexPath)
        return
      }

      // Assets de la SPA (/assets/…)
      if (urlPath.startsWith('/assets/')) {
        const assetName = path.basename(urlPath)
        if (!isSafeFilename(assetName)) {
          res.writeHead(400)
          res.end('Bad request')
          return
        }
        const assetPath = path.join(pageRoot, 'assets', assetName)
        const normalizedRoot = path.normalize(path.join(pageRoot, 'assets'))
        if (!path.normalize(assetPath).startsWith(normalizedRoot) || !fs.existsSync(assetPath)) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        await sendFile(res, assetPath)
        return
      }

      // JPEG / imagen
      const fotoMatch = urlPath.match(/^\/fotos\/([^/]+)$/)
      if (fotoMatch) {
        if (!activePhotosDir) {
          res.writeHead(503)
          res.end('Server not ready')
          return
        }
        const filename = decodeURIComponent(fotoMatch[1])
        if (!isSafeFilename(filename)) {
          res.writeHead(400)
          res.end('Bad request')
          return
        }
        const filePath = path.join(activePhotosDir, filename)
        const normalizedRoot = path.normalize(activePhotosDir)
        if (!path.normalize(filePath).startsWith(normalizedRoot)) {
          res.writeHead(403)
          res.end('Forbidden')
          return
        }
        await sendFile(res, filePath)
        return
      }

      const slideshowMatch = urlPath.match(/^\/slideshow\/([^/]+)$/)
      if (slideshowMatch) {
        if (!slideshowMemoriesDir) {
          res.writeHead(503)
          res.end('Server not ready')
          return
        }
        const filename = decodeURIComponent(slideshowMatch[1])
        if (!isSafeFilename(filename)) {
          res.writeHead(400)
          res.end('Bad request')
          return
        }
        const filePath = path.join(slideshowMemoriesDir, filename)
        const normalizedRoot = path.normalize(slideshowMemoriesDir)
        if (!path.normalize(filePath).startsWith(normalizedRoot)) {
          res.writeHead(403)
          res.end('Forbidden')
          return
        }
        await sendFile(res, filePath)
        return
      }

      res.writeHead(404)
      res.end('Not found')
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server!.listen(PORT, '0.0.0.0', () => resolve())
    server!.on('error', reject)
  })

  return getDownloadBaseUrl()
}

export function stopPhotoServer(): void {
  if (server) {
    server.close()
    server = null
  }
  activePhotosDir = null
  slideshowMemoriesDir = null
}

/** URL del QR: página de descarga (no el JPEG directo). */
export function buildPhotoDownloadUrl(filename: string, themeId?: string): string {
  const url = new URL(`${getDownloadBaseUrl()}/f/${encodeURIComponent(filename)}`)
  if (themeId) url.searchParams.set('theme', themeId)
  return url.toString()
}
