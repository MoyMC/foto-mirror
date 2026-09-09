import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import FrameSVG from './frames/FrameSVG'
import { FRAMES, type FrameConfig } from './frames/frames'

export interface PrintCropRect {
  x: number
  y: number
  w: number
  h: number
}

export type StripTemplateId = (typeof FRAMES)[number]['id']

export const STRIP_TEMPLATES: {
  id: StripTemplateId
  name: string
  swatch: string
  category: string
}[] = FRAMES.map((f) => ({
  id: f.id,
  name: f.name,
  swatch: f.colors.frame,
  category: f.category,
}))

const LEGACY: Record<string, StripTemplateId> = {
  'classic-dark': 'boda-dark',
  'soft-cream': 'boda-cream',
  neon: 'fiesta-neon',
}

export function normalizeStripTemplateId(value: unknown): StripTemplateId {
  if (typeof value === 'string') {
    if (LEGACY[value]) return LEGACY[value]
    if (FRAMES.some((f) => f.id === value)) return value as StripTemplateId
  }
  return 'boda-cream'
}

/** Match stripPrintCompositor / Figma slot aspects. */
export function cropAspectForStrip(stripKind: 'strip2' | 'strip3'): number {
  return stripKind === 'strip2' ? 560 / 640 : 840 / 540
}

function defaultCrop(imageAspect: number, targetAspect: number): PrintCropRect {
  if (imageAspect > targetAspect) {
    const w = targetAspect / imageAspect
    return { x: (1 - w) / 2, y: 0, w, h: 1 }
  }
  const h = imageAspect / targetAspect
  return { x: 0, y: (1 - h) / 2, w: 1, h }
}

interface PoseCropEditorProps {
  src: string
  aspect: number
  value: PrintCropRect
  onChange: (crop: PrintCropRect) => void
  label: string
}

