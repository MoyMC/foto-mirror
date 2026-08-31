import { applyFilterToCanvas } from './filters'
import { hasEventSign, type EventSignFontId, type EventSignSizeId } from './eventSign'
import type { FilterPreset } from '../types'
import { drawNeonSign } from '../components/NeonSign'
import {
  captureRotationFromPreview,
  outputSizeForRotation,
  type PreviewRotation,
} from './orientation'

export interface ComposePhotoOptions {
  logoUrl?: string | null
  signText?: string
  neonColor?: string
  signX?: number
  signY?: number
  signFontId?: EventSignFontId
  signSizeId?: EventSignSizeId
  previewRotation?: PreviewRotation
  needsOrientationPass?: boolean
  jpegQuality?: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Compone filtro, orientación tether y letrero sobre un JPEG/data URL. */
export async function composePhoto(
  basePhoto: string,
  filter: FilterPreset | null | undefined,
  {
    logoUrl = null,
    signText = '',
    neonColor = '#ffffff',
    signX,
    signY,
    signFontId,
    signSizeId,
    previewRotation = 90,
    needsOrientationPass = false,
    jpegQuality = 0.95,
  }: ComposePhotoOptions = {},
): Promise<string> {
  const needsFilter = Boolean(filter && filter.id !== 'normal')
  const needsSign = hasEventSign(signText)
  const needsOverlay = needsFilter || needsSign || Boolean(logoUrl)

  if (!needsOverlay && !needsOrientationPass) {
    return basePhoto
  }

  if (document.fonts?.ready) await document.fonts.ready

  const base = await loadImage(basePhoto)
  const srcW = base.naturalWidth || base.width
  const srcH = base.naturalHeight || base.height
  if (!srcW || !srcH) return basePhoto

  const rotation = needsOrientationPass ? captureRotationFromPreview(previewRotation) : 0
  const { width, height } = needsOrientationPass
    ? outputSizeForRotation(srcW, srcH, rotation)
    : { width: srcW, height: srcH }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return basePhoto

  if (needsFilter && filter) {
    applyFilterToCanvas(ctx, base, srcW, srcH, filter, rotation)
  } else if (needsOrientationPass) {
    applyFilterToCanvas(
      ctx,
      base,
      srcW,
      srcH,
      { id: 'normal', name: 'Normal', cssFilter: 'none' },
      rotation,
    )
  } else {
    ctx.drawImage(base, 0, 0, width, height)
  }

  if (needsSign) {
    drawNeonSign(
      ctx,
      signText,
      width,
      height,
      neonColor,
      signX,
      signY,
      signFontId,
      signSizeId,
      previewRotation,
    )
  }

  if (logoUrl) {
    const logo = await loadImage(logoUrl)
    const logoMaxW = width * 0.18
    const scale = logoMaxW / logo.width
    const logoW = logo.width * scale
    const logoH = logo.height * scale
    const padding = width * 0.03
    ctx.drawImage(logo, width - logoW - padding, padding, logoW, logoH)
  }

  return canvas.toDataURL('image/jpeg', jpegQuality)
}
