import { useCallback, useEffect, useRef, useState } from 'react'
import { composePhoto, type ComposePhotoOptions } from '../lib/composePhoto'
import type { FilterPreset } from '../types'
import type { PreviewRotation } from '../lib/orientation'
import type { EventSignFontId, EventSignSizeId } from '../lib/eventSign'

interface OverlayAssets extends ComposePhotoOptions {
  signFontId?: EventSignFontId
  signSizeId?: EventSignSizeId
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
    logoUrl,
    signText,
    neonColor,
    signX,
    signY,
    signFontId,
    signSizeId,
    filter,
    previewRotation,
    needsOrientationPass,
    jpegQuality,
  ])

  useEffect(() => {
    void compose()
  }, [compose])

  return composedPhoto
}
