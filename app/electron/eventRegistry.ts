import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  IndividualPrintMeta,
  InstagramFrameOptions,
  PhotoRow,
  PhotoType,
  PrintCropRect,
  PrintJobRow,
  PrintJobStatus,
  PrintRequestOptions,
  PrintRequestPayload,
  PrintStatus,
  PrintStatusPayload,
  StripKind,
  StripManifest,
} from './printTypes'
import { normalizeInstagramFrameOptions } from './frames/instagramTypes'

const SCHEMA_VERSION = 5

function dbPathFor(photosDir: string): string {
  return path.join(photosDir, '.fotomirror', 'event.db')
}

function nowIso(): string {
  return new Date().toISOString()
}

function parsePoseFilenames(value: string | null): string[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

function parsePhotoIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function parsePrintCrops(value: string | null): PrintCropRect[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const rect = entry as Record<string, unknown>
        const x = Number(rect.x)
        const y = Number(rect.y)
        const w = Number(rect.w)
        const h = Number(rect.h)
        if (![x, y, w, h].every((n) => Number.isFinite(n))) return null
        return { x, y, w, h }
      })
      .filter((rect): rect is PrintCropRect => rect != null)
  } catch {
    return null
  }
}

function parsePrintFrameOptions(raw: string | null | undefined): InstagramFrameOptions | null {
  if (!raw) return null
  try {
    return normalizeInstagramFrameOptions(JSON.parse(raw))
  } catch {
    return null
  }
}

function rowToPhoto(row: Record<string, unknown>): PhotoRow {
  const stripKindRaw = row.strip_kind ? String(row.strip_kind) : null
  const stripKind: StripKind | null =
    stripKindRaw === 'strip2' || stripKindRaw === 'strip3' ? stripKindRaw : null
  return {
    id: String(row.id),
    type: row.type as PhotoType,
    stripKind,
    createdAt: String(row.created_at),
    qrFilename: String(row.qr_filename),
    stripFilename: row.strip_filename ? String(row.strip_filename) : null,
    poseFilenames: parsePoseFilenames(row.pose_filenames as string | null),
    editedFilename: row.edited_filename ? String(row.edited_filename) : null,
    originalFilename: row.original_filename ? String(row.original_filename) : null,
    signText: row.sign_text ? String(row.sign_text) : null,
    signX: row.sign_x != null ? Number(row.sign_x) : null,
    signY: row.sign_y != null ? Number(row.sign_y) : null,
    signFontId: row.sign_font_id ? String(row.sign_font_id) : null,
    signSizeId: row.sign_size_id ? String(row.sign_size_id) : null,
    overlayMode: row.overlay_mode ? String(row.overlay_mode) : null,
    overlayScale: row.overlay_scale != null ? Number(row.overlay_scale) : null,
    themeId: row.theme_id ? String(row.theme_id) : null,
    previewRotation: row.preview_rotation != null ? Number(row.preview_rotation) : null,
    needsOrientationPass: row.needs_orientation_pass != null ? Number(row.needs_orientation_pass) : null,
    printTemplateId: row.print_template_id ? String(row.print_template_id) : null,
    printCrops: parsePrintCrops(row.print_crops as string | null),
    printFrameOptions: parsePrintFrameOptions(row.print_frame_options as string | null),
    printStatus: row.print_status as PrintStatus,
    printAllowed: Number(row.print_allowed),
    requestedAt: row.requested_at ? String(row.requested_at) : null,
    printedAt: row.printed_at ? String(row.printed_at) : null,
    printJobId: row.print_job_id ? String(row.print_job_id) : null,
    pairedWith: row.paired_with ? String(row.paired_with) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }
}

function rowToJob(row: Record<string, unknown>): PrintJobRow {
  return {
    id: String(row.id),
    type: row.type as PrintJobRow['type'],
    status: row.status as PrintJobStatus,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    error: row.error ? String(row.error) : null,
    photoIds: parsePhotoIds(String(row.photo_ids)),
  }
}

export class EventRegistry {
  private db: Database.Database
  readonly photosDir: string
  readonly editadasDir: string
  readonly originalesDir: string

