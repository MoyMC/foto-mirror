import type { AppConfig } from '../types'

interface ReviewScreenProps {
  photo: string
  config: AppConfig
  variant?: 'individual' | 'strip'
  captureSource?: 'tether' | 'preview' | null
  fallbackReason?: string | null
  onRetake: () => void
  onConfirm: () => void
}

export function ReviewScreen({
  photo,
  config,
  variant = 'individual',
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
      <img
        src={photo}
        alt={variant === 'strip' ? 'Tu tira de fotos' : 'Tu foto'}
        className={`review__photo${variant === 'strip' ? ' review__photo--strip' : ''}`}
      />
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
