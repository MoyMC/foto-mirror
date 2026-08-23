import type { CSSProperties } from 'react'
import type { CaptureMode, PreviewRotation, TetherStatus, VideoInputDevice } from '../types'
import {
  EVENT_SIGN_FONTS,
  EVENT_SIGN_MAX_CHARS,
  EVENT_SIGN_SIZES,
  type EventSignFontId,
  type EventSignSizeId,
} from '../lib/eventSign'
import { PREVIEW_ROTATIONS } from '../lib/orientation'
import { APP_THEMES, type AppThemeId } from '../lib/themes'
import { CameraSelector } from './CameraSelector'
import { FolderSelector } from './FolderSelector'

type WizardStep = 1 | 2 | 3 | 4 | 5

interface SetupWizardProps {
  step: WizardStep
  photosDir: string | null
  electronAvailable: boolean
  cameras: VideoInputDevice[]
  selectedDeviceId: string
  activeLabel: string | null
  isReady: boolean
  error: string | null
  errorHint: string | null
  captureMode: CaptureMode
  themeId: AppThemeId
  previewRotation: PreviewRotation
  eventSignText: string
  eventSignFontId: EventSignFontId
  eventSignSizeId: EventSignSizeId
  tetherStatus: TetherStatus | null
  tetherChecking: boolean
  testMessage: string | null
  testBusy: boolean
  onPickFolder: () => void
  onCameraSelect: (deviceId: string) => void
  onCameraRefresh: () => void
  onCaptureModeChange: (mode: CaptureMode) => void
  onThemeChange: (themeId: AppThemeId) => void
  onPreviewRotationChange: (rotation: PreviewRotation) => void
  onEventSignChange: (text: string) => void
  onEventSignFontChange: (fontId: EventSignFontId) => void
  onEventSignSizeChange: (sizeId: EventSignSizeId) => void
  onSignPreset: (x: number, y: number) => void
  onGoToStep: (step: WizardStep) => void
  onCheckTether: () => void
  onTestCapture: () => void
  onBack: () => void
  onNext: () => void
  onConfirm: () => void
  onReconnect: () => void
}