  constructor(photosDir: string) {
    this.photosDir = photosDir
    this.editadasDir = path.join(photosDir, 'editadas')
    this.originalesDir = path.join(photosDir, 'originales')
    const dbDir = path.dirname(dbPathFor(photosDir))
    fs.mkdirSync(dbDir, { recursive: true })
    this.db = new Database(dbPathFor(photosDir))
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.migrate()
    this.ensureSession()
    this.activateSession()
    this.reconcileAfterRestart()
  }

  close(): void {
    this.db.close()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        active INTEGER NOT NULL DEFAULT 1,
        started_at TEXT NOT NULL,
        closed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('strip', 'individual')),
        created_at TEXT NOT NULL,
        qr_filename TEXT NOT NULL UNIQUE,
        strip_filename TEXT,
        pose_filenames TEXT,
        edited_filename TEXT,
        print_status TEXT NOT NULL DEFAULT 'available',
        print_allowed INTEGER NOT NULL DEFAULT 1,
        requested_at TEXT,
        printed_at TEXT,
        print_job_id TEXT,
        paired_with TEXT,
        expires_at TEXT,
        original_filename TEXT,
        sign_text TEXT,
        sign_x REAL,
        sign_y REAL,
        sign_font_id TEXT,
        sign_size_id TEXT,
        overlay_mode TEXT,
        overlay_scale REAL,
        theme_id TEXT,
        preview_rotation INTEGER,
        needs_orientation_pass INTEGER,
        strip_kind TEXT,
        print_template_id TEXT,
        print_crops TEXT,
        print_frame_options TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_photos_qr ON photos(qr_filename);
      CREATE INDEX IF NOT EXISTS idx_photos_print_status ON photos(print_status);

      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('strip_pair', 'strip3', 'individual')),
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        error TEXT,
        photo_ids TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
    `)

    const versionRow = this.db
      .prepare(`SELECT value FROM schema_meta WHERE key = 'version'`)
      .get() as { value: string } | undefined
    const currentVersion = versionRow ? Number(versionRow.value) : 1
    if (!versionRow) {
      this.db
        .prepare(`INSERT INTO schema_meta (key, value) VALUES ('version', ?)`)
        .run(String(SCHEMA_VERSION))
    } else if (currentVersion < SCHEMA_VERSION) {
      this.migrateSchema(currentVersion)
      this.db
        .prepare(`UPDATE schema_meta SET value = ? WHERE key = 'version'`)
        .run(String(SCHEMA_VERSION))
    }
  }

  private migrateSchema(fromVersion: number): void {
    if (fromVersion < 2) {
      const cols = this.db.prepare(`PRAGMA table_info(photos)`).all() as Array<{ name: string }>
      const names = new Set(cols.map((col) => col.name))
      const additions: Array<[string, string]> = [
        ['original_filename', 'TEXT'],
        ['sign_text', 'TEXT'],
        ['sign_x', 'REAL'],
        ['sign_y', 'REAL'],
        ['sign_font_id', 'TEXT'],
        ['sign_size_id', 'TEXT'],
        ['theme_id', 'TEXT'],
        ['preview_rotation', 'INTEGER'],
        ['needs_orientation_pass', 'INTEGER'],
      ]
      for (const [name, type] of additions) {
        if (!names.has(name)) {
          this.db.exec(`ALTER TABLE photos ADD COLUMN ${name} ${type}`)
        }
      }
    }

    if (fromVersion < 3) {
      const cols = this.db.prepare(`PRAGMA table_info(photos)`).all() as Array<{ name: string }>
      const names = new Set(cols.map((col) => col.name))
      const additions: Array<[string, string]> = [
        ['strip_kind', 'TEXT'],
        ['print_template_id', 'TEXT'],
        ['print_crops', 'TEXT'],
      ]
      for (const [name, type] of additions) {
        if (!names.has(name)) {
          this.db.exec(`ALTER TABLE photos ADD COLUMN ${name} ${type}`)
        }
      }

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS print_jobs_v3 (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('strip_pair', 'strip3', 'individual')),
          status TEXT NOT NULL DEFAULT 'queued',
          created_at TEXT NOT NULL,
          started_at TEXT,
          completed_at TEXT,
          error TEXT,
          photo_ids TEXT NOT NULL
        );
        INSERT INTO print_jobs_v3 (id, type, status, created_at, started_at, completed_at, error, photo_ids)
        SELECT id, type, status, created_at, started_at, completed_at, error, photo_ids FROM print_jobs;
        DROP TABLE print_jobs;
        ALTER TABLE print_jobs_v3 RENAME TO print_jobs;
        CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
      `)
    }

    if (fromVersion < 4) {
      const cols = this.db.prepare(`PRAGMA table_info(photos)`).all() as Array<{ name: string }>
      const names = new Set(cols.map((col) => col.name))
      if (!names.has('print_frame_options')) {
        this.db.exec(`ALTER TABLE photos ADD COLUMN print_frame_options TEXT`)
      }
    }

    if (fromVersion < 5) {
      const cols = this.db.prepare(`PRAGMA table_info(photos)`).all() as Array<{ name: string }>
      const names = new Set(cols.map((col) => col.name))
      if (!names.has('overlay_mode')) {
        this.db.exec(`ALTER TABLE photos ADD COLUMN overlay_mode TEXT`)
      }
      if (!names.has('overlay_scale')) {
        this.db.exec(`ALTER TABLE photos ADD COLUMN overlay_scale REAL`)
      }
    }
  }

  private ensureSession(): void {
    const row = this.db.prepare(`SELECT id FROM session WHERE id = 1`).get()
    if (!row) {
      this.db
        .prepare(`INSERT INTO session (id, active, started_at) VALUES (1, 1, ?)`)
        .run(nowIso())
    }
  }

  /** Marca la sesión como activa mientras el espejo está en marcha. */
  activateSession(): void {
    this.ensureSession()
    this.db
      .prepare(`UPDATE session SET active = 1, closed_at = NULL WHERE id = 1`)
      .run()
  }

  private reconcileAfterRestart(): void {
    const reconcile = this.db.transaction(() => {
      const orphanedJobs = this.db
        .prepare(`SELECT id, photo_ids FROM print_jobs WHERE status = 'printing'`)
        .all() as Array<{ id: string; photo_ids: string }>

      for (const job of orphanedJobs) {
        this.db
          .prepare(
            `UPDATE print_jobs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`,
          )
          .run('Reinicio durante impresión', nowIso(), job.id)

        for (const photoId of parsePhotoIds(job.photo_ids)) {
          this.db
            .prepare(`UPDATE photos SET print_status = 'failed', print_job_id = NULL WHERE id = ?`)
            .run(photoId)
        }
      }

      const waiting = this.db
        .prepare(
          `SELECT id FROM photos WHERE print_status = 'waiting_pair' ORDER BY requested_at ASC`,
        )
        .all() as Array<{ id: string }>

      for (let i = 0; i + 1 < waiting.length; i += 2) {
        this.createStripPairJob(waiting[i].id, waiting[i + 1].id)
      }
    })

    reconcile()
  }

  isSessionActive(): boolean {
    const row = this.db
      .prepare(`SELECT active FROM session WHERE id = 1`)
      .get() as { active: number } | undefined
    return row?.active === 1
  }

  closeSession(): void {
    const closedAt = nowIso()
    const close = this.db.transaction(() => {
      this.db
        .prepare(`UPDATE session SET active = 0, closed_at = ? WHERE id = 1`)
        .run(closedAt)

      this.db
        .prepare(
          `UPDATE photos
           SET print_status = 'expired', expires_at = ?
           WHERE print_status IN ('available', 'waiting_pair', 'queued')`,
        )
        .run(closedAt)

      this.db
        .prepare(
          `UPDATE print_jobs
           SET status = 'failed', error = 'Sesión cerrada', completed_at = ?
           WHERE status IN ('queued', 'printing')`,
        )
        .run(closedAt)
    })
    close()
  }

  registerStrip(input: {
    stripId: string
    stripKind: StripKind
    stripFilename: string
    poseFilenames: string[]
    signText?: string | null
    themeId?: string | null
    previewRotation?: number | null
  }): void {
    const createdAt = nowIso()
    this.db
      .prepare(
        `INSERT INTO photos (
          id, type, strip_kind, created_at, qr_filename, strip_filename, pose_filenames,
          sign_text, theme_id, preview_rotation,
          print_status, print_allowed
        ) VALUES (?, 'strip', ?, ?, ?, ?, ?, ?, ?, ?, 'available', 1)
        ON CONFLICT(id) DO NOTHING`,
      )
      .run(
        input.stripId,
        input.stripKind,
        createdAt,
        input.stripFilename,
        input.stripFilename,
        JSON.stringify(input.poseFilenames),
        input.signText ?? null,
        input.themeId ?? null,
        input.previewRotation ?? null,
      )
  }

  registerIndividual(input: { photoId: string; filename: string; printMeta?: IndividualPrintMeta }): void {
    const createdAt = nowIso()
    const meta = input.printMeta
    this.db
      .prepare(
        `INSERT INTO photos (
          id, type, created_at, qr_filename, edited_filename, original_filename,
          sign_text, sign_x, sign_y, sign_font_id, sign_size_id, overlay_mode, overlay_scale, theme_id,
          preview_rotation, needs_orientation_pass,
          print_status, print_allowed
        ) VALUES (?, 'individual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 1)
        ON CONFLICT(id) DO NOTHING`,
      )
      .run(
        input.photoId,
        createdAt,
        input.filename,
        input.filename,
        meta?.originalFilename ?? input.filename,
        meta?.signText ?? null,
        meta?.signX ?? null,
        meta?.signY ?? null,
        meta?.signFontId ?? null,
        meta?.signSizeId ?? null,
        meta?.overlayMode ?? null,
        meta?.overlayScale ?? null,
        meta?.themeId ?? null,
        meta?.previewRotation ?? null,
        meta?.needsOrientationPass ? 1 : 0,
      )
  }

  getPhotoByQrFilename(qrFilename: string): PhotoRow | null {
    const row = this.db.prepare(`SELECT * FROM photos WHERE qr_filename = ?`).get(qrFilename) as
      | Record<string, unknown>
      | undefined
    return row ? rowToPhoto(row) : null
  }

  getStripManifest(qrFilename: string): StripManifest | null {
    const photo = this.getPhotoByQrFilename(qrFilename)
    if (!photo || photo.type !== 'strip') return null

    const stripKind: StripKind =
      photo.stripKind ??
      (photo.poseFilenames && photo.poseFilenames.length <= 2 ? 'strip2' : 'strip3')
    const strip = photo.stripFilename ?? qrFilename
    const stored = photo.poseFilenames
    const poseCount = stripKind === 'strip2' ? 2 : 3
    const poses =
      stored && stored.length >= poseCount
        ? stored.slice(0, poseCount)
        : Array.from({ length: poseCount }, (_, i) => `tira-${photo.id}-${i + 1}.jpg`)

    return {
      type: 'strip',
      id: photo.id,
      stripKind,
      files: { strip, poses },
      signText: photo.signText,
      themeId: photo.themeId,
    }
  }

  getPhotoById(photoId: string): PhotoRow | null {
    const row = this.db.prepare(`SELECT * FROM photos WHERE id = ?`).get(photoId) as
      | Record<string, unknown>
      | undefined
    return row ? rowToPhoto(row) : null
  }

  getPrintStatus(qrFilename: string): PrintStatusPayload {
    const photo = this.getPhotoByQrFilename(qrFilename)
    if (!photo) {
      return { ok: false, message: 'Foto no registrada' }
    }
    if (!this.isSessionActive() && photo.printStatus === 'available') {
      return {
        ok: false,
        photoId: photo.id,
        type: photo.type,
        status: 'expired',
        message: 'La sesión del evento ya terminó',
      }
    }
    return {
      ok: true,
      photoId: photo.id,
      type: photo.type,
      stripKind: photo.stripKind,
      status: photo.printStatus,
      pairedWith: photo.pairedWith,
      printJobId: photo.printJobId,
      message: statusMessage(photo.printStatus),
    }
  }

  requestPrint(qrFilename: string, options: PrintRequestOptions = {}): PrintRequestPayload {
    if (!this.isSessionActive()) {
      return { ok: false, message: 'La sesión del evento ya terminó' }
    }

    const photo = this.getPhotoByQrFilename(qrFilename)
    if (!photo) {
      return { ok: false, message: 'Foto no registrada' }
    }

    if (photo.printStatus === 'printed') {
      return { ok: false, photoId: photo.id, status: photo.printStatus, message: 'Ya se imprimió' }
    }
    if (photo.printStatus === 'expired') {
      return { ok: false, photoId: photo.id, status: photo.printStatus, message: 'Impresión expirada' }
    }
    if (
      photo.printStatus === 'waiting_pair' ||
      photo.printStatus === 'queued' ||
      photo.printStatus === 'printing'
    ) {
      return {
        ok: true,
        photoId: photo.id,
        status: photo.printStatus,
        message: statusMessage(photo.printStatus),
      }
    }
    if (photo.printStatus === 'failed') {
      return {
        ok: false,
        photoId: photo.id,
        status: photo.printStatus,
        message: 'Impresión fallida; pide ayuda al operador',
      }
    }

    if (options.templateId || options.crops || options.frameOptions) {
      this.db
        .prepare(
          `UPDATE photos SET
            print_template_id = COALESCE(?, print_template_id),
            print_crops = COALESCE(?, print_crops),
            print_frame_options = COALESCE(?, print_frame_options)
           WHERE id = ?`,
        )
        .run(
          options.templateId ?? null,
          options.crops ? JSON.stringify(options.crops) : null,
          options.frameOptions ? JSON.stringify(normalizeInstagramFrameOptions(options.frameOptions)) : null,
          photo.id,
        )
    }

    if (photo.type === 'individual') {
      return this.enqueueIndividual(photo.id)
    }

    const kind = photo.stripKind ?? 'strip3'
    if (kind === 'strip3') {
      return this.enqueueStrip3(photo.id)
    }
    return this.enqueueStrip2(photo.id)
  }

  private enqueueIndividual(photoId: string): PrintRequestPayload {
    const jobId = randomUUID()
    const requestedAt = nowIso()

    const run = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE photos
           SET print_status = 'queued', requested_at = ?, print_job_id = ?
           WHERE id = ?`,
        )
        .run(requestedAt, jobId, photoId)

      this.db
        .prepare(
          `INSERT INTO print_jobs (id, type, status, created_at, photo_ids)
           VALUES (?, 'individual', 'queued', ?, ?)`,
        )
        .run(jobId, requestedAt, JSON.stringify([photoId]))
    })
    run()

    return { ok: true, photoId, status: 'queued', message: statusMessage('queued') }
  }

  private enqueueStrip3(photoId: string): PrintRequestPayload {
    const jobId = randomUUID()
    const requestedAt = nowIso()

    const run = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE photos
           SET print_status = 'queued', requested_at = ?, print_job_id = ?
           WHERE id = ?`,
        )
        .run(requestedAt, jobId, photoId)

      this.db
        .prepare(
          `INSERT INTO print_jobs (id, type, status, created_at, photo_ids)
           VALUES (?, 'strip3', 'queued', ?, ?)`,
        )
        .run(jobId, requestedAt, JSON.stringify([photoId]))
    })
    run()

    return { ok: true, photoId, status: 'queued', message: statusMessage('queued') }
  }

  private enqueueStrip2(photoId: string): PrintRequestPayload {
    const requestedAt = nowIso()

    const waitingPartner = this.db
      .prepare(
        `SELECT id FROM photos
         WHERE type = 'strip'
           AND strip_kind = 'strip2'
           AND print_status = 'waiting_pair'
           AND id != ?
         ORDER BY requested_at ASC
         LIMIT 1`,
      )
      .get(photoId) as { id: string } | undefined

    if (waitingPartner) {
      this.createStripPairJob(waitingPartner.id, photoId)
      return {
        ok: true,
        photoId,
        status: 'queued',
        message: 'Pareja lista; imprimiendo pronto',
      }
    }

    this.db
      .prepare(
        `UPDATE photos
         SET print_status = 'waiting_pair', requested_at = ?
         WHERE id = ?`,
      )
      .run(requestedAt, photoId)

    return {
      ok: true,
      photoId,
      status: 'waiting_pair',
      message: statusMessage('waiting_pair'),
    }
  }

  private createStripPairJob(stripIdA: string, stripIdB: string): string {
    const jobId = randomUUID()
    const createdAt = nowIso()

    const run = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE photos
           SET print_status = 'queued', print_job_id = ?, paired_with = ?
           WHERE id = ?`,
        )
        .run(jobId, stripIdB, stripIdA)

      this.db
        .prepare(
          `UPDATE photos
           SET print_status = 'queued', print_job_id = ?, paired_with = ?
           WHERE id = ?`,
        )
        .run(jobId, stripIdA, stripIdB)

      this.db
        .prepare(
          `INSERT INTO print_jobs (id, type, status, created_at, photo_ids)
           VALUES (?, 'strip_pair', 'queued', ?, ?)`,
        )
        .run(jobId, createdAt, JSON.stringify([stripIdA, stripIdB]))
    })
    run()

    return jobId
  }

  claimNextJob(): PrintJobRow | null {
    const row = this.db
      .prepare(`SELECT * FROM print_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`)
      .get() as Record<string, unknown> | undefined
    if (!row) return null

    const job = rowToJob(row)
    const startedAt = nowIso()

    const claim = this.db.transaction(() => {
      const updated = this.db
        .prepare(
          `UPDATE print_jobs SET status = 'printing', started_at = ? WHERE id = ? AND status = 'queued'`,
        )
        .run(startedAt, job.id)
      if (updated.changes === 0) return false

      for (const photoId of job.photoIds) {
        this.db.prepare(`UPDATE photos SET print_status = 'printing' WHERE id = ?`).run(photoId)
      }
      return true
    })

    if (!claim()) return null
    return { ...job, status: 'printing', startedAt }
  }

  completeJob(jobId: string): void {
    const completedAt = nowIso()
    const job = this.db.prepare(`SELECT photo_ids FROM print_jobs WHERE id = ?`).get(jobId) as
      | { photo_ids: string }
      | undefined
    if (!job) return

    const photoIds = parsePhotoIds(job.photo_ids)
    const finish = this.db.transaction(() => {
      this.db
        .prepare(`UPDATE print_jobs SET status = 'completed', completed_at = ? WHERE id = ?`)
        .run(completedAt, jobId)

      for (const photoId of photoIds) {
        this.db
          .prepare(`UPDATE photos SET print_status = 'printed', printed_at = ? WHERE id = ?`)
          .run(completedAt, photoId)
      }
    })
    finish()
  }

  failJob(jobId: string, error: string): void {
    const completedAt = nowIso()
    const job = this.db.prepare(`SELECT photo_ids FROM print_jobs WHERE id = ?`).get(jobId) as
      | { photo_ids: string }
      | undefined
    if (!job) return

    const photoIds = parsePhotoIds(job.photo_ids)
    const fail = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE print_jobs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`,
        )
        .run(error, completedAt, jobId)

      for (const photoId of photoIds) {
        this.db
          .prepare(`UPDATE photos SET print_status = 'failed', print_job_id = NULL WHERE id = ?`)
          .run(photoId)
      }
    })
    fail()
  }

  getJobFilePaths(job: PrintJobRow): string[] {
    const paths: string[] = []
    for (const photoId of job.photoIds) {
      const photo = this.getPhotoById(photoId)
      if (!photo) continue
      if (photo.type === 'strip' && photo.stripFilename) {
        paths.push(path.join(this.editadasDir, photo.stripFilename))
      } else if (photo.type === 'individual' && photo.editedFilename) {
        paths.push(path.join(this.editadasDir, photo.editedFilename))
      }
    }
    return paths
  }

  getStripPrintSource(photoId: string): {
    poseOriginalPaths: string[]
    poseEditedPaths: string[]
    templateId: string | null
    crops: PrintCropRect[] | null
    signText: string | null
    themeId: string | null
    previewRotation: number | null
    stripKind: StripKind
  } | null {
    const photo = this.getPhotoById(photoId)
    if (!photo || photo.type !== 'strip') return null
    const poses = photo.poseFilenames ?? []
    const stripKind: StripKind = photo.stripKind ?? (poses.length <= 2 ? 'strip2' : 'strip3')
    return {
      poseOriginalPaths: poses.map((name) => path.join(this.originalesDir, name)),
      poseEditedPaths: poses.map((name) => path.join(this.editadasDir, name)),
      templateId: photo.printTemplateId,
      crops: photo.printCrops,
      signText: photo.signText,
      themeId: photo.themeId,
      previewRotation: photo.previewRotation,
      stripKind,
    }
  }

  getIndividualPrintPaths(photoId: string): {
    originalPath: string | null
    editedPath: string | null
    meta: IndividualPrintMeta | null
    templateId: string | null
    frameOptions: InstagramFrameOptions | null
  } | null {
    const photo = this.getPhotoById(photoId)
    if (!photo || photo.type !== 'individual') return null

    const editedPath = photo.editedFilename
      ? path.join(this.editadasDir, photo.editedFilename)
      : null

    if (!photo.originalFilename) {
      return {
        originalPath: null,
        editedPath,
        meta: null,
        templateId: photo.printTemplateId,
        frameOptions: photo.printFrameOptions,
      }
    }

    return {
      originalPath: path.join(this.originalesDir, photo.originalFilename),
      editedPath,
      meta: {
        originalFilename: photo.originalFilename,
        signText: photo.signText,
        signX: photo.signX,
        signY: photo.signY,
        signFontId: photo.signFontId,
        signSizeId: photo.signSizeId,
        themeId: photo.themeId,
        previewRotation: photo.previewRotation,
        needsOrientationPass: Boolean(photo.needsOrientationPass),
        overlayMode: (photo.overlayMode as IndividualPrintMeta['overlayMode']) ?? null,
        overlayScale: photo.overlayScale,
      },
      templateId: photo.printTemplateId,
      frameOptions: photo.printFrameOptions,
    }
  }

  listWaitingStrips(): PhotoRow[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM photos WHERE type = 'strip' AND print_status = 'waiting_pair' ORDER BY requested_at ASC`,
      )
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToPhoto)
  }

  listRecentJobs(limit = 20): PrintJobRow[] {
    const rows = this.db
      .prepare(`SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as Array<Record<string, unknown>>
    return rows.map(rowToJob)
  }
}

