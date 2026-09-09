import {
  S2_PHOTOS,
  S2_SIGN,
  S3_LEFT_BAND,
  S3_PHOTOS,
  S3_RIGHT_BAND,
  STRIP_FRAME_DESIGN_H,
  STRIP_FRAME_DESIGN_W,
  type StripFrameConfig,
  type StripMode,
} from './catalog'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STAR_D =
  'M0,-1 L0.225,-0.309 L0.951,-0.309 L0.363,0.118 L0.588,0.809 L0,0.382 L-0.588,0.809 L-0.363,0.118 L-0.951,-0.309 L-0.225,-0.309 Z'

const SIGN_FONT: Record<string, string> = {
  botanical: "Georgia, serif",
  stars: "Georgia, serif",
  confetti: "Arial, Helvetica, sans-serif",
  neon: "Arial, Helvetica, sans-serif",
  artdeco: "Georgia, serif",
  minimal: "Arial, Helvetica, sans-serif",
}

function botanicalDecorS2(a: string): string {
  return `<g>
  <rect x="16" y="16" width="668" height="1768" fill="none" stroke="${a}" stroke-width="3.5"/>
  <rect x="24" y="24" width="652" height="1752" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.45"/>
  <circle cx="16" cy="16" r="5" fill="${a}"/><circle cx="684" cy="16" r="5" fill="${a}"/>
  <circle cx="16" cy="1784" r="5" fill="${a}"/><circle cx="684" cy="1784" r="5" fill="${a}"/>
  <g transform="translate(44,44)">
    <path d="M0,0 C-10,-16-8,-36 0,-52 C8,-36 10,-16 0,0" fill="${a}" opacity="0.65" transform="rotate(-40)"/>
    <path d="M0,0 C-10,-14-8,-30 0,-44 C8,-14 10,-14 0,0" fill="${a}" opacity="0.45" transform="rotate(-80)"/>
  </g>
  <g transform="translate(656,44)">
    <path d="M0,0 C10,-16 8,-36 0,-52 C-8,-36-10,-16 0,0" fill="${a}" opacity="0.65" transform="rotate(40)"/>
    <path d="M0,0 C10,-14 8,-30 0,-44 C-8,-14-10,-14 0,0" fill="${a}" opacity="0.45" transform="rotate(80)"/>
  </g>
  <g transform="translate(44,1756)">
    <path d="M0,0 C-10,16-8,36 0,52 C8,36 10,16 0,0" fill="${a}" opacity="0.65" transform="rotate(40)"/>
  </g>
  <g transform="translate(656,1756)">
    <path d="M0,0 C10,16 8,36 0,52 C-8,36-10,16 0,0" fill="${a}" opacity="0.65" transform="rotate(-40)"/>
  </g>
</g>`
}

function starsDecorS2(a: string, a2: string): string {
  return `<g>
  <rect x="14" y="14" width="672" height="1772" fill="none" stroke="${a}" stroke-width="2.5"/>
  <path d="${STAR_D}" fill="${a}" opacity="0.9" transform="translate(35,80) scale(28)"/>
  <path d="${STAR_D}" fill="${a2}" opacity="0.6" transform="translate(35,180) scale(18)"/>
  <path d="${STAR_D}" fill="${a}" opacity="0.75" transform="translate(665,100) scale(26)"/>
  <path d="${STAR_D}" fill="${a}" opacity="0.8" transform="translate(35,900) scale(24)"/>
  <path d="${STAR_D}" fill="${a2}" opacity="0.65" transform="translate(665,920) scale(20)"/>
  <path d="${STAR_D}" fill="${a}" opacity="0.7" transform="translate(35,1200) scale(20)"/>
  <path d="${STAR_D}" fill="${a}" opacity="0.75" transform="translate(665,1200) scale(22)"/>
  <g transform="translate(350,32)" opacity="0.75">
    <polygon points="0,-22 -8,-8 -24,-14 -18,0 18,0 24,-14 8,-8" fill="${a}"/>
    <rect x="-18" y="0" width="36" height="6" rx="2" fill="${a}"/>
  </g>
</g>`
}

