import http from 'node:http'
import path from 'node:path'
import { createReadStream, existsSync, statSync } from 'node:fs'

const PORT = 8788

let server: http.Server | null = null
let eventsRoot: string | null = null

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  return types[ext] ?? 'application/octet-stream'
}

export function getEventosBaseUrl(): string {
  return `http://127.0.0.1:${PORT}`
}

export async function startEventsServer(root: string): Promise<string> {
  eventsRoot = root

  if (server) {
    return getEventosBaseUrl()
  }

  server = http.createServer((req, res) => {
    try {
      if (!eventsRoot || req.method !== 'GET') {
        res.writeHead(405)
        res.end()
        return
      }

      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
      const match = urlPath.match(/^\/eventos\/(.+)$/)
      if (!match) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const relative = match[1]
      if (relative.includes('..')) {
        res.writeHead(400)
        res.end('Bad request')
        return
      }

      const filePath = path.normalize(path.join(eventsRoot, relative))
      const normalizedRoot = path.normalize(eventsRoot)
      if (!filePath.startsWith(normalizedRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      res.writeHead(200, {
        'Content-Type': contentType(filePath),
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      })
      createReadStream(filePath).pipe(res)
    } catch {
      res.writeHead(500)
      res.end('Error')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server!.listen(PORT, '127.0.0.1', () => resolve())
    server!.on('error', reject)
  })

  return getEventosBaseUrl()
}

export function stopEventsServer(): void {
  if (server) {
    server.close()
    server = null
  }
  eventsRoot = null
}
