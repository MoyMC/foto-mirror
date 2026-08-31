import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i

export async function listImageFilesInDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile() && IMAGE_EXT.test(e.name))
      .map((e) => path.join(dir, e.name))

    const withMtime = await Promise.all(
      files.map(async (filePath) => {
        const stat = await fs.stat(filePath)
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
