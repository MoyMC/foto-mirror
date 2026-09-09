/** Strip frame catalog + geometry for print (from Figma Make). */

export type StripFrameCategory = 'boda' | 'xv' | 'fiesta' | 'gala' | 'corporativo'
export type StripFrameDecoration = 'botanical' | 'stars' | 'confetti' | 'artdeco' | 'neon' | 'minimal'
export type StripMode = 'strip2' | 'strip3'

export interface StripFrameColors {
  frame: string
  accent: string
  accent2: string
  sign: string
  signText: string
  photoTint: string
}

export interface StripFrameConfig {
  id: string
  name: string
  subtitle: string
  category: StripFrameCategory
  colors: StripFrameColors
  decoration: StripFrameDecoration
  swatch: string
}

export const STRIP_FRAME_DESIGN_W = { strip2: 700, strip3: 1200 } as const
export const STRIP_FRAME_DESIGN_H = 1800

export const S2_PHOTOS = [
  { x: 70, y: 50, w: 560, h: 640 },
  { x: 70, y: 720, w: 560, h: 640 },
] as const

export const S2_SIGN = { x: 70, y: 1400, w: 560, h: 320 } as const

export const S3_PHOTOS = [
  { x: 180, y: 40, w: 840, h: 540 },
  { x: 180, y: 610, w: 840, h: 540 },
  { x: 180, y: 1180, w: 840, h: 540 },
] as const

export const S3_LEFT_BAND = { x: 0, y: 0, w: 160, h: 1800 } as const
export const S3_RIGHT_BAND = { x: 1040, y: 0, w: 160, h: 1800 } as const

export const STRIP_FRAMES: StripFrameConfig[] = [
  {
    id: 'boda-cream',
    name: 'Boda Clásica',
    subtitle: 'Cream & Gold',
    category: 'boda',
    colors: {
      frame: '#f5ead8',
      accent: '#c9a455',
      accent2: '#7a5c1e',
      sign: '#efdfc0',
      signText: '#6a4c18',
      photoTint: 'rgba(201,164,85,0.09)',
    },
    decoration: 'botanical',
    swatch: '#f5ead8',
  },
  {
    id: 'boda-dark',
    name: 'Boda Oscura',
    subtitle: 'Dark Romantic',
    category: 'boda',
    colors: {
      frame: '#100e08',
      accent: '#c9a455',
      accent2: '#8a6c2a',
      sign: '#1a1508',
      signText: '#c9a455',
      photoTint: 'rgba(201,164,85,0.05)',
    },
    decoration: 'botanical',
    swatch: '#100e08',
  },
  {
    id: 'xv-blush',
    name: 'XV Años',
    subtitle: 'Blush & Silver',
    category: 'xv',
    colors: {
      frame: '#fce8f2',
      accent: '#c080a0',
      accent2: '#9890b8',
      sign: '#f8d8eb',
      signText: '#7a3860',
      photoTint: 'rgba(192,128,160,0.09)',
    },
    decoration: 'stars',
    swatch: '#fce8f2',
  },
  {
    id: 'fiesta-navy',
    name: 'Fiesta',
    subtitle: 'Navy & Gold',
    category: 'fiesta',
    colors: {
      frame: '#0d1b4b',
      accent: '#f0c040',
      accent2: '#1e88e0',
      sign: '#091230',
      signText: '#f0c040',
      photoTint: 'rgba(240,192,64,0.07)',
    },
    decoration: 'confetti',
    swatch: '#0d1b4b',
  },
  {
    id: 'fiesta-neon',
    name: 'Neon Night',
    subtitle: 'Dark & Electric',
    category: 'fiesta',
    colors: {
      frame: '#040412',
      accent: '#00ffe0',
      accent2: '#ff2dff',
      sign: '#07072a',
      signText: '#00ffe0',
      photoTint: 'rgba(0,255,224,0.04)',
    },
    decoration: 'neon',
    swatch: '#040412',
  },
  {
    id: 'gala-blacktie',
    name: 'Gala',
    subtitle: 'Black Tie Gold',
    category: 'gala',
    colors: {
      frame: '#080808',
      accent: '#c8960c',
      accent2: '#906c08',
      sign: '#0e0e06',
      signText: '#c9a455',
      photoTint: 'rgba(200,150,12,0.05)',
    },
    decoration: 'artdeco',
    swatch: '#080808',
  },
  {
    id: 'corp-navy',
    name: 'Corporativo',
    subtitle: 'Navy Minimal',
    category: 'corporativo',
    colors: {
      frame: '#f8f9fc',
      accent: '#1a3a6b',
      accent2: '#3a6abf',
      sign: '#edf0f8',
      signText: '#1a3a6b',
      photoTint: 'rgba(26,58,107,0.05)',
    },
    decoration: 'minimal',
    swatch: '#f8f9fc',
  },
]

export type StripTemplateId = (typeof STRIP_FRAMES)[number]['id']

const LEGACY: Record<string, StripTemplateId> = {
  'classic-dark': 'boda-dark',
  'soft-cream': 'boda-cream',
  neon: 'fiesta-neon',
}

export function normalizeStripTemplateId(value: unknown): StripTemplateId {
  if (typeof value === 'string') {
    if (LEGACY[value]) return LEGACY[value]
    if (STRIP_FRAMES.some((f) => f.id === value)) return value as StripTemplateId
  }
  return 'boda-cream'
}

export function stripFrameById(id: unknown): StripFrameConfig {
  const normalized = normalizeStripTemplateId(id)
  return STRIP_FRAMES.find((f) => f.id === normalized) ?? STRIP_FRAMES[0]
}

export function cropAspectForStrip(mode: StripMode): number {
  if (mode === 'strip2') return S2_PHOTOS[0].w / S2_PHOTOS[0].h
  return S3_PHOTOS[0].w / S3_PHOTOS[0].h
}
