import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import { getPrinters, print } from 'pdf-to-printer'
import {
  DNP_DRIVER_ROTATE_DEGREES,
  isPrintSimulationEnabled,
  resolvePrinterName,
  SHEET_HEIGHT_IN,
  SHEET_WIDTH_IN,
} from './printConfig'
import type { PrintSheetLayout } from './printCompositor'

async function prepareJpegForDriver(
  jpegBuffer: Buffer,
  layout: PrintSheetLayout,
): Promise<{
  buffer: Buffer
  widthPt: number
  heightPt: number
  orientation: 'portrait' | 'landscape'
}> {
  // DNP DS-RX1 en Windows imprime el rollo 4×6 como página 6×4 apaisada.
  const landscapePageW = SHEET_HEIGHT_IN * 72
  const landscapePageH = SHEET_WIDTH_IN * 72

  if (layout === 'landscape') {
    // JPEG ya viene en 1800×1200 (6×4 @ 300 dpi); no rotar.
    return {
      buffer: jpegBuffer,
      widthPt: landscapePageW,
      heightPt: landscapePageH,
      orientation: 'landscape',
    }
  }

  // Portrait layout: JPEG 1200×1800 → rotar 90° para llenar la misma página 6×4.
  const buffer = await sharp(jpegBuffer)
    .rotate(DNP_DRIVER_ROTATE_DEGREES)
    .jpeg({ quality: 95 })
    .toBuffer()

  return {
    buffer,
    widthPt: landscapePageW,
    heightPt: landscapePageH,
    orientation: 'landscape',
  }
}

function jpegBufferToPdf(
  jpegBuffer: Buffer,
  pdfPath: string,
  widthPt: number,
  heightPt: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [widthPt, heightPt],
      margin: 0,
      autoFirstPage: false,
    })
    const stream = fs.createWriteStream(pdfPath)
    doc.pipe(stream)
    doc.addPage({ size: [widthPt, heightPt], margin: 0 })
    doc.image(jpegBuffer, 0, 0, { width: widthPt, height: heightPt })
    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', reject)
    doc.on('error', reject)
  })
}

async function assertPrinterAvailable(printerName: string): Promise<void> {
  const printers = await getPrinters()
  const found = printers.some((entry) => entry.name === printerName)
  if (!found) {
    const names = printers.map((entry) => entry.name).join(', ') || '(ninguna)'
    throw new Error(`Impresora "${printerName}" no encontrada. Disponibles: ${names}`)
  }
}

export async function printSheetJpeg(
  jpegBuffer: Buffer,
  jobId: string,
  layout: PrintSheetLayout = 'portrait',
): Promise<void> {
  if (isPrintSimulationEnabled()) {
    console.log(`[print] simulate job ${jobId} (${jpegBuffer.length} bytes JPEG)`)
    await new Promise((resolve) => setTimeout(resolve, 2_500))
    return
  }

  const printerName = resolvePrinterName()
  await assertPrinterAvailable(printerName)

  const prepared = await prepareJpegForDriver(jpegBuffer, layout)
  const tmpDir = path.join(os.tmpdir(), 'fotomirror-print')
  await fsPromises.mkdir(tmpDir, { recursive: true })
  const pdfPath = path.join(tmpDir, `${jobId}.pdf`)

  try {
    await jpegBufferToPdf(prepared.buffer, pdfPath, prepared.widthPt, prepared.heightPt)
    await print(pdfPath, {
      printer: printerName,
      silent: true,
      orientation: prepared.orientation,
    })
    console.log(
      `[print] sent job ${jobId} to ${printerName} (6×4 landscape, layout ${layout}, driver rotate ${layout === 'landscape' ? 0 : DNP_DRIVER_ROTATE_DEGREES}°)`,
    )
  } finally {
    await fsPromises.unlink(pdfPath).catch(() => undefined)
  }
}
