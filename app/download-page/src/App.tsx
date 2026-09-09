import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StripPrintTab, type PrintCropRect, type StripTemplateId } from './StripPrintPrep'
import {
  IndividualPrintTab,
  type IndividualFrameId,
  type InstagramFrameOptions,
} from './IndividualPrintTab'
import brandLogo from './assets/garys-festa-logo.png'

type PageState = 'loading' | 'ready' | 'error'

interface StripManifest {
  type: 'strip'
  id: string
  stripKind: 'strip2' | 'strip3'
  files: {
    strip: string
    poses: string[]
  }
  signText?: string | null
  themeId?: string | null
}

interface StripSlide {
  filename: string
  dotLabel: string
  caption: string
  variant: 'strip' | 'pose'
  alt: string
}

type PrintStatus =
  | 'available'
  | 'waiting_pair'
  | 'queued'
  | 'printing'
  | 'printed'
  | 'failed'
  | 'expired'

interface PrintApiResponse {
  ok: boolean
  photoId?: string
  type?: 'strip' | 'individual'
  status?: PrintStatus
  message?: string
}

const THEMES = new Set([
  'neon-white',
  'neon-cyan',
  'neon-magenta',
  'neon-lime',
  'neon-amber',
  'neon-violet',
])

function parseRoute(): { filename: string | null; theme: string } {
  const path = window.location.pathname
  const match = path.match(/^\/f\/([^/]+)$/)
  const filename = match ? decodeURIComponent(match[1]) : null
  const themeParam = new URLSearchParams(window.location.search).get('theme') ?? 'neon-white'
  const theme = THEMES.has(themeParam) ? themeParam : 'neon-white'
  return { filename, theme }
}

function photoUrlFor(filename: string): string {
  return `/fotos/${encodeURIComponent(filename)}`
}

function stripIdFromFilename(filename: string): string | null {
  const match = filename.match(/^tira-(\d+)-strip\.jpg$/i)
  return match ? match[1] : null
}

function printQrFilename(filename: string, stripId: string | null): string {
  if (stripId) return `tira-${stripId}-strip.jpg`
  return filename
}

async function fetchStripManifest(qrFilename: string): Promise<StripManifest | null> {
  try {
    const res = await fetch(`/api/strip?qr=${encodeURIComponent(qrFilename)}`)
    if (!res.ok) return null
    const data = (await res.json()) as StripManifest
    return data.type === 'strip' ? data : null
  } catch {
    return null
  }
}

async function fetchEventConfig(): Promise<{ printEnabled: boolean }> {
  try {
    const res = await fetch('/api/config')
    if (!res.ok) return { printEnabled: false }
    const data = (await res.json()) as { printEnabled?: unknown }
    return { printEnabled: data.printEnabled === true }
  } catch {
    return { printEnabled: false }
  }
}

async function fetchPrintStatus(qrFilename: string): Promise<PrintApiResponse> {
  const res = await fetch(`/api/print/status?qr=${encodeURIComponent(qrFilename)}`)
  return (await res.json()) as PrintApiResponse
}

async function requestPrint(
  qrFilename: string,
  options?: {
    templateId?: string
    crops?: PrintCropRect[]
    frameOptions?: InstagramFrameOptions
  },
): Promise<PrintApiResponse> {
  const res = await fetch('/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qrFilename,
      templateId: options?.templateId,
      crops: options?.crops,
      frameOptions: options?.frameOptions,
    }),
  })
  return (await res.json()) as PrintApiResponse
}

function printButtonLabel(status: PrintStatus | null, message: string | null): string {
  if (!status || status === 'available') return 'Imprimir'
  if (status === 'waiting_pair') return 'Esperando otra tira'
  if (status === 'queued') return 'En cola'
  if (status === 'printing') return 'Imprimiendo…'
  if (status === 'printed') return 'Ya impreso'
  if (status === 'failed') return 'Error de impresión'
  if (status === 'expired') return 'No disponible'
  return message ?? 'Imprimir'
}

function printIsDisabled(status: PrintStatus | null, busy: boolean): boolean {
  if (busy) return true
  if (status === null) return true
  return status !== 'available'
}

function PrintIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  )
}

interface PrintControlsProps {
  qrFilename: string
  photoUrl?: string | null
  stripKind?: 'strip2' | 'strip3' | null
  poseFiles?: string[] | null
  signText?: string | null
}

