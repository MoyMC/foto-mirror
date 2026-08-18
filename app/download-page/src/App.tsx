import { useEffect, useMemo, useState } from 'react'

type PageState = 'loading' | 'ready' | 'error'

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

export default function App() {
  const { filename, theme } = useMemo(() => parseRoute(), [])
  const [state, setState] = useState<PageState>(() => (filename ? 'loading' : 'error'))
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!filename) {
      setState('error')
      return
    }

    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setState('ready')
    }
    img.onerror = () => {
      if (!cancelled) setState('error')
    }
    img.src = photoUrlFor(filename)
    return () => {
      cancelled = true
    }
  }, [filename])

  const handleDownload = () => {
    if (!filename) return
    const a = document.createElement('a')
    a.href = photoUrlFor(filename)
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="page">
      <div className="ambient" aria-hidden>
        <div className="ambient__orb ambient__orb--top" />
        <div className="ambient__orb ambient__orb--bottom" />
      </div>

      <header className="header">
        <h1 className="brand">Espejo Fotos</h1>
        <p className="tagline">Tu foto del evento</p>
      </header>

      <main className="main">
        {state === 'loading' && (
          <div className="stack">
            <div className="photo photo--skeleton" />
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
            <div className="photo">
              <img src={photoUrlFor(filename)} alt="Tu foto del evento" />
            </div>
            <button
              type="button"
              className="cta"
              onClick={handleDownload}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              style={{ transform: pressed ? 'scale(0.97)' : undefined }}
            >
              <DownloadIcon />
              Descargar foto
            </button>
            <p className="hint">También puedes guardar desde el menú del navegador</p>
          </div>
        )}
      </main>

      <footer className="footer">Gracias por visitarnos</footer>
    </div>
  )
}
