import { useEffect, useState } from 'react'

interface OperatorPinModalProps {
  expectedPin: string
  onSuccess: () => void
  onCancel: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const

export function OperatorPinModal({ expectedPin, onSuccess, onCancel }: OperatorPinModalProps) {
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (digits.length < expectedPin.length) return
    if (digits === expectedPin) {
      onSuccess()
      return
    }
    setError(true)
    const t = setTimeout(() => {
      setDigits('')
      setError(false)
    }, 450)
    return () => clearTimeout(t)
  }, [digits, expectedPin, onSuccess])

  const press = (key: string) => {
    if (!key) return
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1))
      setError(false)
      return
    }
    setDigits((d) => (d.length >= expectedPin.length ? d : d + key))
  }

  return (
    <div className="pin-modal" role="dialog" aria-modal="true" aria-label="PIN de operador">
      <div className="pin-modal__backdrop" onClick={onCancel} />
      <div className={`pin-modal__panel${error ? ' pin-modal__panel--error' : ''}`}>
        <p className="pin-modal__title">PIN operador</p>
        <p className="pin-modal__hint">Mantén pulsada la esquina superior izquierda</p>
        <div className="pin-modal__dots" aria-hidden>
          {Array.from({ length: expectedPin.length }, (_, i) => (
            <span
              key={i}
              className={`pin-modal__dot${i < digits.length ? ' pin-modal__dot--on' : ''}`}
            />
          ))}
        </div>
        <div className="pin-modal__pad">
          {KEYS.map((key, i) =>
            key === '' ? (
              <span key={`empty-${i}`} className="pin-modal__key pin-modal__key--empty" />
            ) : (
              <button
                key={key === '⌫' ? 'back' : key}
                type="button"
                className="pin-modal__key"
                onClick={() => press(key)}
              >
                {key}
              </button>
            ),
          )}
        </div>
        <button type="button" className="btn-secondary pin-modal__cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
