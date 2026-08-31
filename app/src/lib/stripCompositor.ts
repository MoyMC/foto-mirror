const STRIP_CELL_PX = 1200

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Apila 3 fotos en ratio 1:3 (5×15 cm lógico, celdas cuadradas). */
export async function composePhotoStrip(
  cellDataUrls: string[],
  jpegQuality = 0.92,
): Promise<string> {
  if (cellDataUrls.length === 0) {
    throw new Error('composePhotoStrip: sin fotos')
  }

  const images = await Promise.all(cellDataUrls.map(loadImage))
  const cellSize = STRIP_CELL_PX
  const canvas = document.createElement('canvas')
  canvas.width = cellSize
  canvas.height = cellSize * images.length
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('composePhotoStrip: sin canvas')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  images.forEach((img, index) => {
    const sw = img.naturalWidth || img.width
    const sh = img.naturalHeight || img.height
    const side = Math.min(sw, sh)
    const sx = (sw - side) / 2
    const sy = (sh - side) / 2
    const y = index * cellSize
    ctx.drawImage(img, sx, sy, side, side, 0, y, cellSize, cellSize)
  })

  return canvas.toDataURL('image/jpeg', jpegQuality)
}
