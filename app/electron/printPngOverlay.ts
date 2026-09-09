import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  clampSignCenter,
  mapSignPercentThroughCrop,
  mapSignPreviewToPhoto,
  type CropRect,
  type PreviewRotation,
} from './photoGeometry'

const MIN_SCALE = 0.25
const MAX_SCALE = 2.5
const BASE_FRACTION = 0.4

function clampScale(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

export interface PrintPngOverlayOptions {
  overlayPath: string
  signX: number
  signY: number
  scale: number
  previewRotation?: number | null
  fullWidth: number
  fullHeight: number
  crop: CropRect
}

/**
 * Resize PNG to target sheet size and place at mapped %, returning a transparent
 * full-sheet PNG suitable for sharp.composite.
 */
export async function renderFileOverlayPng(
  width: number,
  height: number,
  options: PrintPngOverlayOptions,
): Promise<Buffer | null> {
  if (!fs.existsSync(options.overlayPath)) return null

  const meta = await sharp(options.overlayPath).metadata()
  const natW = meta.width ?? 0
  const natH = meta.height ?? 0
  if (!natW || !natH) return null

  const scale = clampScale(options.scale)
  const side = Math.min(width, height)
  const targetW = Math.max(1, Math.round(side * BASE_FRACTION * scale))
  const targetH = Math.max(1, Math.round(targetW * (natH / natW)))

  const rotation = (options.previewRotation ?? 90) as PreviewRotation
  const mapped = mapSignPreviewToPhoto(options.signX, options.signY, rotation)
  const onCrop = mapSignPercentThroughCrop(
    mapped.x,
    mapped.y,
    options.fullWidth,
    options.fullHeight,
    options.crop,
  )
  const fitted = clampSignCenter(
    onCrop.x,
    onCrop.y,
    targetW / 2,
    targetH / 2,
    width,
    height,
    Math.round(Math.min(width, height) * 0.02),
  )
  const left = Math.round((width * fitted.x) / 100 - targetW / 2)
  const top = Math.round((height * fitted.y) / 100 - targetH / 2)

  const resized = await sharp(options.overlayPath)
    .resize(targetW, targetH, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer()

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer()
}

export function resolveEventOverlayPath(photosDir: string): string {
  return path.join(photosDir, '.fotomirror', 'overlay.png')
}
