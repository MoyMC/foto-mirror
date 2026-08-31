export type PreviewRotation = 0 | 90 | 180 | 270

export const PREVIEW_ROTATIONS: PreviewRotation[] = [0, 90, 180, 270]

export const DEFAULT_PREVIEW_ROTATION: PreviewRotation = 90

export function normalizePreviewRotation(value: unknown): PreviewRotation {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === 0 || n === 90 || n === 180 || n === 270) return n
  return DEFAULT_PREVIEW_ROTATION
}

export function outputSizeForRotation(
  width: number,
  height: number,
  rotation: PreviewRotation,
): { width: number; height: number } {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width }
  }
  return { width, height }
}

/**
 * El preview usa espejo (scaleX(-1)) + rotación. Al guardar sin espejo,
 * 90° y 270° se invierten para que “arriba” coincida con lo que se ve en vivo.
 */
export function captureRotationFromPreview(preview: PreviewRotation): PreviewRotation {
  if (preview === 90) return 270
  if (preview === 270) return 90
  return preview
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

/**
 * El letrero se coloca en coords. de pantalla sobre el preview (espejo + rotación).
 * La foto guardada usa captureRotationFromPreview sin espejo.
 */
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

/** CSS transform: espejo + rotación. Con 90/270 el video se centra con translate. */
export function previewCssTransform(rotation: PreviewRotation): string {
  const swap = rotation === 90 || rotation === 270
  const parts: string[] = []
  if (swap) parts.push('translate(-50%, -50%)')
  if (rotation !== 0) parts.push(`rotate(${rotation}deg)`)
  parts.push('scaleX(-1)')
  return parts.join(' ')
}

/** Dibuja el frame rotado (sin espejo) centrado en un canvas ya dimensionado. */
export function drawRotatedImage(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  rotation: PreviewRotation,
): void {
  const { width: outW, height: outH } = outputSizeForRotation(srcW, srcH, rotation)
  ctx.save()
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(source, -srcW / 2, -srcH / 2, srcW, srcH)
  ctx.restore()
}
