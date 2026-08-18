import type { CSSProperties } from 'react'
import type { CaptureMode, PreviewRotation, TetherStatus, VideoInputDevice } from '../types'
import { PREVIEW_ROTATIONS } from '../lib/orientation'
import { APP_THEMES, type AppThemeId } from '../lib/themes'
import { CameraSelector } from './CameraSelector'
import { FolderSelector } from './FolderSelector'

type WizardStep = 1 | 2 | 3 | 4

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

  return (
    <div className="wizard">
      <div className="wizard__panel">
        <p className="wizard__eyebrow">Configuración</p>
        <h1 className="wizard__title">Preparar espejo</h1>
        <p className="wizard__event">Carpeta, cámara, captura y color neón</p>

        <ol className="wizard__steps">
          <li className={`wizard__step${step === 1 ? ' wizard__step--active' : ''}`}>
            <span className="wizard__step-num">1</span>
            <span className="wizard__step-label">Carpeta</span>
          </li>
          <li className={`wizard__step${step === 2 ? ' wizard__step--active' : ''}`}>
            <span className="wizard__step-num">2</span>
            <span className="wizard__step-label">Cámara</span>
          </li>
          <li className={`wizard__step${step === 3 ? ' wizard__step--active' : ''}`}>
            <span className="wizard__step-num">3</span>
            <span className="wizard__step-label">Captura</span>
          </li>
          <li className={`wizard__step${step === 4 ? ' wizard__step--active' : ''}`}>
            <span className="wizard__step-num">4</span>
            <span className="wizard__step-label">Color</span>
          </li>
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