function PrintControls({
  qrFilename,
  photoUrl = null,
  stripKind = null,
  poseFiles = null,
  signText = null,
}: PrintControlsProps) {
  const [status, setStatus] = useState<PrintStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshStatus = useCallback(async () => {
    try {
      const data = await fetchPrintStatus(qrFilename)
      if (data.status) {
        setStatus(data.status)
      } else if (data.ok === false && !data.status) {
        setStatus('available')
      }
      if (data.message) setMessage(data.message)
      else if (data.ok === false && data.status === 'expired') setMessage('La sesión del evento ya terminó')
    } catch {
      // ignore polling errors
    }
  }, [qrFilename])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    if (status === null) {
      void refreshStatus()
      return
    }
    if (status === 'printed' || status === 'failed' || status === 'expired') return
    const timer = setInterval(() => {
      void refreshStatus()
    }, 2_000)
    return () => clearInterval(timer)
  }, [status, refreshStatus])

  const submitPrint = async (options?: {
    templateId?: string
    crops?: PrintCropRect[]
    frameOptions?: InstagramFrameOptions
  }) => {
    setBusy(true)
    try {
      const data = await requestPrint(qrFilename, options)
      if (data.status) setStatus(data.status)
      if (data.message) setMessage(data.message)
      else if (!data.ok) setMessage('No se pudo solicitar la impresión')
    } catch {
      setMessage('No se pudo solicitar la impresión')
    } finally {
      setBusy(false)
    }
  }

  const hint =
    status === 'waiting_pair'
      ? 'Cuando otra persona imprima su tira de 2, saldrán las dos en la misma hoja'
      : status === 'printed'
        ? 'Solo se permite una impresión por QR'
        : 'Una copia física por enlace · las descargas son ilimitadas'

  if (stripKind && poseFiles && poseFiles.length > 0) {
    return (
      <StripPrintTab
        stripKind={stripKind}
        poseFiles={poseFiles}
        photoUrlFor={photoUrlFor}
        signText={signText}
        busy={busy}
        canPrint={!printIsDisabled(status, busy)}
        printStatus={status}
        statusLabel={printButtonLabel(status, message)}
        statusHint={message ?? hint}
        onConfirm={(templateId, crops) => {
          void submitPrint({ templateId, crops })
        }}
      />
    )
  }

  if (photoUrl) {
    return (
      <IndividualPrintTab
        photoUrl={photoUrl}
        busy={busy}
        canPrint={!printIsDisabled(status, busy)}
        printStatus={status}
        statusLabel={printButtonLabel(status, message)}
        statusHint={message ?? hint}
        onConfirm={(templateId: IndividualFrameId, frameOptions?: InstagramFrameOptions) => {
          void submitPrint({
            templateId,
            frameOptions: templateId === 'instagram' ? frameOptions : undefined,
          })
        }}
      />
    )
  }

  if (status != null && status !== 'available') {
    const title =
      status === 'printed'
        ? 'Listo'
        : status === 'printing' || status === 'queued'
          ? 'En camino'
          : status === 'failed'
            ? 'No se pudo imprimir'
            : status === 'expired'
              ? 'No disponible'
              : printButtonLabel(status, message)
    return (
      <div
        className={`print-status-card${status === 'printed' ? ' print-status-card--done' : ''}${
          status === 'queued' || status === 'printing' || status === 'waiting_pair'
            ? ' print-status-card--wait'
            : ''
        }`}
      >
        <div className="print-status-card__mark" aria-hidden>
          {status === 'printed' ? '✓' : status === 'failed' || status === 'expired' ? '!' : '…'}
        </div>
        <h2 className="print-status-card__title">{title}</h2>
        <p className="print-status-card__detail">{message ?? hint}</p>
      </div>
    )
  }

  return (
    <div className="print-controls">
      <button
        type="button"
        className="cta cta--secondary"
        disabled={printIsDisabled(status, busy)}
        onClick={() => void submitPrint({ templateId: 'none' })}
      >
        <PrintIcon />
        {busy ? 'Solicitando…' : printButtonLabel(status, message)}
      </button>
      <p className="hint hint--print">{message ?? hint}</p>
    </div>
  )
}

function loadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/garysfesta/'

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 1.441c-3.151 0-3.523.013-4.764.07-2.64.121-3.876 1.36-3.997 3.997-.057 1.24-.07 1.611-.07 4.764s.013 3.524.07 4.764c.121 2.636 1.36 3.875 3.997 3.997 1.241.057 1.612.07 4.764.07s3.524-.013 4.764-.07c2.635-.122 3.876-1.36 3.997-3.997.057-1.24.07-1.611.07-4.764s-.013-3.525-.07-4.764c-.121-2.636-1.36-3.875-3.997-3.997-1.241-.057-1.613-.07-4.764-.07zm0 3.495a5.236 5.236 0 1 1 0 10.472 5.236 5.236 0 0 1 0-10.472zm0 8.64a3.404 3.404 0 1 0 0-6.808 3.404 3.404 0 0 0 0 6.808zm6.678-8.869a1.224 1.224 0 1 1-2.448 0 1.224 1.224 0 0 1 2.448 0z" />
    </svg>
  )
}

