export type PhotoMode = 'individual' | 'strip2' | 'strip3'

export type StripKind = 'strip2' | 'strip3'

export const STRIP_FLASH_MS = 900

export function isStripMode(mode: PhotoMode): mode is StripKind {
  return mode === 'strip2' || mode === 'strip3'
}

export function poseCountForMode(mode: PhotoMode): number {
  if (mode === 'strip2') return 2
  if (mode === 'strip3') return 3
  return 1
}

export function createStripId(): string {
  return String(Date.now())
}

export function stripPoseFilename(stripId: string, pose: number): string {
  return `tira-${stripId}-${pose}.jpg`
}

export function stripCompositeFilename(stripId: string): string {
  return `tira-${stripId}-strip.jpg`
}

export function parseStripDownloadFilename(filename: string): string | null {
  const match = filename.match(/^tira-(\d+)-strip\.jpg$/i)
  return match ? match[1] : null
}
