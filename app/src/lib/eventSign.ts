export const EVENT_SIGN_MAX_CHARS = 72
export const EVENT_SIGN_MAX_LINES = 3
export const DEFAULT_EVENT_SIGN_X = 50
export const DEFAULT_EVENT_SIGN_Y = 16

export type EventSignFontId = 'script' | 'neon' | 'sans' | 'serif' | 'display'
export type EventSignSizeId = 's' | 'm' | 'l'

export const DEFAULT_EVENT_SIGN_FONT: EventSignFontId = 'script'
export const DEFAULT_EVENT_SIGN_SIZE: EventSignSizeId = 'm'

export interface EventSignFont {
  id: EventSignFontId
  name: string
  family: string
  weight: number
  sample: string
  letterSpacing?: string
}

export interface EventSignSize {
  id: EventSignSizeId
  name: string
  canvasScale: number
  css: string
}

export const EVENT_SIGN_FONTS: EventSignFont[] = [
  { id: 'script', name: 'Script', family: '"Great Vibes", cursive', weight: 400, sample: 'Aa' },
  {
    id: 'neon',
    name: 'Neón',
    family: '"Monoton", cursive',
    weight: 400,
    sample: 'Aa',
    letterSpacing: '0.06em',
  },
  { id: 'sans', name: 'Sans', family: '"Outfit", sans-serif', weight: 600, sample: 'Aa' },
  { id: 'serif', name: 'Serif', family: '"Playfair Display", serif', weight: 600, sample: 'Aa' },
  {
    id: 'display',
    name: 'Título',
    family: '"Bebas Neue", sans-serif',
    weight: 400,
    sample: 'Aa',
    letterSpacing: '0.04em',
  },
]

export const EVENT_SIGN_SIZES: EventSignSize[] = [
  { id: 's', name: 'S', canvasScale: 0.048, css: 'clamp(1.4rem, 5vw, 2.4rem)' },
  { id: 'm', name: 'M', canvasScale: 0.072, css: 'clamp(2.1rem, 7.5vw, 3.6rem)' },
  { id: 'l', name: 'L', canvasScale: 0.1, css: 'clamp(2.8rem, 10vw, 5rem)' },
]

export function normalizeSignFontId(value: unknown): EventSignFontId {
  return EVENT_SIGN_FONTS.some((font) => font.id === value)
    ? (value as EventSignFontId)
    : DEFAULT_EVENT_SIGN_FONT
}

export function normalizeSignSizeId(value: unknown): EventSignSizeId {
  return EVENT_SIGN_SIZES.some((size) => size.id === value)
    ? (value as EventSignSizeId)
    : DEFAULT_EVENT_SIGN_SIZE
}

export function signFontById(id: unknown): EventSignFont {
  const normalized = normalizeSignFontId(id)
  return EVENT_SIGN_FONTS.find((font) => font.id === normalized) ?? EVENT_SIGN_FONTS[0]
}

export function signSizeById(id: unknown): EventSignSize {
  const normalized = normalizeSignSizeId(id)
  return EVENT_SIGN_SIZES.find((size) => size.id === normalized) ?? EVENT_SIGN_SIZES[1]
}

export function constrainEventSignInput(value: string): string {
  const lines = value.replace(/\r\n/g, '\n').split('\n').slice(0, EVENT_SIGN_MAX_LINES)
  return lines.join('\n').slice(0, EVENT_SIGN_MAX_CHARS)
}

export function normalizeEventSign(value: unknown): string {
  if (typeof value !== 'string') return ''
  return constrainEventSignInput(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

export function eventSignLines(text: string): string[] {
  const normalized = normalizeEventSign(text)
  return normalized ? normalized.split('\n') : []
}

export function hasEventSign(text: string | null | undefined): boolean {
  return eventSignLines(text ?? '').length > 0
}

export function clampSignPercent(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback
  return Math.min(92, Math.max(8, n))
}

/** Keeps a centered sign inside the frame using its measured half-size. */
export function clampSignCenter(
  x: number,
  y: number,
  halfWidthPx: number,
  halfHeightPx: number,
  viewWidthPx: number,
  viewHeightPx: number,
  padPx = 12,
): { x: number; y: number } {
  const axis = (value: number, half: number, view: number) => {
    if (!view || half <= 0) return clampSignPercent(value, 50)
    const min = ((half + padPx) / view) * 100
    const max = 100 - min
    if (min >= max) return 50
    return Math.min(max, Math.max(min, value))
  }
  return {
    x: Math.round(axis(x, halfWidthPx, viewWidthPx) * 10) / 10,
    y: Math.round(axis(y, halfHeightPx, viewHeightPx) * 10) / 10,
  }
}
