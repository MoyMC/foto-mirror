import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  captureRotationFromPreview,
  normalizePreviewRotation,
  type PreviewRotation,
} from '../photoGeometry'
import type { ComposedPrintSheet } from '../printCompositor'
import { SHEET_HEIGHT_PX, SHEET_WIDTH_PX } from '../printConfig'
import type { IndividualPrintMeta, PrintCropRect } from '../printTypes'
import {
  defaultCropForInstagram,
  INSTAGRAM_BOTTOM_CHROME_PX,
  INSTAGRAM_PHOTO_H,
  INSTAGRAM_PHOTO_W,
  INSTAGRAM_TOP_CHROME_PX,
  normalizeInstagramFrameOptions,
  type InstagramFrameOptions,
} from './instagramTypes'

const SHEET_W = SHEET_WIDTH_PX
const SHEET_H = SHEET_HEIGHT_PX
/** Chrome (header / actions / caption) inset — photo is full-bleed edge to edge. */
const MARGIN_X = 48
const PHOTO_W = INSTAGRAM_PHOTO_W
const PHOTO_H = INSTAGRAM_PHOTO_H
const PHOTO_TOP = INSTAGRAM_TOP_CHROME_PX
const BOTTOM_H = INSTAGRAM_BOTTOM_CHROME_PX

/** Header band is 2 cm (~236 px) — fill it with larger chrome. */
const AVATAR = 152
const USER_FONT = 58
const VERIFIED = 46
const MORE_DOT = 6
const MORE_GAP = 22
const USERNAME = "Gary's Festa"

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Approximate rendered width for bold Arial (print SVG has no text metrics). */
function approxTextWidth(text: string, fontSize: number, bold = false): number {
  const factor = bold ? 0.62 : 0.55
  let w = 0
  for (const ch of text) {
    if (ch === ' ') w += fontSize * 0.3
    else if (ch === "'" || ch === '.' || ch === ',') w += fontSize * 0.22
    else if ('iljtI1'.includes(ch)) w += fontSize * (bold ? 0.38 : 0.32)
    else if ('mwMW@'.includes(ch)) w += fontSize * (bold ? 0.95 : 0.85)
    else if (ch >= 'A' && ch <= 'Z') w += fontSize * (bold ? 0.72 : 0.65)
    else w += fontSize * factor
  }
  return w
}

function wrapLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []

  const pushHardBroken = (word: string) => {
    let chunk = ''
    for (const ch of word) {
      const next = chunk + ch
      if (chunk && approxTextWidth(next, fontSize) > maxWidth) {
        lines.push(chunk)
        chunk = ch
        if (lines.length >= maxLines) return
      } else {
        chunk = next
      }
    }
    if (chunk && lines.length < maxLines) lines.push(chunk)
  }

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) continue
    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (approxTextWidth(next, fontSize) <= maxWidth) {
        current = next
        continue
      }
      if (current) {
        lines.push(current)
        current = ''
        if (lines.length >= maxLines) return lines
      }
      if (approxTextWidth(word, fontSize) > maxWidth) {
        pushHardBroken(word)
        current = ''
        if (lines.length >= maxLines) return lines
      } else {
        current = word
      }
    }
    if (current && lines.length < maxLines) lines.push(current)
    if (lines.length >= maxLines) break
  }
  return lines.slice(0, maxLines)
}

export function resolveBrandLogoPath(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'resources', 'brand', 'garys-festa-logo.png'),
    path.join(process.cwd(), 'resources', 'brand', 'garys-festa-logo.png'),
    typeof process.resourcesPath === 'string'
      ? path.join(process.resourcesPath, 'brand', 'garys-festa-logo.png')
      : '',
  ]
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  throw new Error("Logo Gary's Festa no encontrado (resources/brand/garys-festa-logo.png)")
}

