import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { AppConfig } from '../types'

interface ShareScreenProps {
  photo: string
  downloadUrl: string | null
  config: AppConfig
  onDone: () => void
}

export function ShareScreen({ photo, downloadUrl, config, onDone }: ShareScreenProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!downloadUrl) {
      setQrDataUrl(null)
      return
    }
    void QRCode.toDataURL(downloadUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0b0d12', light: '#ffffff' },
    }).then(setQrDataUrl)
  }, [downloadUrl])

  return (
    <div className="screen screen--share">
      <div className="ambient" aria-hidden />
      <div className="share__layout">
        <img src={photo} alt="Tu foto" className="share__photo" />
        <div className="share__qr-panel">
          <h2 className="share__title">{config.texts.shareHint ?? 'Escanea para guardar tu foto'}</h2>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR descarga" className="share__qr" />
          ) : (
            <p className="share__offline">
              Foto guardada. El QR requiere la app en Electron con red local.
            </p>
          )}
          {downloadUrl && <p className="share__url">{downloadUrl}</p>}
          <button type="button" className="btn-primary share__done" onClick={onDone}>
            {config.texts.shareDone ?? 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
