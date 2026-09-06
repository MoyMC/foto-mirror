import sharp from 'sharp'
import {
  captureRotationFromPreview,
  cropRectForPrintLayout,
  normalizePreviewRotation,
  printLayoutForPreviewRotation,
  type PreviewRotation,
} from './photoGeometry'
import { SHEET_HEIGHT_PX, SHEET_WIDTH_PX, STRIP_WIDTH_PX } from './printConfig'
import type { IndividualPrintMeta } from './printTypes'
import { renderSignOverlayPng } from './printSignOverlay'

export type PrintSheetLayout = 'portrait' | 'landscape'

export interface ComposedPrintSheet {
  buffer: Buffer
  layout: PrintSheetLayout
}

/** Two 2×6" strips side by side on a 4×6" portrait sheet. */
export async function composeStripPair(leftPath: string, rightPath: string): Promise<Buffer> {
  const [leftBuf, rightBuf] = await Promise.all([
    sharp(leftPath)
      .resize(STRIP_WIDTH_PX, SHEET_HEIGHT_PX, { fit: 'fill' })
      .toBuffer(),
    sharp(rightPath)
      .resize(STRIP_WIDTH_PX, SHEET_HEIGHT_PX, { fit: 'fill' })
      .toBuffer(),
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

/** Legacy path: print an already-edited JPEG from editadas/. */
export async function composeIndividual(photoPath: string): Promise<ComposedPrintSheet> {
  const meta = await sharp(photoPath).metadata()
  const w = meta.width ?? 1
  const h = meta.height ?? 1
  const landscapeSource = w >= h

  if (landscapeSource) {
    const buffer = await sharp(photoPath)
      .resize(SHEET_HEIGHT_PX, SHEET_WIDTH_PX, {
        fit: 'contain',
        background: '#000000',
        position: 'centre',
      })
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer()
    return { buffer, layout: 'landscape' }
  }

  const buffer = await sharp(photoPath)
    .resize(SHEET_WIDTH_PX, SHEET_HEIGHT_PX, {
      fit: 'contain',
      background: '#000000',
      position: 'centre',
    })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer()
  return { buffer, layout: 'portrait' }
}

function hasSignText(text: string | null | undefined): boolean {
  return Boolean(text?.trim())
}

function sheetPixelsForLayout(layout: PrintSheetLayout): { width: number; height: number } {
  if (layout === 'landscape') {
    return { width: SHEET_HEIGHT_PX, height: SHEET_WIDTH_PX }
  }
  return { width: SHEET_WIDTH_PX, height: SHEET_HEIGHT_PX }
}

/**
 * Print pipeline: original tether → orient → crop to sheet aspect → fill sheet → inject sign.
 * Layout follows wizard rotation (0° landscape, 90° portrait).
 */
export async function composeIndividualForPrint(
  originalPath: string,
  meta: IndividualPrintMeta | null,
  fallbackEditedPath: string | null,
): Promise<ComposedPrintSheet> {
  try {
    return await composeFromOriginal(originalPath, meta)
  } catch (err) {
    if (!fallbackEditedPath) throw err
    console.warn('[print] falling back to edited JPEG:', err instanceof Error ? err.message : err)
    return composeIndividual(fallbackEditedPath)
  }
}

async function composeFromOriginal(
  originalPath: string,
  meta: IndividualPrintMeta | null,
): Promise<ComposedPrintSheet> {
  const previewRotation = normalizePreviewRotation(meta?.previewRotation) as PreviewRotation
  const layout = printLayoutForPreviewRotation(previewRotation)
  const { width: sheetW, height: sheetH } = sheetPixelsForLayout(layout)
  const needsOrientation = Boolean(meta?.needsOrientationPass)
  const captureRotation = needsOrientation ? captureRotationFromPreview(previewRotation) : 0

  let pipeline = sharp(originalPath).rotate()
  if (captureRotation !== 0) {
    pipeline = pipeline.rotate(captureRotation)
  }

  const oriented = await pipeline.toBuffer({ resolveWithObject: true })
  const fullWidth = oriented.info.width
  const fullHeight = oriented.info.height
  const crop = cropRectForPrintLayout(fullWidth, fullHeight, layout)

  let base = sharp(oriented.data)
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .resize(sheetW, sheetH, { fit: 'fill' })

  const signText = meta?.signText?.trim()
  if (hasSignText(signText) && meta) {
    const signOverlay = await renderSignOverlayPng(sheetW, sheetH, {
      signText: signText!,
      signX: meta.signX ?? 50,
      signY: meta.signY ?? 16,
      signFontId: meta.signFontId,
      signSizeId: meta.signSizeId,
      themeId: meta.themeId,
      previewRotation: meta.previewRotation,
      fullWidth,
      fullHeight,
      crop,
    })
    if (signOverlay) {
      base = sharp(await base.toBuffer()).composite([{ input: signOverlay, blend: 'over' }])
    }
  }

  const buffer = await base.jpeg({ quality: 95, mozjpeg: true }).toBuffer()
  return { buffer, layout }
}
