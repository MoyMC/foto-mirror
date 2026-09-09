import { useCallback, useEffect, useRef, useState } from 'react'
import { composePhoto, type ComposePhotoOptions } from '../lib/composePhoto'
import type { FilterPreset } from '../types'
import type { PreviewRotation } from '../lib/orientation'
import type { EventSignFontId, EventSignSizeId } from '../lib/eventSign'
import type { OverlayMode } from '../lib/overlay'

interface OverlayAssets extends ComposePhotoOptions {
  signFontId?: EventSignFontId
  signSizeId?: EventSignSizeId
  overlayMode?: OverlayMode
  overlayPngUrl?: string | null
  overlayScale?: number
}

export function usePhotoCompositor(
  basePhoto: string | null,
  {
    logoUrl,
    signText = '',
    neonColor = '#ffffff',
    signX,
    signY,
    signFontId,
    signSizeId,
    overlayMode = 'none',
    overlayPngUrl = null,
    overlayScale,
  }: OverlayAssets,
  filter?: FilterPreset | null,
  previewRotation: PreviewRotation = 90,
  needsOrientationPass = false,
  jpegQuality = 0.95,
) {
  const [composedPhoto, setComposedPhoto] = useState<string | null>(null)
  const loadingRef = useRef(0)

  const compose = useCallback(async () => {
    if (!basePhoto) {
      setComposedPhoto(null)
      return
    }

    const loadId = ++loadingRef.current
    try {
      const result = await composePhoto(basePhoto, filter, {
        logoUrl,
        signText,
        neonColor,
        signX,
        signY,
        signFontId,
        signSizeId,
        overlayMode,
        overlayPngUrl,
        overlayScale,
        previewRotation,
        needsOrientationPass,
        jpegQuality,
      })
      if (loadId === loadingRef.current) setComposedPhoto(result)
    } catch {
      if (loadId === loadingRef.current) setComposedPhoto(basePhoto)
    }
  }, [
    basePhoto,
    filter,
    logoUrl,
    signText,
    neonColor,
    signX,
    signY,
    signFontId,
    signSizeId,
    overlayMode,
    overlayPngUrl,
    overlayScale,
    previewRotation,
    needsOrientationPass,
    jpegQuality,
  ])

  useEffect(() => {
    void compose()
  }, [compose])

  return composedPhoto
}
