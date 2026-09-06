import sharp from 'sharp'
import { buildStripFrameSvg } from './frames/buildFrameSvg'
import {
  S2_PHOTOS,
  S3_PHOTOS,
  STRIP_FRAME_DESIGN_H,
  STRIP_FRAME_DESIGN_W,
  stripFrameById,
} from './frames/catalog'
import {
  captureRotationFromPreview,
  normalizePreviewRotation,
  type PreviewRotation,
} from './photoGeometry'
import { SHEET_HEIGHT_PX, SHEET_WIDTH_PX, STRIP_WIDTH_PX } from './printConfig'
import type { PrintCropRect } from './printTypes'

export interface StripComposeOptions {
  templateId?: string | null
  crops?: PrintCropRect[] | null
  signText?: string | null
  themeId?: string | null
  /** Wizard preview rotation; used only when falling back to originales/. */
  previewRotation?: number | null
}

function defaultCrop(targetAspect: number): PrintCropRect {
  // Center crop assuming ~2:3 or 16:9 source; refined by actual image in extractPose.
  if (targetAspect < 1) {
    return { x: 0.15, y: 0, w: 0.7, h: 1 }
  }
  return { x: 0, y: 0.1, w: 1, h: 0.8 }
}

function transformCropForRotation(
  crop: PrintCropRect | undefined,
  rotation: PreviewRotation,
): PrintCropRect | undefined {
  if (!crop || rotation === 0) return crop
  const { x, y, w, h } = crop
  if (rotation === 90) return { x: y, y: 1 - x - w, w: h, h: w }
  if (rotation === 270) return { x: 1 - y - h, y: x, w: h, h: w }
  if (rotation === 180) return { x: 1 - x - w, y: 1 - y - h, w, h }
  return crop
}

async function resolvePoseSource(
  originalPath: string,
  editedPath: string,
  previewRotation: number | null | undefined,
): Promise<{
  filePath: string
  captureRotation: PreviewRotation
  /** as-is: crops match pixels; transform: crops were on pre-rotate landscape; default: ignore crops */
  cropMode: 'as-is' | 'transform' | 'default'
}> {
  // Crops from the download page are relative to editadas/ (already oriented).
  try {
    const meta = await sharp(editedPath).rotate().metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    // Legacy / mis-saved editadas may still be sensor-landscape; rotate to match wizard.
    if (width > height * 1.05) {
      const preview = normalizePreviewRotation(previewRotation ?? 90)
      return {
        filePath: editedPath,
        captureRotation: captureRotationFromPreview(preview),
        cropMode: 'transform',
      }
    }
    return { filePath: editedPath, captureRotation: 0, cropMode: 'as-is' }
  } catch {
    try {
      await sharp(originalPath).metadata()
      const preview = normalizePreviewRotation(previewRotation ?? 90)
      return {
        filePath: originalPath,
        captureRotation: captureRotationFromPreview(preview),
        // Web crops were authored against editadas, not sensor JPEG.
        cropMode: 'default',
      }
    } catch {
      return { filePath: editedPath, captureRotation: 0, cropMode: 'as-is' }
    }
  }
}

async function extractPose(
  filePath: string,
  crop: PrintCropRect | undefined,
  outW: number,
  outH: number,
  captureRotation: PreviewRotation = 0,
  cropMode: 'as-is' | 'transform' | 'default' = 'as-is',
): Promise<Buffer> {
  let pipeline = sharp(filePath).rotate()
  if (captureRotation !== 0) {
    pipeline = pipeline.rotate(captureRotation)
  }

  const oriented = await pipeline.toBuffer({ resolveWithObject: true })
  const width = oriented.info.width
  const height = oriented.info.height
  const targetAspect = outW / outH

  let effectiveCrop: PrintCropRect | undefined
  if (cropMode === 'default') {
    effectiveCrop = undefined
  } else if (cropMode === 'transform') {
    effectiveCrop = transformCropForRotation(crop, captureRotation)
  } else {
    effectiveCrop = crop
  }

  const rect = effectiveCrop ?? defaultCrop(targetAspect)

  let left = Math.round(rect.x * width)
  let top = Math.round(rect.y * height)
  let cropW = Math.round(rect.w * width)
  let cropH = Math.round(rect.h * height)

  left = Math.max(0, Math.min(left, width - 1))
  top = Math.max(0, Math.min(top, height - 1))
  cropW = Math.max(1, Math.min(cropW, width - left))
  cropH = Math.max(1, Math.min(cropH, height - top))

  return sharp(oriented.data)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(outW, outH, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 95 })
    .toBuffer()
}