async function circularLogo(logoPath: string, size: number): Promise<Buffer> {
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
    </svg>`,
  )
  const resized = await sharp(logoPath)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()
  return sharp(resized)
    .composite([{ input: await sharp(circle).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer()
}

function chromeSvg(options: InstagramFrameOptions, photoBottom: number): Buffer {
  // Footer band is 3 cm — room for larger icons + wrapped caption + date.
  const padTop = 32
  const actionsTop = photoBottom + padTop
  const icon = 64
  const gap = 16
  const countFont = 34
  const captionFont = 36
  const captionLineH = 44
  const dateFont = 28
  const captionMaxW = SHEET_W - MARGIN_X * 2
  const stroke = '#262626'

  const heartPath =
    'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'
  const commentPath =
    'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719'
  const refreshPaths = [
    'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
    'M21 3v5h-5',
    'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
    'M8 16H3v5',
  ]
  const sendPaths = [
    'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
    'm21.854 2.147-10.94 10.939',
  ]
  const bookmarkPath = 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'
  const badgeOuter =
    'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'
  const badgeCheck = 'm9 12 2 2 4-4'

  const scale = icon / 24
  const heartSvg = options.liked
    ? `<path d="${heartPath}" fill="#ed4956" stroke="none"/>`
    : `<path d="${heartPath}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`

  const bookmarkX = SHEET_W - MARGIN_X - icon
  const stats: { icon: string; label: string }[] = [
    { icon: heartSvg, label: options.likesText },
    {
      icon: `<path d="${commentPath}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
      label: options.commentsText,
    },
    {
      icon: refreshPaths
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join(''),
      label: options.repostsText,
    },
    {
      icon: sendPaths
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join(''),
      label: options.sharesText,
    },
  ]

  // Lay out icon+count pairs; if a long count would collide with bookmark, wrap to a 2nd row.
  const rowGap = 18
  const pairGap = 12
  const rows: { y: number; parts: string[] }[] = [{ y: actionsTop, parts: [] }]
  let cursor = MARGIN_X
  let rowIndex = 0
  for (const stat of stats) {
    const labelW = approxTextWidth(stat.label, countFont)
    const pairW = icon + 10 + labelW
    if (cursor + pairW > bookmarkX - gap && cursor > MARGIN_X) {
      rowIndex += 1
      rows.push({ y: actionsTop + (icon + rowGap) * rowIndex, parts: [] })
      cursor = MARGIN_X
    }
    const y = rows[rowIndex].y
    rows[rowIndex].parts.push(
      `<g transform="translate(${cursor}, ${y}) scale(${scale})">${stat.icon}</g>`,
      `<text x="${cursor + icon + 10}" y="${y + icon * 0.72}" font-family="Arial, Helvetica, sans-serif" font-size="${countFont}" fill="${stroke}">${escapeXml(stat.label)}</text>`,
    )
    cursor += pairW + pairGap
  }

  const actionsBlockH = icon + (rows.length > 1 ? (icon + rowGap) * (rows.length - 1) : 0)
  const captionTop = photoBottom + padTop + actionsBlockH + 30
  const captionLines = wrapLines(options.caption, captionMaxW, captionFont, 4)
  const dateY = Math.min(
    captionTop +
      Math.max(captionLines.length, 0) * captionLineH +
      (captionLines.length ? 26 : 10),
    SHEET_H - Math.round(BOTTOM_H * 0.16),
  )

  const captionTspans = captionLines
    .map((line, i) => {
      const y = captionTop + i * captionLineH
      return `<text x="${MARGIN_X}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${captionFont}" fill="#262626">${escapeXml(line)}</text>`
    })
    .join('')

  const headerMidY = PHOTO_TOP / 2
  const userX = MARGIN_X + AVATAR + 28
  const userY = headerMidY
  const nameWidth = approxTextWidth(USERNAME, USER_FONT, true)
  const badgeGap = 16
  const badgeX = userX + nameWidth + badgeGap
  const badgeY = userY - VERIFIED / 2
  const moreX = SHEET_W - MARGIN_X - MORE_DOT

  const statsSvg = rows.flatMap((r) => r.parts).join('\n  ')
  const bookmarkSvg = `<g transform="translate(${bookmarkX}, ${actionsTop}) scale(${scale})"><path d="${bookmarkPath}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SHEET_W}" height="${SHEET_H}" viewBox="0 0 ${SHEET_W} ${SHEET_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${userX}" y="${userY}" dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="${USER_FONT}" font-weight="700" fill="#262626">${escapeXml(USERNAME)}</text>
  <g transform="translate(${badgeX}, ${badgeY}) scale(${VERIFIED / 24})">
    <path d="${badgeOuter}" fill="#0095f6" stroke="none"/>
    <path d="${badgeCheck}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <circle cx="${moreX}" cy="${userY}" r="${MORE_DOT}" fill="#262626"/>
  <circle cx="${moreX}" cy="${userY - MORE_GAP}" r="${MORE_DOT}" fill="#262626"/>
  <circle cx="${moreX}" cy="${userY + MORE_GAP}" r="${MORE_DOT}" fill="#262626"/>

  ${statsSvg}
  ${bookmarkSvg}

  ${captionTspans}
  <text x="${MARGIN_X}" y="${dateY}" font-family="Arial, Helvetica, sans-serif" font-size="${dateFont}" fill="#8e8e8e">${escapeXml(options.dateText.toUpperCase())}</text>
</svg>`
  return Buffer.from(svg)
}

async function preparePhoto(
  filePath: string,
  meta: IndividualPrintMeta | null,
  crop: PrintCropRect | null | undefined,
  applyOrientation: boolean,
): Promise<Buffer> {
  const previewRotation = normalizePreviewRotation(meta?.previewRotation) as PreviewRotation
  const needsOrientation =
    applyOrientation && (Boolean(meta?.needsOrientationPass) || previewRotation === 90 || previewRotation === 270)
  const captureRotation = needsOrientation ? captureRotationFromPreview(previewRotation) : 0

  let pipeline = sharp(filePath).rotate()
  if (captureRotation !== 0) {
    pipeline = pipeline.rotate(captureRotation)
  }
  const oriented = await pipeline.toBuffer({ resolveWithObject: true })
  const w = oriented.info.width
  const h = oriented.info.height
  const imageAspect = w / Math.max(h, 1)
  const rect = crop ?? defaultCropForInstagram(imageAspect)

  let left = Math.round(rect.x * w)
  let top = Math.round(rect.y * h)
  let cropW = Math.round(rect.w * w)
  let cropH = Math.round(rect.h * h)
  left = Math.max(0, Math.min(left, w - 1))
  top = Math.max(0, Math.min(top, h - 1))
  cropW = Math.max(1, Math.min(cropW, w - left))
  cropH = Math.max(1, Math.min(cropH, h - top))

  return sharp(oriented.data)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(PHOTO_W, PHOTO_H, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 95 })
    .toBuffer()
}

/** Instagram-style post on a portrait 4×6 sheet (2 cm top / 3 cm bottom chrome). */
export async function composeInstagramIndividual(
  originalPath: string | null,
  meta: IndividualPrintMeta | null,
  frameOptions: InstagramFrameOptions | null | undefined,
  fallbackEditedPath: string | null,
): Promise<ComposedPrintSheet> {
  const options = normalizeInstagramFrameOptions(frameOptions)
  const logoPath = resolveBrandLogoPath()

  let photo: Buffer
  if (originalPath && fs.existsSync(originalPath)) {
    photo = await preparePhoto(originalPath, meta, options.crop, true)
  } else if (fallbackEditedPath && fs.existsSync(fallbackEditedPath)) {
    // Edited JPEGs are usually already oriented — don't double-rotate.
    photo = await preparePhoto(fallbackEditedPath, meta, options.crop, false)
  } else {
    throw new Error('Sin archivo de foto para marco Instagram')
  }

  const photoBottom = PHOTO_TOP + PHOTO_H
  const avatarTop = Math.round((PHOTO_TOP - AVATAR) / 2)
  const [avatar, chromePng] = await Promise.all([
    circularLogo(logoPath, AVATAR),
    sharp(chromeSvg(options, photoBottom)).png().toBuffer(),
  ])

  const buffer = await sharp({
    create: {
      width: SHEET_W,
      height: SHEET_H,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite([
      { input: chromePng, left: 0, top: 0 },
      { input: photo, left: 0, top: PHOTO_TOP },
      { input: avatar, left: MARGIN_X, top: Math.max(0, avatarTop) },
    ])
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer()

  return { buffer, layout: 'portrait' }
}