function statusMessage(status: PrintStatus): string {
  switch (status) {
    case 'available':
      return 'Puedes imprimir una copia'
    case 'waiting_pair':
      return 'Esperando otra tira para imprimir en la misma hoja'
    case 'queued':
      return 'En cola de impresión'
    case 'printing':
      return 'Imprimiendo…'
    case 'printed':
      return 'Ya se imprimió'
    case 'failed':
      return 'Error de impresión'
    case 'expired':
      return 'Impresión no disponible'
    default:
      return ''
  }
}

let activeRegistry: EventRegistry | null = null

export function openEventRegistry(photosDir: string): EventRegistry {
  if (activeRegistry && activeRegistry.photosDir === photosDir) {
    activeRegistry.activateSession()
    return activeRegistry
  }
  if (activeRegistry) {
    activeRegistry.close()
  }
  activeRegistry = new EventRegistry(photosDir)
  return activeRegistry
}

export function getEventRegistry(): EventRegistry | null {
  return activeRegistry
}

export function closeEventRegistry(): void {
  if (activeRegistry) {
    activeRegistry.close()
    activeRegistry = null
  }
}

export function photoIdFromFilename(filename: string): string | null {
  const stripMatch = filename.match(/^tira-(\d+)-strip\.jpg$/i)
  if (stripMatch) return stripMatch[1]

  const fotoMatch = filename.match(/^foto-(\d+)\.jpg$/i)
  if (fotoMatch) return fotoMatch[1]

  return null
}
