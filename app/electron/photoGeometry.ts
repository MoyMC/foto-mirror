export type PreviewRotation = 0 | 90 | 180 | 270

export interface CropRect {
  left: number
  top: number
  width: number
  height: number
}

export function cropRect3x2(width: number, height: number): CropRect {
  const target = 3 / 2
  const current = width / height
  if (current > target + 0.001) {
    const cropW = Math.round(height * target)
    return { left: Math.round((width - cropW) / 2), top: 0, width: cropW, height }
  }
  if (current < target - 0.001) {
    const cropH = Math.round(width / target)
    return { left: 0, top: Math.round((height - cropH) / 2), width, height: cropH }
  }
  return { left: 0, top: 0, width, height }
}

export function cropRect2x3(width: number, height: number): CropRect {
  const target = 2 / 3
  const current = width / height
  if (current > target + 0.001) {
    const cropW = Math.round(height * target)
    return { left: Math.round((width - cropW) / 2), top: 0, width: cropW, height }
  }
  if (current < target - 0.001) {
    const cropH = Math.round(width / target)
    return { left: 0, top: Math.round((height - cropH) / 2), width, height: cropH }
  }
  return { left: 0, top: 0, width, height }
}

export function mapSignPercentThroughCrop(
  x: number,
  y: number,
  fullWidth: number,
  fullHeight: number,
  crop: CropRect,
): { x: number; y: number } {
  const cx = (fullWidth * x) / 100
  const cy = (fullHeight * y) / 100
  return {
    x: ((cx - crop.left) / crop.width) * 100,
    y: ((cy - crop.top) / crop.height) * 100,
  }
}

export function captureRotationFromPreview(preview: PreviewRotation): PreviewRotation {
  if (preview === 90) return 270
  if (preview === 270) return 90
  return preview
}

export function normalizePreviewRotation(value: unknown): PreviewRotation {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === 0 || n === 90 || n === 180 || n === 270) return n
  return 90
}

function rotateNormalized(u: number, v: number, degrees: number): [number, number] {
  const rad = (degrees * Math.PI) / 180
  const cx = u - 0.5
  const cy = v - 0.5
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [cos * cx - sin * cy + 0.5, sin * cx + cos * cy + 0.5]
}

function mirrorNormalized(u: number, v: number): [number, number] {
  return [1 - u, v]
}

export function mapSignPreviewToPhoto(
  sx: number,
  sy: number,
  previewRotation: PreviewRotation,
): { x: number; y: number } {
  const [mx, my] = rotateNormalized(sx / 100, sy / 100, -previewRotation)
  const [u, v] = mirrorNormalized(mx, my)
  const captureRotation = captureRotationFromPreview(previewRotation)
  const [px, py] = rotateNormalized(u, v, captureRotation)
  return {
    x: Math.round(px * 1000) / 10,
    y: Math.round(py * 1000) / 10,
  }
}

export function clampSignPercent(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback
  return Math.min(92, Math.max(8, n))
}

/**
 * Wizard rotation → print sheet layout (see product sketch).
 * 0° = laptop / apaisado 6×4; 90° = espejo / vertical 4×6.
 */
export function printLayoutForPreviewRotation(rotation: PreviewRotation): 'portrait' | 'landscape' {
  return rotation === 90 || rotation === 270 ? 'portrait' : 'landscape'
}

export function cropRectForPrintLayout(
  width: number,
  height: number,
  layout: 'portrait' | 'landscape',
): CropRect {
  return layout === 'portrait' ? cropRect2x3(width, height) : cropRect3x2(width, height)
}

export function clampSignCenter(
  x: number,
  y: number,
  halfWidthPx: number,
  halfHeightPx: number,
  viewWidthPx: number,
  viewHeightPx: number,
  padPx = 12,
): { x: number; y: number } {
  const axis = (value: number, half: number, view: number) => {
    if (!view || half <= 0) return clampSignPercent(value, 50)
    const min = ((half + padPx) / view) * 100
    const max = 100 - min
    if (min >= max) return 50
    return Math.min(max, Math.max(min, value))
  }
  return {
    x: axis(x, halfWidthPx, viewWidthPx),
    y: axis(y, halfHeightPx, viewHeightPx),
  }
}
