export type PhotoMode = 'individual' | 'strip'

export const STRIP_POSE_COUNT = 3

/** Pausa con flash entre poses (antes del siguiente countdown). */
export const STRIP_FLASH_MS = 900

export const DEFAULT_STRIP_FILTER_IDS = ['normal', 'normal', 'normal'] as const

export function createStripId(): string {
  return String(Date.now())
}

export function stripPoseFilename(stripId: string, pose: number): string {
  return `tira-${stripId}-${pose}.jpg`
}

export function stripCompositeFilename(stripId: string): string {
  return `tira-${stripId}-strip.jpg`
}

export function stripManifestFilename(stripId: string): string {
  return `tira-${stripId}.json`
}

export function parseStripDownloadFilename(filename: string): string | null {
  const match = filename.match(/^tira-(\d+)-strip\.jpg$/i)
  return match ? match[1] : null
}