function triggerDownload(filename: string) {
  const a = document.createElement('a')
  a.href = photoUrlFor(filename)
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function buildStripSlides(stripFile: string, poseFiles: string[]): StripSlide[] {
  return [
    {
      filename: stripFile,
      dotLabel: 'Tira',
      caption: 'Tira completa',
      variant: 'strip',
      alt: 'Tira de fotos del evento',
    },
    ...poseFiles.map((filename, index) => ({
      filename,
      dotLabel: String(index + 1),
      caption: `Foto ${index + 1}`,
      variant: 'pose' as const,
      alt: `Foto ${index + 1} del evento`,
    })),
  ]
}

interface StripCarouselProps {
  slides: StripSlide[]
  onDownload: (filename: string) => void
}

function StripCarousel({ slides, onDownload }: StripCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pressed, setPressed] = useState(false)
  const scrollLockRef = useRef<number | null>(null)
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settleActiveIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return

    if (scrollLockRef.current !== null) {
      setActiveIndex(scrollLockRef.current)
      scrollLockRef.current = null
      return
    }

    const index = Math.round(track.scrollLeft / track.clientWidth)
    setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)))
  }, [slides.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const onScroll = () => {
      if (scrollLockRef.current !== null) return
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current)
      scrollDebounceRef.current = setTimeout(settleActiveIndex, 140)
    }

    const onScrollEnd = () => {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current)
      settleActiveIndex()
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    track.addEventListener('scrollend', onScrollEnd)
    return () => {
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('scrollend', onScrollEnd)
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current)
    }
  }, [settleActiveIndex])

  const goToSlide = useCallback(
    (index: number) => {
      const track = trackRef.current
      if (!track) return
      const clamped = Math.max(0, Math.min(index, slides.length - 1))
      scrollLockRef.current = clamped
      setActiveIndex(clamped)
      track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
    },
    [slides.length],
  )

  const current = slides[activeIndex] ?? slides[0]

  return (
    <div className="strip-carousel">
      <div className="strip-carousel__viewport">
        <div
          ref={trackRef}
          className="strip-carousel__track"
          aria-roledescription="carrusel"
          aria-label="Fotos de la tira"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.filename}
              className="strip-carousel__slide"
              aria-hidden={index !== activeIndex}
            >
              <div
                className={`photo photo--carousel photo--carousel-${slide.variant}${
                  index === activeIndex ? ' photo--carousel-active' : ''
                }`}
              >
                <img src={photoUrlFor(slide.filename)} alt={slide.alt} draggable={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="strip-carousel__nav" aria-label="Seleccionar foto">
        <button
          type="button"
          className="strip-carousel__arrow"
          aria-label="Anterior"
          disabled={activeIndex === 0}
          onClick={() => goToSlide(activeIndex - 1)}
        >
          ‹
        </button>
        <div className="strip-carousel__dots" role="tablist">
          {slides.map((slide, index) => (
            <button
              key={slide.filename}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={slide.caption}
              className={`strip-carousel__dot${index === activeIndex ? ' strip-carousel__dot--active' : ''}`}
              onClick={() => goToSlide(index)}
            >
              {slide.dotLabel}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="strip-carousel__arrow"
          aria-label="Siguiente"
          disabled={activeIndex === slides.length - 1}
          onClick={() => goToSlide(activeIndex + 1)}
        >
          ›
        </button>
      </div>

      <button
        type="button"
        className="cta cta--stacked"
        onClick={() => onDownload(current.filename)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{ transform: pressed ? 'scale(0.97)' : undefined }}
      >
        <span className="cta__row">
          <DownloadIcon />
          <span>Descargar</span>
        </span>
        <span className="cta__caption" aria-live="polite">
          {current.caption}
        </span>
      </button>
      <p className="hint">Desliza para ver la tira y cada foto · {activeIndex + 1} de {slides.length}</p>
    </div>
  )
}

export default function App() {
  const { filename, theme } = useMemo(() => parseRoute(), [])
  const [state, setState] = useState<PageState>(() => (filename ? 'loading' : 'error'))
  const [pressed, setPressed] = useState(false)
  const [manifest, setManifest] = useState<StripManifest | null>(null)
  const [tab, setTab] = useState<'download' | 'print'>('download')
  const [printEnabled, setPrintEnabled] = useState(false)

  const stripId = filename ? stripIdFromFilename(filename) : null
  const isStrip = Boolean(stripId)

  const poseFiles = useMemo(() => {
    if (manifest?.files.poses) return manifest.files.poses
    if (!stripId) return null
    if (manifest?.stripKind === 'strip2') {
      return [`tira-${stripId}-1.jpg`, `tira-${stripId}-2.jpg`]
    }
    return [`tira-${stripId}-1.jpg`, `tira-${stripId}-2.jpg`, `tira-${stripId}-3.jpg`]
  }, [manifest, stripId])

  const stripKind = manifest?.stripKind ?? (poseFiles?.length === 2 ? 'strip2' : 'strip3')
  const stripFile = manifest?.files.strip ?? filename

  const stripSlides = useMemo(() => {
    if (!isStrip || !stripFile || !poseFiles) return null
    return buildStripSlides(stripFile, poseFiles)
  }, [isStrip, stripFile, poseFiles])

  const qrForPrint = filename ? printQrFilename(filename, stripId) : null

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const cfg = await fetchEventConfig()
      if (cancelled) return
      setPrintEnabled(cfg.printEnabled)
      if (!cfg.printEnabled) setTab('download')
    }
    void load()
    const timer = window.setInterval(() => void load(), 8_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!filename) {
      setState('error')
      return
    }

    let cancelled = false

    void (async () => {
      if (stripId) {
        const data = await fetchStripManifest(`tira-${stripId}-strip.jpg`)
        if (!cancelled && data) setManifest(data)
      }

      try {
        if (stripId && stripFile && poseFiles) {
          const allFiles = [stripFile, ...poseFiles]
          await Promise.all(allFiles.map((f) => loadImage(photoUrlFor(f))))
        } else {
          await loadImage(photoUrlFor(filename))
        }
        if (!cancelled) setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [filename, stripId, stripFile, poseFiles])

  return (
    <div className="page">
      <div className="ambient" aria-hidden>
        <div className="ambient__orb ambient__orb--top" />
        <div className="ambient__orb ambient__orb--bottom" />
      </div>

      <header className="header">
        <img
          className="brand-logo"
          src={brandLogo}
          alt="Gary's Festa"
          width={220}
          height={220}
          decoding="async"
        />
        <p className="tagline">{isStrip ? 'Tu tira del evento' : 'Tu foto del evento'}</p>
        <a
          className="ig-btn ig-btn--header"
          href={INSTAGRAM_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <InstagramIcon />
          Síguenos en Instagram
        </a>
        {state === 'ready' && (
          <div className="page-tabs" role="tablist" aria-label="Acciones">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'download'}
              className={`page-tabs__btn${tab === 'download' ? ' page-tabs__btn--active' : ''}`}
              onClick={() => setTab('download')}
            >
              Descargar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'print'}
              aria-disabled={!printEnabled}
              disabled={!printEnabled}
              title={
                printEnabled
                  ? undefined
                  : 'La impresión no está habilitada en este evento'
              }
              className={`page-tabs__btn${tab === 'print' ? ' page-tabs__btn--active' : ''}${
                !printEnabled ? ' page-tabs__btn--disabled' : ''
              }`}
              onClick={() => {
                if (printEnabled) setTab('print')
              }}
            >
              Imprimir
            </button>
          </div>
        )}
      </header>

      <main className="main">
        {state === 'loading' && (
          <div className="stack">
            <div className={`photo photo--skeleton${isStrip ? ' photo--strip' : ''}`} />
            <p className="loading-label">Cargando…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="stack stack--error">
            <h2 className="error-title">No encontramos esta foto</h2>
            <p className="error-text">
              El enlace puede haber expirado o aún no está lista. Vuelve al espejo e intenta de
              nuevo.
            </p>
          </div>
        )}

        {state === 'ready' && filename && tab === 'download' && (
          <div className="stack">
            {stripSlides ? (
              <StripCarousel slides={stripSlides} onDownload={triggerDownload} />
            ) : (
              <>
                <div className="photo">
                  <img src={photoUrlFor(filename)} alt="Tu foto del evento" />
                </div>
                <button
                  type="button"
                  className="cta"
                  onClick={() => triggerDownload(filename)}
                  onPointerDown={() => setPressed(true)}
                  onPointerUp={() => setPressed(false)}
                  onPointerLeave={() => setPressed(false)}
                  style={{ transform: pressed ? 'scale(0.97)' : undefined }}
                >
                  <DownloadIcon />
                  Descargar foto
                </button>
                <p className="hint">También puedes guardar desde el menú del navegador</p>
              </>
            )}
          </div>
        )}

        {state === 'ready' && filename && tab === 'print' && qrForPrint && printEnabled && (
          <div className="stack">
            <PrintControls
              qrFilename={qrForPrint}
              photoUrl={isStrip ? null : photoUrlFor(filename)}
              stripKind={isStrip ? stripKind : null}
              poseFiles={isStrip ? poseFiles : null}
              signText={manifest?.signText ?? null}
            />
          </div>
        )}
      </main>

      <footer className="footer">
        <a
          className="ig-btn"
          href={INSTAGRAM_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <InstagramIcon />
          Síguenos en Instagram
        </a>
        <p className="footer__thanks">Gracias por visitarnos</p>
      </footer>
    </div>
  )
}