export function SetupWizard({
  step,
  photosDir,
  electronAvailable,
  cameras,
  selectedDeviceId,
  activeLabel,
  isReady,
  error,
  errorHint,
  captureMode,
  themeId,
  previewRotation,
  eventSignText,
  eventSignFontId,
  eventSignSizeId,
  tetherStatus,
  tetherChecking,
  testMessage,
  testBusy,
  onPickFolder,
  onCameraSelect,
  onCameraRefresh,
  onCaptureModeChange,
  onThemeChange,
  onPreviewRotationChange,
  onEventSignChange,
  onEventSignFontChange,
  onEventSignSizeChange,
  onSignPreset,
  onGoToStep,
  onCheckTether,
  onTestCapture,
  onBack,
  onNext,
  onConfirm,
  onReconnect,
}: SetupWizardProps) {
  const canGoNext = electronAvailable ? Boolean(photosDir) : true
  const canGoCapture = Boolean(selectedDeviceId && isReady && !error && canGoNext)
  const canStart = canGoCapture

  const tetherAvailable = Boolean(tetherStatus?.available)
  const tetherCanShoot = Boolean(tetherStatus?.canShoot)
  const tetherSelectable = tetherAvailable || tetherCanShoot
  const tetherHint =
    tetherStatus?.reason ??
    (tetherChecking ? 'Conectando PTP…' : 'Pulsa Reintentar para abrir sesión PTP.')
  const canVisit = (n: WizardStep) => {
    if (n === 1) return true
    if (n === 2) return canGoNext
    return canStart
  }

  const stepClass = (n: WizardStep) => {
    const parts = ['wizard__step']
    if (step === n) parts.push('wizard__step--active')
    if (canVisit(n) && step !== n) parts.push('wizard__step--ready')
    return parts.join(' ')
  }

  return (
    <div className={`wizard${step === 5 ? ' wizard--place-sign' : ''}`}>
      <div className="wizard__panel">
        <p className="wizard__eyebrow">Configuración</p>
        <h1 className="wizard__title">Preparar espejo</h1>
        <p className="wizard__event">Carpeta, cámara, captura, color y letrero</p>

        <ol className="wizard__steps">
          {(
            [
              [1, 'Carpeta'],
              [2, 'Cámara'],
              [3, 'Captura'],
              [4, 'Color'],
              [5, 'Letrero'],
            ] as const
          ).map(([n, label]) => (
            <li key={n}>
              <button
                type="button"
                className={stepClass(n)}
                disabled={!canVisit(n)}
                onClick={() => canVisit(n) && onGoToStep(n)}
              >
                <span className="wizard__step-num">{n}</span>
                <span className="wizard__step-label">{label}</span>
              </button>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <>
            <FolderSelector
              photosDir={photosDir}
              electronAvailable={electronAvailable}
              onSelect={onPickFolder}
            />
            <div className="wizard__actions">
              <button
                type="button"
                className="btn-primary wizard__confirm"
                onClick={onNext}
                disabled={!canGoNext}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {error && (
              <div className="wizard__error" role="alert">
                <p>{error}</p>
                {errorHint && <p className="wizard__error-hint">{errorHint}</p>}
                <button type="button" className="btn-secondary wizard__reconnect" onClick={onReconnect}>
                  Reconectar
                </button>
              </div>
            )}
            <CameraSelector
              cameras={cameras}
              selectedDeviceId={selectedDeviceId}
              activeLabel={activeLabel}
              isReady={isReady}
              onSelect={onCameraSelect}
              onRefresh={onCameraRefresh}
            />

            <p className="wizard__hint wizard__hint--left">
              Si la imagen se ve de lado, elige la rotación hasta que quede vertical.
            </p>
            <div className="wizard__rotations" role="radiogroup" aria-label="Rotación de preview">
              {PREVIEW_ROTATIONS.map((deg) => (
                <button
                  key={deg}
                  type="button"
                  role="radio"
                  aria-checked={previewRotation === deg}
                  className={`wizard__rotation${
                    previewRotation === deg ? ' wizard__rotation--active' : ''
                  }`}
                  onClick={() => onPreviewRotationChange(deg)}
                >
                  {deg}°
                </button>
              ))}
            </div>

            <div className="wizard__actions">
              <button type="button" className="btn-secondary wizard__back" onClick={onBack}>
                Atrás
              </button>
              <button
                type="button"
                className="btn-primary wizard__confirm"
                onClick={onNext}
                disabled={!canGoCapture}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="wizard__capture-modes" role="radiogroup" aria-label="Modo de captura">
              <button
                type="button"
                role="radio"
                aria-checked={captureMode === 'tethered'}
                className={`wizard__mode${captureMode === 'tethered' ? ' wizard__mode--active' : ''}${
                  !tetherSelectable ? ' wizard__mode--disabled' : ''
                }`}
                disabled={!tetherSelectable}
                onClick={() => onCaptureModeChange('tethered')}
              >
                <span className="wizard__mode-title">Tether USB</span>
                <span className="wizard__mode-desc">JPEG nativo Sony por USB (PTP 2)</span>
                <span
                  className={`wizard__mode-badge${
                    tetherCanShoot
                      ? ' wizard__mode-badge--ok'
                      : ' wizard__mode-badge--off'
                  }`}
                >
                  {tetherChecking
                    ? 'Conectando PTP…'
                    : tetherCanShoot
                      ? 'Disponible'
                      : tetherAvailable
                        ? 'USB OK · sin sesión PTP'
                        : 'No disponible'}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={captureMode === 'preview'}
                className={`wizard__mode${captureMode === 'preview' ? ' wizard__mode--active' : ''}`}
                onClick={() => onCaptureModeChange('preview')}
              >
                <span className="wizard__mode-title">Preview HDMI</span>
                <span className="wizard__mode-desc">Frame del video en vivo (capturadora)</span>
                <span className="wizard__mode-badge wizard__mode-badge--ok">Siempre listo</span>
              </button>
            </div>

            <p className="wizard__hint wizard__hint--left">{tetherHint}</p>
            {tetherStatus?.cameraModel && (
              <p className="wizard__meta">Detectada: {tetherStatus.cameraModel}</p>
            )}

            <div className="wizard__actions wizard__actions--stack">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCheckTether}
                disabled={tetherChecking || !electronAvailable}
              >
                {tetherChecking ? 'Comprobando…' : 'Reintentar tether'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onTestCapture}
                disabled={testBusy || !isReady}
              >
                {testBusy ? 'Probando…' : 'Probar captura'}
              </button>
            </div>

            {testMessage && <p className="wizard__test-msg">{testMessage}</p>}

            <div className="wizard__actions">
              <button type="button" className="btn-secondary wizard__back" onClick={onBack}>
                Atrás
              </button>
              <button
                type="button"
                className="btn-primary wizard__confirm"
                onClick={onNext}
                disabled={!canStart}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="wizard__hint wizard__hint--left">
              Elige un color neón para botones y bordes (se ve bien sobre pared blanca).
            </p>
            <div className="wizard__themes" role="radiogroup" aria-label="Color neón">
              {APP_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={themeId === theme.id}
                  className={`wizard__theme${themeId === theme.id ? ' wizard__theme--active' : ''}`}
                  style={{ '--theme-swatch': theme.swatch } as CSSProperties}
                  onClick={() => onThemeChange(theme.id)}
                >
                  <span className="wizard__theme-swatch" aria-hidden />
                  <span className="wizard__theme-name">{theme.name}</span>
                </button>
              ))}
            </div>

            <div className="wizard__actions">
              <button type="button" className="btn-secondary wizard__back" onClick={onBack}>
                Atrás
              </button>
              <button
                type="button"
                className="btn-primary wizard__confirm"
                onClick={onNext}
                disabled={!canStart}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="wizard__hint wizard__hint--left">
              Arrastra el letrero o usa un atajo. Vacío = sin letrero. Color = el neón del tema.
            </p>
            <textarea
              className="wizard__sign-input"
              rows={3}
              maxLength={EVENT_SIGN_MAX_CHARS}
              placeholder={'María y José'}
              value={eventSignText}
              onChange={(e) => onEventSignChange(e.target.value)}
            />
            <p className="wizard__meta">
              {eventSignText.length}/{EVENT_SIGN_MAX_CHARS}
            </p>
            <div className="wizard__sign-fonts" role="radiogroup" aria-label="Fuente del letrero">
              {EVENT_SIGN_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  role="radio"
                  aria-checked={eventSignFontId === font.id}
                  className={`wizard__sign-font${
                    eventSignFontId === font.id ? ' wizard__sign-font--active' : ''
                  }`}
                  style={{
                    fontFamily: font.family,
                    fontWeight: font.weight,
                    letterSpacing: font.letterSpacing,
                  }}
                  onClick={() => onEventSignFontChange(font.id)}
                >
                  <span className="wizard__sign-font-sample">{font.sample}</span>
                  <span className="wizard__sign-font-name">{font.name}</span>
                </button>
              ))}
            </div>
            <div className="wizard__sign-sizes" role="radiogroup" aria-label="Tamaño del letrero">
              {EVENT_SIGN_SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  role="radio"
                  aria-checked={eventSignSizeId === size.id}
                  className={`wizard__sign-size${
                    eventSignSizeId === size.id ? ' wizard__sign-size--active' : ''
                  }`}
                  onClick={() => onEventSignSizeChange(size.id)}
                >
                  {size.name}
                </button>
              ))}
            </div>
            <div className="wizard__sign-presets">
              <button type="button" className="btn-secondary" onClick={() => onSignPreset(50, 16)}>
                Arriba
              </button>
              <button type="button" className="btn-secondary" onClick={() => onSignPreset(50, 48)}>
                Centro
              </button>
              <button type="button" className="btn-secondary" onClick={() => onSignPreset(50, 82)}>
                Abajo
              </button>
            </div>
            <div className="wizard__actions">
              <button type="button" className="btn-secondary wizard__back" onClick={onBack}>
                Atrás
              </button>
              <button
                type="button"
                className="btn-primary wizard__confirm"
                onClick={onConfirm}
                disabled={!canStart}
              >
                Comenzar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
