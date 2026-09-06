import {
  cropAspectForStrip,
  normalizeStripTemplateId,
  S2_PHOTOS,
  S3_PHOTOS,
  STRIP_FRAMES,
  stripFrameById,
  type StripFrameConfig,
  type StripMode,
  type StripTemplateId,
} from './frames/catalog'

export {
  cropAspectForStrip,
  normalizeStripTemplateId,
  S2_PHOTOS,
  S3_PHOTOS,
  STRIP_FRAMES,
  stripFrameById,
  type StripFrameConfig,
  type StripMode,
  type StripTemplateId,
}

/** @deprecated Prefer stripFrameById(). Kept for leftover imports. */
export interface TemplateColors {
  background: string
  accent: string
  text: string
  photoBorder: string
}

export function templateColors(id: string, _neonFallback = '#ffffff'): TemplateColors {
  const frame = stripFrameById(id)
  return {
    background: frame.colors.frame,
    accent: frame.colors.accent,
    text: frame.colors.signText,
    photoBorder: frame.colors.accent,
  }
}
