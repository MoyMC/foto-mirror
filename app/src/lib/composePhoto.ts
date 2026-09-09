import { applyFilterToCanvas } from './filters'
import { hasEventSign, type EventSignFontId, type EventSignSizeId } from './eventSign'
import type { FilterPreset } from '../types'
import { drawNeonSign } from '../components/NeonSign'
import { cropRect2x3, cropRect3x2, mapSignPercentThroughCrop } from './photoCrop'
import {
  DEFAULT_EVENT_SIGN_X,
  DEFAULT_EVENT_SIGN_Y,
  clampSignCenter,
} from './eventSign'
import {
  DEFAULT_OVERLAY_SCALE,
  normalizeOverlayMode,
  overlayDisplaySize,
  type OverlayMode,
} from './overlay'
import {
  captureRotationFromPreview,
  mapSignPreviewToPhoto,
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
  overlayMode?: OverlayMode
  overlayPngUrl?: string | null
  overlayScale?: number
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

function drawPngOverlay(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  xPercent: number,
  yPercent: number,
  scale: number,
  previewRotation: PreviewRotation,
  usePhotoCoords: boolean,
): void {
  const natW = image.naturalWidth || image.width
  const natH = image.naturalHeight || image.height
  if (!natW || !natH) return
  const size = overlayDisplaySize(natW, natH, width, height, scale)
  const mapped = usePhotoCoords
    ? { x: xPercent, y: yPercent }
    : mapSignPreviewToPhoto(xPercent, yPercent, previewRotation)
  const fitted = clampSignCenter(
    mapped.x,
    mapped.y,
    size.width / 2,
    size.height / 2,
    width,
    height,
    Math.round(Math.min(width, height) * 0.02),
  )
  const cx = (width * fitted.x) / 100
  const cy = (height * fitted.y) / 100
  ctx.drawImage(image, cx - size.width / 2, cy - size.height / 2, size.width, size.height)
}

/** Compone filtro, orientación tether y overlay (texto o PNG) sobre un JPEG/data URL. */
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
    overlayMode = 'none',
    overlayPngUrl = null,
    overlayScale = DEFAULT_OVERLAY_SCALE,
    previewRotation = 90,
    needsOrientationPass = false,
    jpegQuality = 0.95,
  }: ComposePhotoOptions = {},
): Promise<string> {
  const mode = normalizeOverlayMode(overlayMode)
  const needsFilter = Boolean(filter && filter.id !== 'normal')
  const needsSign = mode === 'text' && hasEventSign(signText)
  const needsPng = mode === 'png' && Boolean(overlayPngUrl)
  const needsOverlay = needsFilter || needsSign || needsPng || Boolean(logoUrl)

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

  const portraitPrint = previewRotation === 90 || previewRotation === 270
  const fullCrop = portraitPrint ? cropRect2x3(width, height) : cropRect3x2(width, height)

  let canvas = document.createElement('canvas')
  canvas.width = fullCrop.width
  canvas.height = fullCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return basePhoto

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return basePhoto

  if (needsFilter && filter) {
    applyFilterToCanvas(tempCtx, base, srcW, srcH, filter, rotation)
  } else if (needsOrientationPass) {
    applyFilterToCanvas(
      tempCtx,
      base,
      srcW,
      srcH,
      { id: 'normal', name: 'Normal', cssFilter: 'none' },
      rotation,
    )
  } else {
    tempCtx.drawImage(base, 0, 0, width, height)
  }

  ctx.drawImage(
    tempCanvas,
    fullCrop.left,
    fullCrop.top,
    fullCrop.width,
    fullCrop.height,
    0,
    0,
    fullCrop.width,
    fullCrop.height,
  )

  if (needsSign) {
    const mapped = mapSignPreviewToPhoto(
      signX ?? DEFAULT_EVENT_SIGN_X,
      signY ?? DEFAULT_EVENT_SIGN_Y,
      previewRotation,
    )
    const onCrop = mapSignPercentThroughCrop(mapped.x, mapped.y, width, height, fullCrop)
    drawNeonSign(
      ctx,
      signText,
      fullCrop.width,
      fullCrop.height,
      neonColor,
      onCrop.x,
      onCrop.y,
      signFontId,
      signSizeId,
      previewRotation,
      true,
    )
  }

  if (needsPng && overlayPngUrl) {
    try {
      const png = await loadImage(overlayPngUrl)
      const mapped = mapSignPreviewToPhoto(
        signX ?? DEFAULT_EVENT_SIGN_X,
        signY ?? DEFAULT_EVENT_SIGN_Y,
        previewRotation,
      )
      const onCrop = mapSignPercentThroughCrop(mapped.x, mapped.y, width, height, fullCrop)
      drawPngOverlay(
        ctx,
        png,
        fullCrop.width,
        fullCrop.height,
        onCrop.x,
        onCrop.y,
        overlayScale,
        previewRotation,
        true,
      )
    } catch {
      // Missing/broken PNG — keep photo without overlay.
    }
  }

  if (logoUrl) {
    const logo = await loadImage(logoUrl)
    const logoMaxW = fullCrop.width * 0.18
    const scale = logoMaxW / logo.width
    const logoW = logo.width * scale
    const logoH = logo.height * scale
    const padding = fullCrop.width * 0.03
    ctx.drawImage(logo, fullCrop.width - logoW - padding, padding, logoW, logoH)
  }

  return canvas.toDataURL('image/jpeg', jpegQuality)
}
