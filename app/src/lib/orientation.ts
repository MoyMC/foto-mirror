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
