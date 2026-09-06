import { PRINT_DPI, SHEET_HEIGHT_PX, SHEET_WIDTH_PX } from '../printConfig'
import type { PrintCropRect } from '../printTypes'

export type IndividualFrameId = 'none' | 'instagram'

/** White chrome bands on the 4×6 sheet (photo is full-bleed between them). */
export const INSTAGRAM_TOP_CHROME_CM = 2
export const INSTAGRAM_BOTTOM_CHROME_CM = 3

export const INSTAGRAM_TOP_CHROME_PX = Math.round((INSTAGRAM_TOP_CHROME_CM * PRINT_DPI) / 2.54)
export const INSTAGRAM_BOTTOM_CHROME_PX = Math.round((INSTAGRAM_BOTTOM_CHROME_CM * PRINT_DPI) / 2.54)
export const INSTAGRAM_PHOTO_W = SHEET_WIDTH_PX
export const INSTAGRAM_PHOTO_H =
  SHEET_HEIGHT_PX - INSTAGRAM_TOP_CHROME_PX - INSTAGRAM_BOTTOM_CHROME_PX

/** Derived from chrome bands (~square on 4×6 with 2 cm top + 3 cm bottom). */
export const INSTAGRAM_PHOTO_ASPECT = INSTAGRAM_PHOTO_W / INSTAGRAM_PHOTO_H

export interface InstagramFrameOptions {
  liked: boolean
  /** Free text next to heart, e.g. "11.2 mill." */
  likesText: string
  commentsText: string
  repostsText: string
  sharesText: string
  dateText: string
  /** Multiline caption (replaces “Les gusta a…”). */
  caption: string
  /** Normalized crop on the oriented source (0–1). */
  crop?: PrintCropRect | null
}

export interface PrintRequestOptions {
  templateId?: string
  crops?: PrintCropRect[]
  frameOptions?: InstagramFrameOptions
}

export function defaultCropForInstagram(imageAspect: number): PrintCropRect {
  const target = INSTAGRAM_PHOTO_ASPECT
  if (imageAspect > target) {
    const w = target / imageAspect
    return { x: (1 - w) / 2, y: 0, w, h: 1 }
  }
  const h = imageAspect / target
  return { x: 0, y: (1 - h) / 2, w: 1, h }
}

export function defaultInstagramFrameOptions(): InstagramFrameOptions {
  return {
    liked: true,
    likesText: '12',
    commentsText: '3',
    repostsText: '1',
    sharesText: '2',
    dateText: formatSpanishDate(new Date()),
    caption: '',
    crop: null,
  }
}

function parseCrop(raw: unknown): PrintCropRect | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const x = Number(c.x)
  const y = Number(c.y)
  const w = Number(c.w)
  const h = Number(c.h)
  if (![x, y, w, h].every((n) => Number.isFinite(n) && n >= 0)) return null
  if (w <= 0 || h <= 0) return null
  return { x, y, w, h }
}

export function normalizeInstagramFrameOptions(raw: unknown): InstagramFrameOptions {
  const defaults = defaultInstagramFrameOptions()
  if (!raw || typeof raw !== 'object') return defaults
  const o = raw as Record<string, unknown>

  let likesText = defaults.likesText
  if (typeof o.likesText === 'string' && o.likesText.trim()) likesText = o.likesText.trim()
  else if (typeof o.likesCount === 'number' && Number.isFinite(o.likesCount)) {
    likesText = String(Math.max(0, Math.round(o.likesCount)))
  }

  return {
    liked: o.liked === true || o.liked === 1 || o.liked === 'true',
    likesText,
    commentsText:
      typeof o.commentsText === 'string' && o.commentsText.trim()
        ? o.commentsText.trim()
        : defaults.commentsText,
    repostsText:
      typeof o.repostsText === 'string' && o.repostsText.trim()
        ? o.repostsText.trim()
        : defaults.repostsText,
    sharesText:
      typeof o.sharesText === 'string' && o.sharesText.trim()
        ? o.sharesText.trim()
        : defaults.sharesText,
    dateText: typeof o.dateText === 'string' && o.dateText.trim() ? o.dateText.trim() : defaults.dateText,
    caption: typeof o.caption === 'string' ? o.caption : '',
    crop: parseCrop(o.crop),
  }
}

function formatSpanishDate(d: Date): string {
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}