function confettiDecorS2(a: string, a2: string): string {
  return `<g>
  <rect x="14" y="14" width="672" height="1772" fill="none" stroke="${a}" stroke-width="2.5"/>
  <circle cx="50" cy="140" r="4.8" fill="${a2}" opacity="0.6"/>
  <circle cx="20" cy="350" r="7.2" fill="${a}" opacity="0.65"/>
  <circle cx="55" cy="600" r="7.8" fill="${a}" opacity="0.7"/>
  <circle cx="680" cy="250" r="5.4" fill="${a}" opacity="0.65"/>
  <circle cx="648" cy="550" r="7.2" fill="${a}" opacity="0.7"/>
  <circle cx="40" cy="1100" r="6.6" fill="${a}" opacity="0.65"/>
  <circle cx="675" cy="980" r="5.4" fill="${a2}" opacity="0.55"/>
  <line x1="20" y1="20" x2="70" y2="50" stroke="${a}" stroke-width="2" opacity="0.5"/>
  <line x1="630" y1="50" x2="680" y2="20" stroke="${a}" stroke-width="2" opacity="0.5"/>
</g>`
}

function neonDecorS2(a: string, a2: string, filterId: string): string {
  return `<g>
  <defs>
    <filter id="${filterId}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="14" y="14" width="672" height="1772" fill="none" stroke="${a}" stroke-width="3" filter="url(#${filterId})"/>
  <rect x="14" y="14" width="672" height="1772" fill="none" stroke="${a}" stroke-width="1.5"/>
  <rect x="24" y="24" width="652" height="1752" fill="none" stroke="${a2}" stroke-width="1" opacity="0.6"/>
  <circle cx="14" cy="14" r="8" fill="${a}"/><circle cx="686" cy="14" r="8" fill="${a2}"/>
  <circle cx="14" cy="1786" r="8" fill="${a}"/><circle cx="686" cy="1786" r="8" fill="${a2}"/>
</g>`
}

function artdecoDecorS2(a: string): string {
  return `<g>
  <rect x="12" y="12" width="676" height="1776" fill="none" stroke="${a}" stroke-width="4"/>
  <rect x="20" y="20" width="660" height="1760" fill="none" stroke="${a}" stroke-width="1" opacity="0.5"/>
  <rect x="28" y="28" width="644" height="1744" fill="none" stroke="${a}" stroke-width="0.7" opacity="0.3"/>
  <polygon points="35,900 22,912 35,924 48,912" fill="${a}" opacity="0.7"/>
  <polygon points="665,900 652,912 665,924 678,912" fill="${a}" opacity="0.7"/>
  <circle cx="40" cy="40" r="4" fill="${a}"/><circle cx="660" cy="40" r="4" fill="${a}"/>
  <circle cx="40" cy="1760" r="4" fill="${a}"/><circle cx="660" cy="1760" r="4" fill="${a}"/>
</g>`
}

function minimalDecorS2(a: string): string {
  return `<g>
  <rect x="16" y="16" width="668" height="1768" fill="none" stroke="${a}" stroke-width="3"/>
  <rect x="16" y="16" width="668" height="8" fill="${a}"/>
  <rect x="16" y="1776" width="668" height="8" fill="${a}"/>
  <line x1="50" y1="1390" x2="650" y2="1390" stroke="${a}" stroke-width="1.5" opacity="0.5"/>
</g>`
}

function decorS2(frame: StripFrameConfig): string {
  const a = frame.colors.accent
  const a2 = frame.colors.accent2
  switch (frame.decoration) {
    case 'botanical':
      return botanicalDecorS2(a)
    case 'stars':
      return starsDecorS2(a, a2)
    case 'confetti':
      return confettiDecorS2(a, a2)
    case 'neon':
      return neonDecorS2(a, a2, `neon-${frame.id}`)
    case 'artdeco':
      return artdecoDecorS2(a)
    case 'minimal':
    default:
      return minimalDecorS2(a)
  }
}

