/** Normalized crop window on the source image (0–1). */
export interface PrintCropRect {
  x: number
  y: number
  w: number
  h: number
}

export type StripTemplateId =
  | 'boda-cream'
  | 'boda-dark'
  | 'xv-blush'
  | 'fiesta-navy'
  | 'fiesta-neon'
  | 'gala-blacktie'
  | 'corp-navy'

export interface StripTemplate {
  id: StripTemplateId
  name: string
  swatch: string
  category: string
}

export const STRIP_TEMPLATES: StripTemplate[] = [
  { id: 'boda-cream', name: 'Boda Clásica', swatch: '#f5ead8', category: 'boda' },
  { id: 'boda-dark', name: 'Boda Oscura', swatch: '#100e08', category: 'boda' },
  { id: 'xv-blush', name: 'XV Años', swatch: '#fce8f2', category: 'xv' },
  { id: 'fiesta-navy', name: 'Fiesta', swatch: '#0d1b4b', category: 'fiesta' },
  { id: 'fiesta-neon', name: 'Neon Night', swatch: '#040412', category: 'fiesta' },
  { id: 'gala-blacktie', name: 'Gala', swatch: '#080808', category: 'gala' },
  { id: 'corp-navy', name: 'Corporativo', swatch: '#f8f9fc', category: 'corporativo' },
]

const LEGACY: Record<string, StripTemplateId> = {
  'classic-dark': 'boda-dark',
  'soft-cream': 'boda-cream',
  neon: 'fiesta-neon',
}

export function normalizeStripTemplateId(value: unknown): StripTemplateId {
  if (typeof value === 'string') {
    if (LEGACY[value]) return LEGACY[value]
    if (STRIP_TEMPLATES.some((t) => t.id === value)) return value as StripTemplateId
  }
  return 'boda-cream'
}

export function defaultCropForAspect(imageW: number, imageH: number, targetAspect: number): PrintCropRect {
  const imageAspect = imageW / Math.max(imageH, 1)
  if (imageAspect > targetAspect) {
    const w = targetAspect / imageAspect
    return { x: (1 - w) / 2, y: 0, w, h: 1 }
  }
  const h = imageAspect / targetAspect
  return { x: 0, y: (1 - h) / 2, w: 1, h }
}
