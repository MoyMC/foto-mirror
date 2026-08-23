import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { networkInterfaces } from 'node:os'

const PORT = 8787

let server: http.Server | null = null
let activePhotosDir: string | null = null

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

export function getDownloadBaseUrl(): string {
  return `http://${getLocalIp()}:${PORT}`
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
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }

      const rawUrl = req.url ?? '/'
      const urlPath = decodeURIComponent(rawUrl.split('?')[0] ?? '/')

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
        const filename = fotoMatch[1]
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
}

/** URL del QR: página de descarga (no el JPEG directo). */
export function buildPhotoDownloadUrl(filename: string, themeId?: string): string {
  const url = new URL(`${getDownloadBaseUrl()}/f/${encodeURIComponent(filename)}`)
  if (themeId) url.searchParams.set('theme', themeId)
  return url.toString()
}
