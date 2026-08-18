import { useCallback, useEffect, useRef, useState } from 'react'
import { applyFilterToCanvas } from '../lib/filters'
import type { FilterPreset } from '../types'

interface OverlayAssets {
  logoUrl: string | null
}

/**
 * Compone la foto a la resolución nativa del origen (no fuerza 1080p).
 * Si hay filtro distinto de "normal", lo aplica a full-res.
 */
export function usePhotoCompositor(
  basePhoto: string | null,
  { logoUrl }: OverlayAssets,
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

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    try {
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

      const needsFilter = Boolean(filter && filter.id !== 'normal')

      if (needsFilter && filter) {
        applyFilterToCanvas(ctx, base, width, height, filter)
      } else {
        ctx.drawImage(base, 0, 0, width, height)
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

      // Sin filtro ni logo: devolver el original (evita recomprimir tether)
      if (!needsFilter && !logoUrl) {
        setComposedPhoto(basePhoto)
        return
      }

      setComposedPhoto(canvas.toDataURL('image/jpeg', jpegQuality))
    } catch {
      setComposedPhoto(basePhoto)
    }
  }, [basePhoto, logoUrl, filter, jpegQuality])

  useEffect(() => {
    void compose()
  }, [compose])

  return composedPhoto
}