function decorS3(frame: StripFrameConfig): string {
  const a = frame.colors.accent
  const a2 = frame.colors.accent2
  // Shared outer border + side accents adapted for 1200×1800
  return `<g>
  <rect x="16" y="16" width="1168" height="1768" fill="none" stroke="${a}" stroke-width="3"/>
  <rect x="16" y="16" width="8" height="1768" fill="${a}" opacity="0.85"/>
  <rect x="1176" y="16" width="8" height="1768" fill="${a2}" opacity="0.85"/>
  <line x1="172" y1="30" x2="172" y2="1770" stroke="${a}" stroke-width="1" opacity="0.35"/>
  <line x1="1028" y1="30" x2="1028" y2="1770" stroke="${a}" stroke-width="1" opacity="0.35"/>
</g>`
}

function photoBorders(
  slots: ReadonlyArray<{ x: number; y: number; w: number; h: number }>,
  accent: string,
): string {
  return slots
    .map(
      (s) =>
        `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="${accent}" stroke-width="6"/>`,
    )
    .join('')
}

function signSlotH(frame: StripFrameConfig, signText: string): string {
  const slot = S2_SIGN
  const lines = signText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
  const display = lines.length ? lines : ['FotoMirror']
  const fontSize = display.length === 1 ? 72 : display.length === 2 ? 56 : 44
  const lineH = fontSize * 1.35
  const totalH = display.length * lineH
  const y0 = slot.y + slot.h / 2 - totalH / 2 + fontSize * 0.8
  const cx = slot.x + slot.w / 2
  const font = SIGN_FONT[frame.decoration]
  const tspans = display
    .map(
      (line, i) =>
        `<text x="${cx}" y="${(y0 + i * lineH).toFixed(1)}" text-anchor="middle" font-family="${font}" font-size="${fontSize}" fill="${frame.colors.signText}" font-weight="600">${escapeXml(line)}</text>`,
    )
    .join('')
  return `<rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" fill="${frame.colors.sign}"/>${tspans}`
}

function signSlotV(frame: StripFrameConfig, signText: string): string {
  const band = S3_RIGHT_BAND
  const lines = signText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
  const label = lines.join(' · ') || 'FotoMirror'
  const bx = band.x + band.w / 2
  const by = band.y + band.h / 2
  const font = SIGN_FONT[frame.decoration]
  return `<rect x="${band.x}" y="${band.y}" width="${band.w}" height="${band.h}" fill="${frame.colors.sign}"/>
<text text-anchor="middle" dominant-baseline="central" font-family="${font}" font-size="54" fill="${frame.colors.signText}" font-weight="600"
  transform="rotate(-90 ${bx} ${by})" x="${bx}" y="${by}">${escapeXml(label)}</text>`
}

/** Full-bleed frame SVG (background + decor + photo borders + sign). Photos composited underneath borders. */
export function buildStripFrameSvg(
  frame: StripFrameConfig,
  mode: StripMode,
  signText: string,
): { svg: Buffer; width: number; height: number } {
  const width = STRIP_FRAME_DESIGN_W[mode]
  const height = STRIP_FRAME_DESIGN_H
  const c = frame.colors

  if (mode === 'strip2') {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${decorS2(frame)}
  ${photoBorders(S2_PHOTOS, c.accent)}
  ${signSlotH(frame, signText)}
</svg>`
    return { svg: Buffer.from(body), width, height }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${S3_LEFT_BAND.x}" y="${S3_LEFT_BAND.y}" width="${S3_LEFT_BAND.w}" height="${S3_LEFT_BAND.h}" fill="${c.sign}" opacity="0.6"/>
  ${decorS3(frame)}
  ${photoBorders(S3_PHOTOS, c.accent)}
  ${signSlotV(frame, signText)}
</svg>`
  return { svg: Buffer.from(body), width, height }
}
