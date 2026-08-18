import type { AppConfig } from '../types'

interface ReviewScreenProps {
  photo: string
  config: AppConfig
  captureSource?: 'tether' | 'preview' | null
  fallbackReason?: string | null
  onRetake: () => void
  onConfirm: () => void
}

export function ReviewScreen({
  photo,
  config,
  captureSource,
  fallbackReason,
  onRetake,
  onConfirm,
}: ReviewScreenProps) {
  return (
    <div className="screen screen--review">
      <div className="ambient" aria-hidden />
      {captureSource && (
        <p
          className={`review__source${
            captureSource === 'preview' ? ' review__source--fallback' : ''
          }`}
        >
          {captureSource === 'tether'
            ? 'Captura: Tether (JPEG nativo)'
            : 'Captura: Preview (fallback)'}
          {captureSource === 'preview' && fallbackReason
            ? ` — ${fallbackReason}`
            : null}
        </p>
      )}
      <img src={photo} alt="Tu foto" className="review__photo" />
      <div className="review__actions">
        <button type="button" className="btn-primary" onClick={onConfirm}>
          {config.texts.reviewConfirm}
        </button>
        <button type="button" className="btn-text" onClick={onRetake}>
          {config.texts.reviewRetake}
        </button>
      </div>
    </div>
  )
}
