/** Event overlay: neon text OR a single PNG (mutually exclusive). */

export type OverlayMode = 'none' | 'text' | 'png'

export const OVERLAY_FILE_NAME = 'overlay.png'
export const DEFAULT_OVERLAY_SCALE = 1
export const MIN_OVERLAY_SCALE = 0.25
export const MAX_OVERLAY_SCALE = 2.5

/** Relative to the shorter canvas side: width = side * BASE * scale */
export const OVERLAY_BASE_FRACTION = 0.4

export function normalizeOverlayMode(value: unknown): OverlayMode {
  if (value === 'text' || value === 'png' || value === 'none') return value
  return 'none'
}

export function clampOverlayScale(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_OVERLAY_SCALE
  return Math.min(MAX_OVERLAY_SCALE, Math.max(MIN_OVERLAY_SCALE, n))
}

export function overlayPngRelativePath(): string {
  return `.fotomirror/${OVERLAY_FILE_NAME}`
}

export function hasActiveOverlay(
  mode: OverlayMode,
  opts: { hasText: boolean; hasPng: boolean },
): boolean {
  if (mode === 'text') return opts.hasText
  if (mode === 'png') return opts.hasPng
  return false
}

/** Display size keeping aspect ratio; width driven by canvas + scale. */
export function overlayDisplaySize(
  naturalW: number,
  naturalH: number,
  canvasW: number,
  canvasH: number,
  scale: number,
): { width: number; height: number } {
  const side = Math.min(canvasW, canvasH)
  const targetW = side * OVERLAY_BASE_FRACTION * clampOverlayScale(scale)
  const aspect = naturalW / Math.max(naturalH, 1)
  const width = Math.max(1, targetW)
  const height = Math.max(1, width / Math.max(aspect, 0.01))
  return { width, height }
}
