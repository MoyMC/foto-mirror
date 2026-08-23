import { useCallback, useEffect, useRef, useState } from 'react'
import { applyFilterToCanvas } from '../lib/filters'
import { hasEventSign, type EventSignFontId, type EventSignSizeId } from '../lib/eventSign'
import type { FilterPreset } from '../types'
import { drawNeonSign } from '../components/NeonSign'

interface OverlayAssets {
  logoUrl: string | null
  signText?: string
  neonColor?: string
  signX?: number
  signY?: number
  signFontId?: EventSignFontId
  signSizeId?: EventSignSizeId
}

/**
 * Compone la foto a la resolución nativa del origen (no fuerza 1080p).
 * Filtro, letrero y logo se dibujan encima del JPEG original.
 */
export function usePhotoCompositor(
  basePhoto: string | null,
  { logoUrl, signText = '', neonColor = '#ffffff', signX, signY, signFontId, signSizeId }: OverlayAssets,
  filter?: FilterPreset | null,
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
    const needsFilter = Boolean(filter && filter.id !== 'normal')
    const needsSign = hasEventSign(signText)
    const needsOverlay = needsFilter || needsSign || Boolean(logoUrl)

    if (!needsOverlay) {
      setComposedPhoto(basePhoto)
      return
    }

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    try {
      if (document.fonts?.ready) await document.fonts.ready
      const base = await loadImage(basePhoto)
      if (loadId !== loadingRef.current) return

      const width = base.naturalWidth || base.width
      const height = base.naturalHeight || base.height
      if (!width || !height) {
        setComposedPhoto(basePhoto)
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setComposedPhoto(basePhoto)
        return
      }

      if (needsFilter && filter) {
        applyFilterToCanvas(ctx, base, width, height, filter)
      } else {
        ctx.drawImage(base, 0, 0, width, height)
      }

      if (needsSign) {
        drawNeonSign(ctx, signText, width, height, neonColor, signX, signY, signFontId, signSizeId)
      }

      if (logoUrl) {
        const logo = await loadImage(logoUrl)
        if (loadId !== loadingRef.current) return
        const logoMaxW = width * 0.18
        const scale = logoMaxW / logo.width
        const logoW = logo.width * scale
        const logoH = logo.height * scale
        const padding = width * 0.03
        ctx.drawImage(logo, width - logoW - padding, padding, logoW, logoH)
      }

      setComposedPhoto(canvas.toDataURL('image/jpeg', jpegQuality))
    } catch {
      setComposedPhoto(basePhoto)
    }
  }, [basePhoto, logoUrl, signText, neonColor, signX, signY, signFontId, signSizeId, filter, jpegQuality])

  useEffect(() => {
    void compose()
  }, [compose])

  return composedPhoto
}
