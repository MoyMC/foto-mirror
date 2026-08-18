import type { FilterAdjustments, FilterPreset } from '../types'
import {
  captureRotationFromPreview,
  drawRotatedImage,
  outputSizeForRotation,
  type PreviewRotation,
} from './orientation'

export type FullFilterPreset = FilterPreset

export const INSTAGRAM_FILTERS: FullFilterPreset[] = [
  { id: 'normal', name: 'Normal', cssFilter: 'none' },
  {
    id: 'clarendon',
    name: 'Clarendon',
    cssFilter: 'contrast(1.2) saturate(1.35) brightness(1.05)',
    adjustments: { vignette: 0.12 },
  },
  {
    id: 'gingham',
    name: 'Gingham',
    cssFilter: 'brightness(1.05) hue-rotate(-10deg) saturate(0.85)',
    adjustments: { fade: 0.18, warmth: 0.05 },
  },
  {
    id: 'juno',
    name: 'Juno',
    cssFilter: 'sepia(0.15) saturate(1.4) contrast(1.1) brightness(1.08)',
    adjustments: { warmth: 0.22 },
  },
  {
    id: 'lark',
    name: 'Lark',
    cssFilter: 'contrast(0.92) saturate(0.85) brightness(1.12)',
    adjustments: { fade: 0.08 },
  },
  {
    id: 'ludwig',
    name: 'Ludwig',
    cssFilter: 'sepia(0.08) saturate(0.9) brightness(1.08) contrast(1.05)',
    adjustments: { fade: 0.15, warmth: 0.12 },
  },
  {
    id: 'valencia',
    name: 'Valencia',
    cssFilter: 'sepia(0.12) saturate(1.1) brightness(1.06) contrast(1.02)',
    adjustments: { warmth: 0.28, fade: 0.1 },
  },
  {
    id: 'xpro2',
    name: 'X-Pro II',
    cssFilter: 'sepia(0.2) contrast(1.35) saturate(1.2) brightness(0.95)',
    adjustments: { vignette: 0.28, fade: 0.06 },
  },
  {
    id: 'nashville',
    name: 'Nashville',
    cssFilter: 'sepia(0.25) saturate(1.15) brightness(1.1) contrast(1.05)',
    adjustments: { warmth: 0.35, fade: 0.2 },
  },
  {
    id: 'moon',
    name: 'Moon',
    cssFilter: 'grayscale(1) contrast(1.25) brightness(1.05)',
    adjustments: { vignette: 0.15 },
  },
]

export function resolveFilters(configFilters?: FilterPreset[]): FullFilterPreset[] {
  if (!configFilters?.length) return INSTAGRAM_FILTERS

  const builtins = new Map(INSTAGRAM_FILTERS.map((f) => [f.id, f]))

  return configFilters.map((f) => {
    const builtin = builtins.get(f.id)
    return {
      ...builtin,
      ...f,
      adjustments: builtin?.adjustments ?? (f as FullFilterPreset).adjustments,
    }
  })
}

export function getFilterCss(preset: FilterPreset): string {
  return preset.cssFilter === 'none' ? 'none' : preset.cssFilter
}

function applyAdjustments(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adj: FilterAdjustments,
): void {
  if (adj.warmth && adj.warmth > 0) {
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = `rgba(255, 160, 80, ${adj.warmth * 0.35})`
    ctx.fillRect(0, 0, width, height)
  }

  if (adj.fade && adj.fade > 0) {
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(255, 248, 240, ${adj.fade * 0.45})`
    ctx.fillRect(0, 0, width, height)
  }

  if (adj.vignette && adj.vignette > 0) {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.25,
      width / 2,
      height / 2,
      width * 0.75,
    )
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette * 0.65})`)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  ctx.globalCompositeOperation = 'source-over'
}

export function applyFilterToCanvas(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  preset: FilterPreset,
  rotation: PreviewRotation = 0,
): void {
  const full = preset as FullFilterPreset
  const css = getFilterCss(preset)
  const { width: outW, height: outH } = outputSizeForRotation(width, height, rotation)

  ctx.filter = css
  drawRotatedImage(ctx, source, width, height, rotation)
  ctx.filter = 'none'

  if (full.adjustments) {
    applyAdjustments(ctx, outW, outH, full.adjustments)
  }
}

export function captureFilteredFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
  preset: FilterPreset,
  quality = 0.92,
  /** Rotación del preview en vivo (con espejo). Se convierte al guardar. */
  previewRotation: PreviewRotation = 0,
): string | null {
  const rotation = captureRotationFromPreview(previewRotation)
  const { width: outW, height: outH } = outputSizeForRotation(width, height, rotation)
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  applyFilterToCanvas(ctx, source, width, height, preset, rotation)
  return canvas.toDataURL('image/jpeg', quality)
}
