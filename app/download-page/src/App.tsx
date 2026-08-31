import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type PageState = 'loading' | 'ready' | 'error'

interface StripManifest {
  type: 'strip'
  id: string
  files: {
    strip: string
    poses: [string, string, string]
  }
}

interface StripSlide {
  filename: string
  dotLabel: string
  caption: string
  variant: 'strip' | 'pose'
  alt: string
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

function triggerDownload(filename: string) {
  const a = document.createElement('a')
  a.href = photoUrlFor(filename)
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function buildStripSlides(
  stripFile: string,
  poseFiles: [string, string, string],
): StripSlide[] {
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

  const stripId = filename ? stripIdFromFilename(filename) : null
  const isStrip = Boolean(stripId)

  const poseFiles = manifest?.files.poses ?? (
    stripId
      ? ([
          `tira-${stripId}-1.jpg`,
          `tira-${stripId}-2.jpg`,
          `tira-${stripId}-3.jpg`,
        ] as [string, string, string])
      : null
  )

  const stripFile = manifest?.files.strip ?? filename

  const stripSlides = useMemo(() => {
    if (!isStrip || !stripFile || !poseFiles) return null
    return buildStripSlides(stripFile, poseFiles)
  }, [isStrip, stripFile, poseFiles])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!filename) {
      setState('error')
      return
    }

    let cancelled = false

    void (async () => {
      if (stripId) {
        try {
          const res = await fetch(photoUrlFor(`tira-${stripId}.json`))
          if (res.ok) {
            const data = (await res.json()) as StripManifest
            if (!cancelled && data.type === 'strip') {
              setManifest(data)
            }
          }
        } catch {
          // fallback por convención de nombres
        }
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
        <h1 className="brand">Espejo Fotos</h1>
        <p className="tagline">{isStrip ? 'Tu tira del evento' : 'Tu foto del evento'}</p>
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

        {state === 'ready' && filename && (
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
      </main>

      <footer className="footer">Gracias por visitarnos</footer>
    </div>
  )
}
