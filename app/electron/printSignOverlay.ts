import sharp from 'sharp'
import {
  clampSignCenter,
  mapSignPercentThroughCrop,
  mapSignPreviewToPhoto,
  normalizePreviewRotation,
  type CropRect,
  type PreviewRotation,
} from './photoGeometry'

export type EventSignFontId = 'script' | 'neon' | 'sans' | 'serif' | 'display'
export type EventSignSizeId = 's' | 'm' | 'l'

const SIGN_CANVAS_SCALE: Record<EventSignSizeId, number> = {
  s: 0.048,
  m: 0.072,
  l: 0.1,
}

const SIGN_FONT_FAMILY: Record<EventSignFontId, string> = {
  script: '"Segoe Script", cursive',
  neon: '"Arial Black", sans-serif',
  sans: '"Segoe UI", sans-serif',
  serif: 'Georgia, serif',
  display: 'Impact, sans-serif',
}

const SIGN_FONT_WEIGHT: Record<EventSignFontId, number> = {
  script: 400,
  neon: 900,
  sans: 600,
  serif: 700,
  display: 400,
}

const THEME_NEON: Record<string, string> = {
  'neon-white': '#ffffff',
  'neon-cyan': '#2ef0ff',
  'neon-magenta': '#ff2ec8',
  'neon-lime': '#b8ff2e',
  'neon-amber': '#ffb020',
  'neon-violet': '#b44dff',
}

function themeNeonColor(themeId: string | null | undefined): string {
  return THEME_NEON[themeId ?? ''] ?? '#ffffff'
}

function eventSignLines(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeFontId(value: string | null | undefined): EventSignFontId {
  if (value && value in SIGN_FONT_FAMILY) return value as EventSignFontId
  return 'script'
}

function normalizeSizeId(value: string | null | undefined): EventSignSizeId {
  if (value === 's' || value === 'm' || value === 'l') return value
  return 'm'
}

export interface PrintSignOptions {
  signText: string
  signX: number
  signY: number
  signFontId?: string | null
  signSizeId?: string | null
  themeId?: string | null
  previewRotation?: number | null
  fullWidth: number
  fullHeight: number
  crop: CropRect
}

function signPositionOnCanvas(
  width: number,
  height: number,
  options: PrintSignOptions,
): { cx: number; cy: number; fontSize: number; lineHeight: number; lines: string[] } {
  const lines = eventSignLines(options.signText)
  const sizeId = normalizeSizeId(options.signSizeId)
  const previewRotation = normalizePreviewRotation(options.previewRotation) as PreviewRotation
  const fontSize = Math.round(Math.min(width, height) * SIGN_CANVAS_SCALE[sizeId])
  const lineHeight = fontSize * 1.12

  const mapped = mapSignPreviewToPhoto(options.signX, options.signY, previewRotation)
  const onCrop = mapSignPercentThroughCrop(
    mapped.x,
    mapped.y,
    options.fullWidth,
    options.fullHeight,
    options.crop,
  )

  const maxLineChars = lines.reduce((widest, line) => Math.max(widest, line.length), 0)
  const maxLineW = maxLineChars * fontSize * 0.52
  const blockH = Math.max(lineHeight, (lines.length - 1) * lineHeight + fontSize * 0.2)
  const glowPad = fontSize * 0.6
  const fitted = clampSignCenter(
    onCrop.x,
    onCrop.y,
    maxLineW / 2 + glowPad,
    blockH / 2 + glowPad,
    width,
    height,
    Math.round(Math.min(width, height) * 0.1),
  )

  return {
    cx: (width * fitted.x) / 100,
    cy: (height * fitted.y) / 100,
    fontSize,
    lineHeight,
    lines,
  }
}

export async function renderSignOverlayPng(
  width: number,
  height: number,
  options: PrintSignOptions,
): Promise<Buffer | null> {
  const lines = eventSignLines(options.signText)
  if (lines.length === 0) return null

  const fontId = normalizeFontId(options.signFontId)
  const color = themeNeonColor(options.themeId)
  const { cx, cy, fontSize, lineHeight, lines: positionedLines } = signPositionOnCanvas(
    width,
    height,
    options,
  )
  const startY = cy - ((positionedLines.length - 1) * lineHeight) / 2
  const fontFamily = SIGN_FONT_FAMILY[fontId]
  const fontWeight = SIGN_FONT_WEIGHT[fontId]
  const blur = Math.round(fontSize * 0.55)

  const tspans = positionedLines
    .map((line, index) => {
      const y = startY + index * lineHeight
      return `<tspan x="${cx.toFixed(1)}" y="${y.toFixed(1)}">${escapeXml(line)}</tspan>`
    })
    .join('')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${blur}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <text
    text-anchor="middle"
    dominant-baseline="middle"
    fill="${color}"
    stroke="${color}"
    stroke-width="${Math.max(1, fontSize * 0.03).toFixed(2)}"
    font-family="${fontFamily}"
    font-weight="${fontWeight}"
    font-size="${fontSize}"
    filter="url(#glow)"
  >${tspans}</text>
</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