function PoseCropEditor({ src, aspect, value, onChange, label }: PoseCropEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: PrintCropRect
  } | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
  }, [src])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: valueRef.current,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const dx = (e.clientX - drag.startX) / rect.width
    const dy = (e.clientY - drag.startY) / rect.height
    const origin = drag.origin
    let x = origin.x - dx
    let y = origin.y - dy
    x = Math.max(0, Math.min(1 - origin.w, x))
    y = Math.max(0, Math.min(1 - origin.h, y))
    onChange({ ...origin, x, y })
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null
    }
  }

  const viewAspect = natural ? natural.w / natural.h : aspect

  return (
    <div className="crop-editor">
      <p className="crop-editor__label">{label}</p>
      <div
        ref={wrapRef}
        className="crop-editor__stage"
        style={{ aspectRatio: `${viewAspect}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img src={src} alt="" draggable={false} className="crop-editor__img" />
        <div
          className="crop-editor__frame"
          style={{
            left: `${value.x * 100}%`,
            top: `${value.y * 100}%`,
            width: `${value.w * 100}%`,
            height: `${value.h * 100}%`,
          }}
        />
      </div>
      <p className="hint">Arrastra para encuadrar</p>
    </div>
  )
}

interface StripPreviewProps {
  stripKind: 'strip2' | 'strip3'
  frame: FrameConfig
  signText?: string | null
}

function StripPreview({ stripKind, frame, signText }: StripPreviewProps) {
  return (
    <div className="strip-preview-wrap" aria-label="Vista previa de impresión">
      <FrameSVG frame={frame} mode={stripKind} signText={signText ?? ''} />
    </div>
  )
}

interface StripPrintTabProps {
  stripKind: 'strip2' | 'strip3'
  poseFiles: string[]
  photoUrlFor: (filename: string) => string
  signText?: string | null
  onConfirm: (templateId: StripTemplateId, crops: PrintCropRect[]) => void
  busy: boolean
  statusLabel: string
  statusHint: string
  canPrint: boolean
  /** When set and not available, hide crop/marco UI and show status only. */
  printStatus: string | null
}

function printStatusCopy(status: string | null): { title: string; detail: string } {
  if (status === 'waiting_pair') {
    return {
      title: 'Tu tira está en espera',
      detail: 'Cuando otra persona imprima su tira de 2, saldrán las dos en la misma hoja.',
    }
  }
  if (status === 'queued') {
    return {
      title: 'En cola de impresión',
      detail: 'Tu foto ya está lista; saldrá en unos momentos.',
    }
  }
  if (status === 'printing') {
    return {
      title: 'Imprimiendo…',
      detail: 'La impresora está trabajando en tu copia.',
    }
  }
  if (status === 'printed') {
    return {
      title: 'Listo',
      detail: 'Tu copia ya se imprimió. Solo se permite una impresión por enlace.',
    }
  }
  if (status === 'failed') {
    return {
      title: 'No se pudo imprimir',
      detail: 'Avisá al operador del evento para reintentar.',
    }
  }
  if (status === 'expired') {
    return {
      title: 'Sesión terminada',
      detail: 'La sesión del evento ya no acepta impresiones.',
    }
  }
  return {
    title: 'Impresión',
    detail: 'Estado de tu copia física.',
  }
}

function messageOr(hint: string, fallback: string): string {
  const trimmed = hint.trim()
  if (!trimmed) return fallback
  if (trimmed === 'Ya se imprimió' || trimmed === 'En cola' || trimmed === 'Imprimiendo…') {
    return fallback
  }
  return trimmed
}

export function StripPrintTab({
  stripKind,
  poseFiles,
  photoUrlFor,
  signText,
  onConfirm,
  busy,
  statusLabel,
  statusHint,
  canPrint,
  printStatus,
}: StripPrintTabProps) {
  const aspect = cropAspectForStrip(stripKind)
  const [templateId, setTemplateId] = useState<StripTemplateId>('boda-cream')
  const [phase, setPhase] = useState<'design' | 'crop'>('design')
  const [poseIndex, setPoseIndex] = useState(0)
  const [crops, setCrops] = useState<PrintCropRect[]>(() =>
    poseFiles.map(() => defaultCrop(2 / 3, aspect)),
  )
  const poseFilesKey = poseFiles.join('|')
  const [ready, setReady] = useState(false)
  const initializedKeyRef = useRef<string | null>(null)

  const showStatusOnly = printStatus != null && printStatus !== 'available'
  const frame = FRAMES.find((f) => f.id === templateId) ?? FRAMES[0]

  useEffect(() => {
    if (initializedKeyRef.current === `${poseFilesKey}::${aspect}`) return
    let cancelled = false
    void (async () => {
      const next: PrintCropRect[] = []
      for (const file of poseFiles) {
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject()
          img.src = photoUrlFor(file)
        })
        if (cancelled) return
        next.push(defaultCrop(img.naturalWidth / img.naturalHeight, aspect))
      }
      if (cancelled) return
      initializedKeyRef.current = `${poseFilesKey}::${aspect}`
      setCrops(next)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseFilesKey, aspect])

  const handlePrimary = useCallback(() => {
    if (!canPrint || busy) return
    if (phase === 'design') {
      setPhase('crop')
      setPoseIndex(0)
      return
    }
    if (poseIndex < poseFiles.length - 1) {
      setPoseIndex((i) => i + 1)
      return
    }
    onConfirm(templateId, crops)
  }, [canPrint, busy, phase, poseIndex, poseFiles.length, onConfirm, templateId, crops])

  if (showStatusOnly) {
    const copy = printStatusCopy(printStatus)
    const done = printStatus === 'printed'
    const wait =
      printStatus === 'waiting_pair' ||
      printStatus === 'queued' ||
      printStatus === 'printing'
    return (
      <div
        className={`print-status-card${done ? ' print-status-card--done' : ''}${wait ? ' print-status-card--wait' : ''}`}
      >
        <div className="print-status-card__mark" aria-hidden>
          {done ? '✓' : wait ? '…' : '!'}
        </div>
        <h2 className="print-status-card__title">{copy.title}</h2>
        <p className="print-status-card__detail">{messageOr(statusHint, copy.detail)}</p>
      </div>
    )
  }

  if (!ready) {
    return <p className="loading-label">Preparando impresión…</p>
  }

  return (
    <div className="strip-print-tab">
      {phase === 'design' ? (
        <>
          <StripPreview stripKind={stripKind} frame={frame} signText={signText} />
          <p className="strip-print-tab__title">Elige el marco</p>
          <div className="template-grid template-grid--frames">
            {STRIP_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card${templateId === template.id ? ' template-card--active' : ''}`}
                onClick={() => setTemplateId(template.id)}
              >
                <span className="template-card__swatch" style={{ background: template.swatch }} />
                <span className="template-card__name">{template.name}</span>
                <span className="template-card__cat">{template.category}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <PoseCropEditor
          src={photoUrlFor(poseFiles[poseIndex])}
          aspect={aspect}
          value={crops[poseIndex]}
          label={`Encuadra pose ${poseIndex + 1} de ${poseFiles.length}`}
          onChange={(crop) => {
            setCrops((prev) => prev.map((entry, i) => (i === poseIndex ? crop : entry)))
          }}
        />
      )}

      <div className="strip-print-prep__actions">
        {phase === 'crop' && (
          <button
            type="button"
            className="cta cta--ghost"
            disabled={busy}
            onClick={() => {
              if (poseIndex > 0) setPoseIndex((i) => i - 1)
              else setPhase('design')
            }}
          >
            Atrás
          </button>
        )}
        <button type="button" className="cta" disabled={!canPrint || busy} onClick={handlePrimary}>
          {busy
            ? 'Solicitando…'
            : phase === 'design'
              ? canPrint
                ? 'Encuadrar e imprimir'
                : statusLabel
              : poseIndex < poseFiles.length - 1
                ? 'Siguiente pose'
                : statusLabel === 'Imprimir'
                  ? 'Imprimir'
                  : statusLabel}
        </button>
      </div>
      <p className="hint hint--print">{statusHint}</p>
    </div>
  )
}
