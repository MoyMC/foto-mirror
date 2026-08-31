export const SLIDESHOW_IDLE_OPTIONS = [30, 45, 60] as const
export type SlideshowIdleSeconds = (typeof SLIDESHOW_IDLE_OPTIONS)[number]

export const SLIDESHOW_IDLE_CHOICES: ReadonlyArray<{ seconds: SlideshowIdleSeconds }> = [
  { seconds: 30 },
  { seconds: 45 },
  { seconds: 60 },
]

export const DEFAULT_SLIDESHOW_IDLE_SECONDS: SlideshowIdleSeconds = 45

export type SlideshowDisplayMode = 'fullscreen' | 'overlay' | 'off'

export interface SlideshowConfig {
  enabled: boolean
  memoriesDir: string | null
  includeEventPhotos: boolean
  idleSeconds: SlideshowIdleSeconds
}

export type SlideshowImageSource = 'memory' | 'event'

export interface SlideshowImage {
  filePath: string
  url: string
  source: SlideshowImageSource
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i

export function isSlideshowImageFile(name: string): boolean {
  return IMAGE_EXT.test(name)
}

export function normalizeSlideshowIdleSeconds(value: unknown): SlideshowIdleSeconds {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === 30 || n === 45 || n === 60) return n
  return DEFAULT_SLIDESHOW_IDLE_SECONDS
}

export function slideshowIsConfigured(config: SlideshowConfig): boolean {
  if (!config.enabled) return false
  return Boolean(config.memoriesDir) || config.includeEventPhotos
}

/** Pantalla completa si hay recuerdos; solo overlay si solo fotos del evento. */
export function slideshowDisplayMode(
  config: SlideshowConfig,
  hasMemoryImages: boolean,
): 'fullscreen' | 'overlay' | null {
  if (!slideshowIsConfigured(config)) return null
  if (config.memoriesDir && hasMemoryImages) return 'fullscreen'
  if (config.includeEventPhotos) return 'overlay'
  if (config.memoriesDir) return 'fullscreen'
  return null
}

export function shuffleSlideshow<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
