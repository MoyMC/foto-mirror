import fs from 'node:fs/promises'
import { printSheetJpeg } from './dnpPrinter'
import type { EventRegistry } from './eventRegistry'
import { composeInstagramIndividual } from './frames/instagramCompositor'
import { composeIndividual, composeIndividualForPrint, composeStripPair } from './printCompositor'
import { composeStrip2PairSheet, composeStrip3Sheet } from './stripPrintCompositor'
import type { PrintJobRow } from './printTypes'

let workerTimer: ReturnType<typeof setInterval> | null = null
let processing = false
let registryRef: EventRegistry | null = null

async function executePrint(job: PrintJobRow, registry: EventRegistry): Promise<void> {
  if (job.type === 'strip_pair') {
    const left = registry.getStripPrintSource(job.photoIds[0])
    const right = registry.getStripPrintSource(job.photoIds[1])
    if (left && right && left.poseOriginalPaths.length >= 2 && right.poseOriginalPaths.length >= 2) {
      const jpegBuffer = await composeStrip2PairSheet(
        {
          originals: left.poseOriginalPaths,
          edited: left.poseEditedPaths,
          options: {
            templateId: left.templateId,
            crops: left.crops,
            signText: left.signText,
            themeId: left.themeId,
            previewRotation: left.previewRotation,
          },
        },
        {
          originals: right.poseOriginalPaths,
          edited: right.poseEditedPaths,
          options: {
            templateId: right.templateId,
            crops: right.crops,
            signText: right.signText,
            themeId: right.themeId,
            previewRotation: right.previewRotation,
          },
        },
      )
      console.log(`[print] composed strip2 pair: ${job.photoIds.join(' + ')}`)
      await printSheetJpeg(jpegBuffer, job.id, 'portrait')
      return
    }

    const filePaths = registry.getJobFilePaths(job)
    for (const filePath of filePaths) await fs.access(filePath)
    if (filePaths.length < 2) throw new Error('Faltan archivos para imprimir la pareja de tiras')
    const jpegBuffer = await composeStripPair(filePaths[0], filePaths[1])
    console.log(`[print] composed legacy strip pair: ${filePaths.join(' + ')}`)
    await printSheetJpeg(jpegBuffer, job.id, 'portrait')
    return
  }

  if (job.type === 'strip3') {
    const source = registry.getStripPrintSource(job.photoIds[0])
    if (!source || source.poseOriginalPaths.length < 3) {
      throw new Error('Faltan poses para tira de 3')
    }
    const jpegBuffer = await composeStrip3Sheet(
      source.poseOriginalPaths,
      source.poseEditedPaths,
      {
        templateId: source.templateId,
        crops: source.crops,
        signText: source.signText,
        themeId: source.themeId,
        previewRotation: source.previewRotation,
      },
    )
    console.log(`[print] composed strip3: ${job.photoIds[0]}`)
    await printSheetJpeg(jpegBuffer, job.id, 'portrait')
    return
  }

  const filePaths = registry.getJobFilePaths(job)
  for (const filePath of filePaths) {
    await fs.access(filePath)
  }

  if (!filePaths[0]) {
    throw new Error('Falta archivo de foto individual')
  }

  const photoId = job.photoIds[0]
  const printSource = registry.getIndividualPrintPaths(photoId)
  if (printSource?.templateId === 'instagram') {
    const composed = await composeInstagramIndividual(
      printSource.originalPath,
      printSource.meta,
      printSource.frameOptions,
      printSource.editedPath,
    )
    console.log(`[print] composed individual Instagram frame: ${photoId}`)
    await printSheetJpeg(composed.buffer, job.id, composed.layout)
    return
  }

  if (printSource?.originalPath) {
    await fs.access(printSource.originalPath)
    const composed = await composeIndividualForPrint(
      printSource.originalPath,
      printSource.meta,
      printSource.editedPath,
    )
    console.log(`[print] composed individual from original (${composed.layout}): ${printSource.originalPath}`)
    await printSheetJpeg(composed.buffer, job.id, composed.layout)
    return
  }

  const composed = await composeIndividual(filePaths[0])
  console.log(`[print] composed individual (${composed.layout}): ${filePaths[0]}`)
  await printSheetJpeg(composed.buffer, job.id, composed.layout)
}

async function processNextJob(): Promise<void> {
  if (processing || !registryRef) return
  const registry = registryRef
  const job = registry.claimNextJob()
  if (!job) return

  processing = true
  try {
    await executePrint(job, registry)
    registry.completeJob(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[print] job ${job.id} failed:`, message)
    registry.failJob(job.id, message)
  } finally {
    processing = false
  }
}

function tick(): void {
  void processNextJob()
}

export function startPrintWorker(registry: EventRegistry): void {
  registryRef = registry
  if (workerTimer) return
  workerTimer = setInterval(tick, 800)
  tick()
}

export function stopPrintWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer)
    workerTimer = null
  }
  registryRef = null
  processing = false
}
