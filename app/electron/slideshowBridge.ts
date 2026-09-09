import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i
const VIDEO_EXT = /\.(mp4|webm|mov)$/i
const MEDIA_EXT = /\.(jpe?g|png|webp|mp4|webm|mov)$/i

export function isImageFileName(name: string): boolean {
  return IMAGE_EXT.test(name)
}

export function isVideoFileName(name: string): boolean {
  return VIDEO_EXT.test(name)
}

export function isMediaFileName(name: string): boolean {
  return MEDIA_EXT.test(name)
}

/** Images only (event editadas slideshow). */
export async function listImageFilesInDir(dir: string): Promise<string[]> {
  return listFilesInDir(dir, IMAGE_EXT)
}

/** Images + videos for memories folder. */
export async function listMediaFilesInDir(dir: string): Promise<string[]> {
  return listFilesInDir(dir, MEDIA_EXT)
}

async function listFilesInDir(dir: string, ext: RegExp): Promise<string[]> {
  try {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile() && ext.test(e.name))
      .map((e) => path.join(dir, e.name))

    const withMtime = await Promise.all(
      files.map(async (filePath) => {
        const stat = await fsPromises.stat(filePath)
        return { filePath, mtime: stat.mtimeMs }
      }),
    )

    withMtime.sort((a, b) => b.mtime - a.mtime)
    return withMtime.map((f) => f.filePath)
  } catch {
    return []
  }
}

export function filePathToUrl(filePath: string): string {
  return pathToFileURL(filePath).href
}

export function mediaContentType(filePath: string): string {
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
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
  }
  return types[ext] ?? 'application/octet-stream'
}

/** Stream a file; supports HTTP Range for video playback. */
export async function sendMediaFile(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
): Promise<void> {
  const stat = await fsPromises.stat(filePath)
  const total = stat.size
  const type = mediaContentType(filePath)
  const range = req.headers.range

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` })
      res.end()
      return
    }
    const start = match[1] ? Number(match[1]) : 0
    const end = match[2] ? Number(match[2]) : total - 1
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end >= total ||
      start > end
    ) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` })
      res.end()
      return
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
    return
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': total,
    'Accept-Ranges': 'bytes',
    'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
  })
  fs.createReadStream(filePath).pipe(res)
}
