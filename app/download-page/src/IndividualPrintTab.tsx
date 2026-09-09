import { useEffect, useRef, useState, type PointerEvent } from 'react'
import brandLogo from './assets/garys-festa-logo.png'

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

export type IndividualFrameId = 'none' | 'instagram'

/**
 * Match print compositor: 4×6 @ 300dpi with 2 cm top + 3 cm bottom chrome
 * → photo 1200×1210 (near-square).
 */
export const INSTAGRAM_PHOTO_ASPECT = 1200 / 1210

function defaultCrop(imageAspect: number, targetAspect: number): PrintCropRect {
  if (imageAspect > targetAspect) {
    const w = targetAspect / imageAspect
    return { x: (1 - w) / 2, y: 0, w, h: 1 }
  }
  const h = imageAspect / targetAspect
  return { x: 0, y: (1 - h) / 2, w: 1, h }
}

function cropObjectPosition(crop: PrintCropRect): string {
  const ax = crop.w >= 1 ? 50 : (crop.x / (1 - crop.w)) * 100
  const ay = crop.h >= 1 ? 50 : (crop.y / (1 - crop.h)) * 100
  return `${Math.min(100, Math.max(0, ax))}% ${Math.min(100, Math.max(0, ay))}%`
}

function defaultDate(): string {
  const d = new Date()
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

export function defaultInstagramOptions(): InstagramFrameOptions {
  return {
    liked: true,
    likesText: '12',
    commentsText: '3',
    repostsText: '1',
    sharesText: '2',
    dateText: defaultDate(),
    caption: '',
    crop: null,
  }
}

function IgCropEditor({
  src,
  value,
  onChange,
}: {
  src: string
  value: PrintCropRect
  onChange: (crop: PrintCropRect) => void
}) {
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
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
  }

  const viewAspect = natural ? natural.w / natural.h : INSTAGRAM_PHOTO_ASPECT

  return (
    <div className="crop-editor">
      <p className="crop-editor__label">Encuadra la foto</p>
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

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
        fill={filled ? '#ed4956' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconComment() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m21.854 2.147-10.94 10.939" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBookmark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconVerified() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill="#0095f6"
      />
      <path
        d="m9 12 2 2 4-4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface IndividualPrintTabProps {
  photoUrl: string
  busy: boolean
  canPrint: boolean
  statusLabel: string
  statusHint: string
  printStatus: string | null
  onConfirm: (templateId: IndividualFrameId, frameOptions?: InstagramFrameOptions) => void
}

export function IndividualPrintTab({
  photoUrl,
  busy,
  canPrint,
  statusLabel,
  statusHint,
  printStatus,
  onConfirm,
}: IndividualPrintTabProps) {
  const [frameId, setFrameId] = useState<IndividualFrameId>('none')
  const [opts, setOpts] = useState<InstagramFrameOptions>(() => defaultInstagramOptions())
  const [cropReady, setCropReady] = useState(false)

  const showStatusOnly = printStatus != null && printStatus !== 'available'

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const aspect = img.naturalWidth / Math.max(img.naturalHeight, 1)
      setOpts((o) => ({
        ...o,
        crop: o.crop ?? defaultCrop(aspect, INSTAGRAM_PHOTO_ASPECT),
      }))
      setCropReady(true)
    }
    img.onerror = () => {
      if (cancelled) return
      setOpts((o) => ({
        ...o,
        crop: o.crop ?? defaultCrop(3 / 2, INSTAGRAM_PHOTO_ASPECT),
      }))
      setCropReady(true)
    }
    img.src = photoUrl
    return () => {
      cancelled = true
    }
  }, [photoUrl])

  if (showStatusOnly) {
    const done = printStatus === 'printed'
    const wait = printStatus === 'queued' || printStatus === 'printing'
    const title =
      printStatus === 'printed'
        ? 'Listo'
        : printStatus === 'printing' || printStatus === 'queued'
          ? 'En camino'
          : statusLabel
    return (
      <div
        className={`print-status-card${done ? ' print-status-card--done' : ''}${wait ? ' print-status-card--wait' : ''}`}
      >
        <div className="print-status-card__mark" aria-hidden>
          {done ? '✓' : wait ? '…' : '!'}
        </div>
        <h2 className="print-status-card__title">{title}</h2>
        <p className="print-status-card__detail">{statusHint}</p>
      </div>
    )
  }

  const crop = opts.crop ?? defaultCrop(3 / 2, INSTAGRAM_PHOTO_ASPECT)

  return (
    <div className="individual-print-tab">
      <p className="strip-print-tab__title">Elige el marco</p>
      <div className="template-grid template-grid--frames">
        <button
          type="button"
          className={`template-card${frameId === 'none' ? ' template-card--active' : ''}`}
          onClick={() => setFrameId('none')}
        >
          <span className="template-card__swatch" style={{ background: '#1a1a1a' }} />
          <span className="template-card__name">Sin marco</span>
          <span className="template-card__cat">clásico</span>
        </button>
        <button
          type="button"
          className={`template-card${frameId === 'instagram' ? ' template-card--active' : ''}`}
          onClick={() => setFrameId('instagram')}
        >
          <span className="template-card__swatch" style={{ background: '#fafafa' }} />
          <span className="template-card__name">Instagram</span>
          <span className="template-card__cat">post</span>
        </button>
      </div>

      {frameId === 'instagram' ? (
        <>
          <div className="ig-preview" aria-label="Vista previa Instagram">
            <div className="ig-preview__header">
              <img src={brandLogo} alt="" className="ig-preview__avatar" />
              <span className="ig-preview__user">Gary&apos;s Festa</span>
              <span className="ig-preview__verified">
                <IconVerified />
              </span>
              <span className="ig-preview__more" aria-hidden>
                ···
              </span>
            </div>
            <div className="ig-preview__photo ig-preview__photo--print">
              <img
                src={photoUrl}
                alt=""
                style={{ objectPosition: cropObjectPosition(crop) }}
              />
            </div>
            <div className="ig-preview__actions ig-preview__actions--counts">
              <span className="ig-preview__stat">
                <IconHeart filled={opts.liked} />
                <span>{opts.likesText}</span>
              </span>
              <span className="ig-preview__stat">
                <IconComment />
                <span>{opts.commentsText}</span>
              </span>
              <span className="ig-preview__stat">
                <IconRefresh />
                <span>{opts.repostsText}</span>
              </span>
              <span className="ig-preview__stat">
                <IconSend />
                <span>{opts.sharesText}</span>
              </span>
              <span className="ig-preview__save">
                <IconBookmark />
              </span>
            </div>
            {opts.caption.trim() ? (
              <p className="ig-preview__caption">
                {opts.caption.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            ) : null}
            <p className="ig-preview__date">{opts.dateText}</p>
          </div>

          {cropReady ? (
            <IgCropEditor
              src={photoUrl}
              value={crop}
              onChange={(next) => setOpts((o) => ({ ...o, crop: next }))}
            />
          ) : (
            <p className="loading-label">Preparando encuadre…</p>
          )}

          <div className="ig-fields">
            <label className="ig-fields__row">
              <span>Corazón</span>
              <button
                type="button"
                className={`ig-like-toggle${opts.liked ? ' ig-like-toggle--on' : ''}`}
                onClick={() => setOpts((o) => ({ ...o, liked: !o.liked }))}
              >
                {opts.liked ? 'Lleno' : 'Vacío'}
              </button>
            </label>
            <label className="ig-fields__row">
              <span>Likes</span>
              <input
                type="text"
                value={opts.likesText}
                placeholder="11.2 mill."
                onChange={(e) => setOpts((o) => ({ ...o, likesText: e.target.value }))}
              />
            </label>
            <label className="ig-fields__row">
              <span>Comments</span>
              <input
                type="text"
                value={opts.commentsText}
                placeholder="76.9 mil"
                onChange={(e) => setOpts((o) => ({ ...o, commentsText: e.target.value }))}
              />
            </label>
            <label className="ig-fields__row">
              <span>Reposts</span>
              <input
                type="text"
                value={opts.repostsText}
                placeholder="159 mil"
                onChange={(e) => setOpts((o) => ({ ...o, repostsText: e.target.value }))}
              />
            </label>
            <label className="ig-fields__row">
              <span>Shares</span>
              <input
                type="text"
                value={opts.sharesText}
                placeholder="145 mil"
                onChange={(e) => setOpts((o) => ({ ...o, sharesText: e.target.value }))}
              />
            </label>
            <label className="ig-fields__row ig-fields__row--stack">
              <span>Fecha</span>
              <input
                type="text"
                value={opts.dateText}
                onChange={(e) => setOpts((o) => ({ ...o, dateText: e.target.value }))}
              />
            </label>
            <label className="ig-fields__row ig-fields__row--stack">
              <span>Texto (varias líneas)</span>
              <textarea
                rows={3}
                maxLength={240}
                placeholder="Escribí el texto debajo de las reacciones…"
                value={opts.caption}
                onChange={(e) => setOpts((o) => ({ ...o, caption: e.target.value }))}
              />
            </label>
          </div>
        </>
      ) : (
        <div className="individual-print-plain">
          <img src={photoUrl} alt="Tu foto" />
        </div>
      )}

      <div className="strip-print-prep__actions">
        <button
          type="button"
          className="cta"
          disabled={!canPrint || busy || (frameId === 'instagram' && !cropReady)}
          onClick={() => onConfirm(frameId, frameId === 'instagram' ? opts : undefined)}
        >
          {busy ? 'Solicitando…' : canPrint ? 'Imprimir' : statusLabel}
        </button>
      </div>
      <p className="hint hint--print">{statusHint}</p>
    </div>
  )
}
