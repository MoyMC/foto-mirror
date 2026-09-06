export type PhotoType = 'strip' | 'individual'

export type StripKind = 'strip2' | 'strip3'

export type PrintStatus =
  | 'available'
  | 'waiting_pair'
  | 'queued'
  | 'printing'
  | 'printed'
  | 'failed'
  | 'expired'

export type PrintJobType = 'strip_pair' | 'strip3' | 'individual'

export type PrintJobStatus = 'queued' | 'printing' | 'completed' | 'failed'

export interface PrintCropRect {
  x: number
  y: number
  w: number
  h: number
}

export interface InstagramFrameOptions {
  liked: boolean
  likesText: string
  commentsText: string
  repostsText: string
  sharesText: string
  dateText: string
  caption: string
  crop?: PrintCropRect | null
}

export interface PhotoRow {
  id: string
  type: PhotoType
  stripKind: StripKind | null
  createdAt: string
  qrFilename: string
  stripFilename: string | null
  poseFilenames: string[] | null
  editedFilename: string | null
  originalFilename: string | null
  signText: string | null
  signX: number | null
  signY: number | null
  signFontId: string | null
  signSizeId: string | null
  themeId: string | null
  previewRotation: number | null
  needsOrientationPass: number | null
  printTemplateId: string | null
  printCrops: PrintCropRect[] | null
  printFrameOptions: InstagramFrameOptions | null
  printStatus: PrintStatus
  printAllowed: number
  requestedAt: string | null
  printedAt: string | null
  printJobId: string | null
  pairedWith: string | null
  expiresAt: string | null
}

export interface IndividualPrintMeta {
  originalFilename: string
  signText?: string | null
  signX?: number | null
  signY?: number | null
  signFontId?: string | null
  signSizeId?: string | null
  themeId?: string | null
  previewRotation?: number | null
  needsOrientationPass?: boolean
}

export interface PrintJobRow {
  id: string
  type: PrintJobType
  status: PrintJobStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
  photoIds: string[]
}

export interface PrintStatusPayload {
  ok: boolean
  photoId?: string
  type?: PhotoType
  stripKind?: StripKind | null
  status?: PrintStatus
  message?: string
  pairedWith?: string | null
  printJobId?: string | null
}

export interface PrintRequestOptions {
  templateId?: string
  crops?: PrintCropRect[]
  frameOptions?: InstagramFrameOptions
}

export interface PrintRequestPayload {
  ok: boolean
  photoId?: string
  status?: PrintStatus
  message?: string
}

export interface StripManifest {
  type: 'strip'
  id: string
  stripKind: StripKind
  files: {
    strip: string
    poses: string[]
  }
  signText?: string | null
  themeId?: string | null
}