/** One strip2 at design size 700×1800, then scaled to half-sheet 600×1800 for pairing. */
async function composeOneStrip2(
  poses: Array<{
    filePath: string
    captureRotation: PreviewRotation
    cropMode: 'as-is' | 'transform' | 'default'
  }>,
  options: StripComposeOptions,
): Promise<Buffer> {
  const frame = stripFrameById(options.templateId)
  const crops = options.crops ?? []
  const designW = STRIP_FRAME_DESIGN_W.strip2
  const designH = STRIP_FRAME_DESIGN_H

  const photos = await Promise.all(
    S2_PHOTOS.map((slot, i) =>
      extractPose(
        poses[i].filePath,
        crops[i],
        slot.w,
        slot.h,
        poses[i].captureRotation,
        poses[i].cropMode,
      ),
    ),
  )

  const { svg } = buildStripFrameSvg(frame, 'strip2', options.signText ?? '')
  const framePng = await sharp(svg)
    .resize(designW, designH)
    .ensureAlpha()
    .png()
    .toBuffer()

  const composed = await sharp({
    create: {
      width: designW,
      height: designH,
      channels: 3,
      background: frame.colors.frame,
    },
  })
    .composite([
      ...photos.map((photo, i) => ({
        input: photo,
        left: S2_PHOTOS[i].x,
        top: S2_PHOTOS[i].y,
      })),
      { input: framePng, left: 0, top: 0 },
    ])
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer()

  // Fit two strips on a 4×6 sheet (1200×1800).
  return sharp(composed)
    .resize(STRIP_WIDTH_PX, SHEET_HEIGHT_PX, { fit: 'fill' })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer()
}

export async function composeStrip2PairSheet(
  left: { originals: string[]; edited: string[]; options: StripComposeOptions },
  right: { originals: string[]; edited: string[]; options: StripComposeOptions },
): Promise<Buffer> {
  const leftPoses = await Promise.all([
    resolvePoseSource(left.originals[0], left.edited[0], left.options.previewRotation),
    resolvePoseSource(left.originals[1], left.edited[1], left.options.previewRotation),
  ])
  const rightPoses = await Promise.all([
    resolvePoseSource(right.originals[0], right.edited[0], right.options.previewRotation),
    resolvePoseSource(right.originals[1], right.edited[1], right.options.previewRotation),
  ])

  const [leftBuf, rightBuf] = await Promise.all([
    composeOneStrip2(leftPoses, left.options),
    composeOneStrip2(rightPoses, right.options),
  ])

  return sharp({
    create: {
      width: SHEET_WIDTH_PX,
      height: SHEET_HEIGHT_PX,
      channels: 3,
      background: '#000000',
    },
  })
    .composite([
      { input: leftBuf, left: 0, top: 0 },
      { input: rightBuf, left: STRIP_WIDTH_PX, top: 0 },
    ])
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer()
}

/** Full-sheet 3-photo strip at 1200×1800. */
export async function composeStrip3Sheet(
  originals: string[],
  edited: string[],
  options: StripComposeOptions,
): Promise<Buffer> {
  const frame = stripFrameById(options.templateId)
  const crops = options.crops ?? []
  const designW = STRIP_FRAME_DESIGN_W.strip3
  const designH = STRIP_FRAME_DESIGN_H

  const poses = await Promise.all(
    [0, 1, 2].map((i) => resolvePoseSource(originals[i], edited[i], options.previewRotation)),
  )
  const photos = await Promise.all(
    S3_PHOTOS.map((slot, i) =>
      extractPose(
        poses[i].filePath,
        crops[i],
        slot.w,
        slot.h,
        poses[i].captureRotation,
        poses[i].cropMode,
      ),
    ),
  )

  const { svg } = buildStripFrameSvg(frame, 'strip3', options.signText ?? '')
  const framePng = await sharp(svg)
    .resize(designW, designH)
    .ensureAlpha()
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: designW,
      height: designH,
      channels: 3,
      background: frame.colors.frame,
    },
  })
    .composite([
      ...photos.map((photo, i) => ({
        input: photo,
        left: S3_PHOTOS[i].x,
        top: S3_PHOTOS[i].y,
      })),
      { input: framePng, left: 0, top: 0 },
    ])
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer()
}
