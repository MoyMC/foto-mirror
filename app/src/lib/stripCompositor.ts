const STRIP_CELL_WIDTH_PX = 1200

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export interface ComposePhotoStripOptions {
  /** cell width / height. Portrait strip ≈ 2/3; landscape ≈ 3/2; square = 1. */
  cellAspect?: number
  jpegQuality?: number
}

/** Apila N fotos en una tira vertical (cover + center crop por celda). */
export async function composePhotoStrip(
  cellDataUrls: string[],
  { cellAspect = 1, jpegQuality = 0.92 }: ComposePhotoStripOptions = {},
): Promise<string> {
  if (cellDataUrls.length === 0) {
    throw new Error('composePhotoStrip: sin fotos')
  }

  const images = await Promise.all(cellDataUrls.map(loadImage))
  const cellW = STRIP_CELL_WIDTH_PX
  const cellH = Math.max(1, Math.round(cellW / Math.max(cellAspect, 0.05)))
  const canvas = document.createElement('canvas')
  canvas.width = cellW
  canvas.height = cellH * images.length
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('composePhotoStrip: sin canvas')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  images.forEach((img, index) => {
    const sw = img.naturalWidth || img.width
    const sh = img.naturalHeight || img.height
    const targetAspect = cellW / cellH
    const srcAspect = sw / Math.max(sh, 1)

    let sx = 0
    let sy = 0
    let cw = sw
    let ch = sh
    if (srcAspect > targetAspect) {
      cw = Math.round(sh * targetAspect)
      sx = Math.round((sw - cw) / 2)
    } else if (srcAspect < targetAspect) {
      ch = Math.round(sw / targetAspect)
      sy = Math.round((sh - ch) / 2)
    }

    const y = index * cellH
    ctx.drawImage(img, sx, sy, cw, ch, 0, y, cellW, cellH)
  })

  return canvas.toDataURL('image/jpeg', jpegQuality)
}
