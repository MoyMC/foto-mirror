import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppPhase, CaptureMode, TetherStatus } from './types'
import { appConfig } from './lib/appConfig'
import { getFilterCss, resolveFilters } from './lib/filters'
import { useFilterThumbnails } from './hooks/useFilterThumbnails'
import {
  captureModeLabel,
  loadStoredCaptureMode,
  loadStoredEventSignFontId,
  loadStoredEventSignSizeId,
  loadStoredEventSignText,
  loadStoredEventSignX,
  loadStoredEventSignY,
  loadStoredPhotosDir,
  loadStoredPreviewRotation,
  loadStoredThemeId,
  saveSessionConfig,
  shortPath,
} from './lib/sessionConfig'
import { constrainEventSignInput, hasEventSign, normalizeEventSign } from './lib/eventSign'
import { type PreviewRotation } from './lib/orientation'
import { applyAppTheme, themeNeonColor, type AppThemeId } from './lib/themes'
import { pickDefaultDeviceId, useCamera } from './hooks/useCamera'
import { usePhotoCompositor } from './hooks/usePhotoCompositor'
import { CameraPreview } from './components/CameraPreview'
import { NeonSign } from './components/NeonSign'
import { SetupWizard } from './components/SetupWizard'
import { COUNTDOWN_OPTIONS, IdleScreen } from './components/IdleScreen'
import { CountdownScreen } from './components/CountdownScreen'
import { ReviewScreen } from './components/ReviewScreen'
import { ShareScreen } from './components/ShareScreen'
import { OperatorPinModal } from './components/OperatorPinModal'
import './App.css'

const OPERATOR_UNLOCK_MS = 90_000

function App() {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [setupComplete, setSetupComplete] = useState(false)
  const [photosDir, setPhotosDir] = useState<string | null>(null)
  const [captureMode, setCaptureMode] = useState<CaptureMode>('preview')
  const [themeId, setThemeId] = useState<AppThemeId>(() => loadStoredThemeId())
  const [previewRotation, setPreviewRotation] = useState<PreviewRotation>(
    () => loadStoredPreviewRotation(),
  )
  const [eventSignText, setEventSignText] = useState(() => loadStoredEventSignText())
  const [eventSignX, setEventSignX] = useState(() => loadStoredEventSignX())
  const [eventSignY, setEventSignY] = useState(() => loadStoredEventSignY())
  const [eventSignFontId, setEventSignFontId] = useState(() => loadStoredEventSignFontId())
  const [eventSignSizeId, setEventSignSizeId] = useState(() => loadStoredEventSignSizeId())
  const [tetherStatus, setTetherStatus] = useState<TetherStatus | null>(null)
  const [tetherChecking, setTetherChecking] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testBusy, setTestBusy] = useState(false)
  const [phase, setPhase] = useState<AppPhase>('idle')
  const initialCountdown = (COUNTDOWN_OPTIONS as readonly number[]).includes(
    appConfig.countdownSeconds,
  )
    ? appConfig.countdownSeconds
    : 3
  const [countdownSeconds, setCountdownSeconds] = useState(initialCountdown)
  const [countdown, setCountdown] = useState(initialCountdown)
  const [rawPhoto, setRawPhoto] = useState<string | null>(null)
  const [tetherSourcePath, setTetherSourcePath] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [activeFilterId, setActiveFilterId] = useState(appConfig.defaultFilterId)
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [cameraInitialized, setCameraInitialized] = useState(false)
  const [operatorUnlocked, setOperatorUnlocked] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pendingOperatorAction, setPendingOperatorAction] = useState<
    'menu' | 'setup' | 'quit' | null
  >(null)
  const capturingRef = useRef(false)
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const electronAvailable = Boolean(window.electronAPI)

  const {
    videoRef,
    cameras,
    activeCameraLabel,
    error,
    errorHint,
    isReady,
    captureFrame,
    refreshCameras,
    reconnect,
  } = useCamera({
    width: appConfig.captureWidth,
    height: appConfig.captureHeight,
    deviceId: selectedCameraId,
    rotation: previewRotation,
  })

  const filters = resolveFilters(appConfig.filters)
  const activeFilter = filters.find((f) => f.id === activeFilterId) ?? filters[0]
  const filterThumbnails = useFilterThumbnails(videoRef, filters, isReady, previewRotation)

  const composedPhoto = usePhotoCompositor(
    rawPhoto,
    {
      logoUrl: null,
      signText: eventSignText,
      neonColor: themeNeonColor(themeId),
      signX: eventSignX,
      signY: eventSignY,
      signFontId: eventSignFontId,
      signSizeId: eventSignSizeId,
    },
    activeFilter,
  )

  const unlockOperator = useCallback(() => {
    setOperatorUnlocked(true)
    setPinOpen(false)
    if (unlockTimer.current) clearTimeout(unlockTimer.current)
    unlockTimer.current = setTimeout(() => setOperatorUnlocked(false), OPERATOR_UNLOCK_MS)
  }, [])

  const requestOperatorAccess = useCallback((action: 'menu' | 'setup' | 'quit' = 'menu') => {
    if (operatorUnlocked) return true
    setPendingOperatorAction(action)
    setPinOpen(true)
    return false
  }, [operatorUnlocked])

  const onPinSuccess = useCallback(() => {
    const action = pendingOperatorAction
    setPendingOperatorAction(null)
    unlockOperator()
    if (action === 'setup') {
      setSetupComplete(false)
      setWizardStep(1)
      setPhase('idle')
      setRawPhoto(null)
      setTetherSourcePath(null)
      setUsedFallback(false)
      setFallbackReason(null)
      setSavedPhoto(null)
      setDownloadUrl(null)
      setTestMessage(null)
      setOperatorUnlocked(false)
      if (unlockTimer.current) {
        clearTimeout(unlockTimer.current)
        unlockTimer.current = null
      }
    } else if (action === 'quit') {
      void window.electronAPI?.quitApp?.()
    }
  }, [pendingOperatorAction, unlockOperator])

  useEffect(() => {
    return () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current)
    }
  }, [])

  const refreshTetherStatus = useCallback(async () => {
    if (!window.electronAPI?.tetherStatus) {
      setTetherStatus({
        available: false,
        canShoot: false,
        reason: 'Tether solo disponible en la app Electron',
      })
      return
    }

    setTetherChecking(true)
    try {
      const status = await window.electronAPI.tetherStatus()
      setTetherStatus(status)
      if (!status.available && captureMode === 'tethered') {
        setCaptureMode('preview')
      }
    } finally {
      setTetherChecking(false)
    }
  }, [captureMode])

  useEffect(() => {
    const stored = loadStoredPhotosDir()
    if (stored) setPhotosDir(stored)
    setCaptureMode(loadStoredCaptureMode())
    setThemeId(loadStoredThemeId())
    setPreviewRotation(loadStoredPreviewRotation())
    setEventSignText(loadStoredEventSignText())
    setEventSignX(loadStoredEventSignX())
    setEventSignY(loadStoredEventSignY())
  }, [])

  useEffect(() => {
    applyAppTheme(themeId)
  }, [themeId])

  useEffect(() => {
    if (cameraInitialized || cameras.length === 0) return
    const defaultId = pickDefaultDeviceId(cameras, appConfig.preferredCameraLabel)
    if (defaultId) setSelectedCameraId(defaultId)
    setCameraInitialized(true)
  }, [cameras, cameraInitialized])

  useEffect(() => {
    if (wizardStep !== 3 || setupComplete) return
    void refreshTetherStatus()
  }, [wizardStep, setupComplete, refreshTetherStatus])

  const handleThemeChange = (id: AppThemeId) => {
    setThemeId(id)
    applyAppTheme(id)
  }

  const takePhoto = useCallback(async (): Promise<{
    photo: string | null
    usedFallback: boolean
    tetherFilePath?: string
    error?: string
  }> => {
    const plainFilter = filters.find((f) => f.id === 'normal') ?? {
      id: 'normal',
      name: 'Normal',
      cssFilter: 'none',
    }

    if (captureMode === 'tethered' && window.electronAPI?.tetherCapture && photosDir) {
      try {
        const result = await window.electronAPI.tetherCapture(photosDir, 10_000)
        if (result.ok && result.dataUrl && result.filePath) {
          return {
            photo: result.dataUrl,
            usedFallback: false,
            tetherFilePath: result.filePath,
          }
        }
        const fallback = captureFrame(plainFilter)
        return {
          photo: fallback,
          usedFallback: true,
          error: result.error ?? 'Tether no devolvió JPEG',
        }
      } catch (err) {
        const fallback = captureFrame(plainFilter)
        return {
          photo: fallback,
          usedFallback: true,
          error: err instanceof Error ? err.message : 'Error tether',
        }
      }
    }

    return { photo: captureFrame(plainFilter), usedFallback: false }
  }, [captureFrame, captureMode, filters, photosDir])

  useEffect(() => {
    if (!setupComplete || phase !== 'countdown') return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((n) => n - 1), 1000)
      return () => clearTimeout(timer)
    }

    if (capturingRef.current) return
    capturingRef.current = true

    void (async () => {
      const result = await takePhoto()
      setRawPhoto(result.photo)
      setUsedFallback(result.usedFallback)
      setFallbackReason(result.error ?? null)
      setTetherSourcePath(result.tetherFilePath ?? null)
      setPhase('review')
      setCountdown(countdownSeconds)
      capturingRef.current = false
    })()
  }, [setupComplete, phase, countdown, countdownSeconds, takePhoto])

  const handlePickFolder = async () => {
    if (!window.electronAPI?.selectPhotosDir) return
    const dir = await window.electronAPI.selectPhotosDir()
    if (dir) setPhotosDir(dir)
  }

  const handleCaptureModeChange = (mode: CaptureMode) => {
    if (mode === 'tethered' && !(tetherStatus?.available || tetherStatus?.canShoot)) return
    setCaptureMode(mode)
    setTestMessage(null)
  }

  const handleTestCapture = async () => {
    if (!activeFilter || !isReady) return
    setTestBusy(true)
    setTestMessage(null)
    try {
      const result = await takePhoto()
      if (!result.photo) {
        setTestMessage('No se pudo capturar. Revisa cámara / tether.')
        return
      }
      if (captureMode === 'tethered') {
        setTestMessage(
          result.usedFallback
            ? `Fallback preview. Tether: ${result.error ?? 'falló'}`
            : `Tether OK (nativo): ${result.tetherFilePath ?? 'JPEG'}`,
        )
      } else {
        setTestMessage('Preview OK: frame capturado.')
      }
    } finally {
      setTestBusy(false)
    }
  }

  const handleWizardConfirm = async () => {
    if (!selectedCameraId || !isReady) return
    if (electronAvailable && !photosDir) return

    const mode: CaptureMode =
      captureMode === 'tethered' && tetherStatus?.available ? 'tethered' : 'preview'

    if (photosDir) {
      saveSessionConfig({
        cameraDeviceId: selectedCameraId,
        photosDir,
        captureMode: mode,
        themeId,
        previewRotation,
        eventSignText: normalizeEventSign(eventSignText),
        eventSignX,
        eventSignY,
        eventSignFontId,
        eventSignSizeId,
      })
    }

    setCaptureMode(mode)
    setEventSignText(normalizeEventSign(eventSignText))

    if (window.electronAPI && photosDir) {
      await window.electronAPI.startPhotoServer(photosDir)
    }

    setSetupComplete(true)
    setPhase('idle')
  }

  const openSetup = () => {
    setSetupComplete(false)
    setWizardStep(1)
    setPhase('idle')
    setRawPhoto(null)
    setTetherSourcePath(null)
    setUsedFallback(false)
    setFallbackReason(null)
    setSavedPhoto(null)
    setDownloadUrl(null)
    setTestMessage(null)
    setOperatorUnlocked(false)
    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current)
      unlockTimer.current = null
    }
  }

  const handleOpenSetup = () => {
    if (requestOperatorAccess('setup')) openSetup()
  }

  const handleQuit = () => {
    if (!setupComplete) {
      void window.electronAPI?.quitApp?.()
      return
    }
    if (requestOperatorAccess('quit')) void window.electronAPI?.quitApp?.()
  }

  const startCountdown = () => {
    if (!isReady) return
    setCountdown(countdownSeconds)
    setPhase('countdown')
  }

  const retake = () => {
    if (tetherSourcePath && window.electronAPI?.deletePhotoFile) {
      void window.electronAPI.deletePhotoFile(tetherSourcePath)
    }
    setRawPhoto(null)
    setTetherSourcePath(null)
    setUsedFallback(false)
    setFallbackReason(null)
    setPhase('idle')
  }

  const confirmPhoto = async () => {
    if (!composedPhoto || !rawPhoto) return

    const filename = `foto-${Date.now()}.jpg`
    const keepNative = Boolean(tetherSourcePath) && !usedFallback
    const needsEdit = hasEventSign(eventSignText) || activeFilterId !== 'normal'

    if (window.electronAPI?.saveEventPhotos && photosDir) {
      const result = await window.electronAPI.saveEventPhotos({
        photosDir,
        filename,
        originalFilePath: keepNative ? tetherSourcePath! : undefined,
        originalDataUrl: keepNative ? undefined : rawPhoto,
        editedDataUrl: needsEdit ? composedPhoto : undefined,
        reuseOriginalAsEdited: !needsEdit,
        themeId,
      })

      if (tetherSourcePath && !keepNative && window.electronAPI.deletePhotoFile) {
        void window.electronAPI.deletePhotoFile(tetherSourcePath)
      }

      setSavedPhoto(composedPhoto)
      setDownloadUrl(result.downloadUrl)
      setRawPhoto(null)
      setTetherSourcePath(null)
      setPhase('share')
    } else {
      const link = document.createElement('a')
      link.href = composedPhoto
      link.download = filename
      link.click()
      setRawPhoto(null)
      setTetherSourcePath(null)
      setPhase('idle')
    }
  }

  const finishShare = () => {
    setSavedPhoto(null)
    setDownloadUrl(null)
    setPhase('idle')
  }

  return (
    <div className="app">
      <CameraPreview
        videoRef={videoRef}
        filter={activeFilter ? getFilterCss(activeFilter) : 'none'}
        rotation={previewRotation}
        hidden={setupComplete && (phase === 'countdown' || phase === 'review' || phase === 'share')}
      />

      {hasEventSign(eventSignText) &&
        ((setupComplete && phase === 'idle') || (!setupComplete && wizardStep === 5)) && (
          <>
            {!setupComplete && wizardStep === 5 && (
              <div
                className="neon-sign-stage"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const nx = (e.clientX / window.innerWidth) * 100
                  const ny = (e.clientY / window.innerHeight) * 100
                  setEventSignX(nx)
                  setEventSignY(ny)
                }}
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
                  setEventSignX((e.clientX / window.innerWidth) * 100)
                  setEventSignY((e.clientY / window.innerHeight) * 100)
                }}
              />
            )}
            <NeonSign
              text={eventSignText}
              x={eventSignX}
              y={eventSignY}
              fontId={eventSignFontId}
              sizeId={eventSignSizeId}
              draggable={!setupComplete}
              onPositionChange={(x, y) => {
                setEventSignX(x)
                setEventSignY(y)
              }}
            />
          </>
        )}

      {!setupComplete && (
        <SetupWizard
          step={wizardStep}
          photosDir={photosDir}
          electronAvailable={electronAvailable}
          cameras={cameras}
          selectedDeviceId={selectedCameraId ?? ''}
          activeLabel={activeCameraLabel}
          isReady={isReady}
          error={error}
          errorHint={errorHint}
          captureMode={captureMode}
          themeId={themeId}
          previewRotation={previewRotation}
          eventSignText={eventSignText}
          eventSignFontId={eventSignFontId}
          eventSignSizeId={eventSignSizeId}
          tetherStatus={tetherStatus}
          tetherChecking={tetherChecking}
          testMessage={testMessage}
          testBusy={testBusy}
          onPickFolder={() => void handlePickFolder()}
          onCameraSelect={setSelectedCameraId}
          onCameraRefresh={() => {
            refreshCameras()
            reconnect()
          }}
          onCaptureModeChange={handleCaptureModeChange}
          onThemeChange={handleThemeChange}
          onPreviewRotationChange={setPreviewRotation}
          onEventSignChange={(text) => setEventSignText(constrainEventSignInput(text))}
          onEventSignFontChange={setEventSignFontId}
          onEventSignSizeChange={setEventSignSizeId}
          onSignPreset={(x, y) => {
            setEventSignX(x)
            setEventSignY(y)
          }}
          onGoToStep={setWizardStep}
          onCheckTether={() => void refreshTetherStatus()}
          onTestCapture={() => void handleTestCapture()}
          onBack={() => setWizardStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : 1))}
          onNext={() => setWizardStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : 5))}
          onConfirm={() => void handleWizardConfirm()}
          onReconnect={reconnect}
        />
      )}

      {setupComplete && error && (
        <div className="app__error" role="alert">
          <p className="app__error-title">{error}</p>
          {errorHint && <p className="app__error-hint">{errorHint}</p>}
          <button type="button" className="btn-secondary app__error-retry" onClick={reconnect}>
            Reconectar
          </button>
          <button type="button" className="btn-secondary app__error-setup" onClick={handleOpenSetup}>
            Configuración
          </button>
        </div>
      )}

      {setupComplete && phase === 'idle' && !error && (
        <IdleScreen
          config={appConfig}
          filters={filters}
          filterThumbnails={filterThumbnails}
          isReady={isReady}
          activeFilterId={activeFilterId}
          countdownSeconds={countdownSeconds}
          onFilterChange={setActiveFilterId}
          onCountdownChange={setCountdownSeconds}
          onStart={startCountdown}
        />
      )}

      {setupComplete && phase === 'countdown' && (
        <CountdownScreen countdown={countdown} label={appConfig.texts.countdownLabel} />
      )}

      {setupComplete && phase === 'review' && composedPhoto && (
        <ReviewScreen
          photo={composedPhoto}
          config={appConfig}
          captureSource={
            captureMode === 'tethered'
              ? usedFallback
                ? 'preview'
                : 'tether'
              : 'preview'
          }
          fallbackReason={fallbackReason}
          onRetake={retake}
          onConfirm={() => void confirmPhoto()}
        />
      )}

      {setupComplete && phase === 'share' && savedPhoto && (
        <ShareScreen
          photo={savedPhoto}
          downloadUrl={downloadUrl}
          config={appConfig}
          onDone={finishShare}
        />
      )}

      <header className="app__chrome">
        <div className="app__chrome-start">
          {(!setupComplete || operatorUnlocked) && (
            <>
              {photosDir && (
                <span className="app__chrome-event" title={photosDir}>
                  {shortPath(photosDir)}
                </span>
              )}
              <span className="app__badge">
                {activeCameraLabel ?? (selectedCameraId ? 'Conectando…' : 'Sin cámara')}
              </span>
              {setupComplete && (
                <span className="app__badge app__badge--mode" title={tetherStatus?.reason}>
                  Captura: {captureModeLabel(captureMode)}
                  {captureMode === 'tethered' && usedFallback && phase === 'review'
                    ? ' · fallback'
                    : ''}
                </span>
              )}
            </>
          )}
          {setupComplete && (
            <button
              type="button"
              className={`app__chrome-op${operatorUnlocked ? ' app__chrome-op--open' : ''}`}
              aria-label="Menú operador"
              onClick={() => {
                requestOperatorAccess('menu')
              }}
            >
              <svg className="app__chrome-op-icon" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="6" r="2.1" fill="currentColor" />
                <circle cx="12" cy="12" r="2.1" fill="currentColor" />
                <circle cx="12" cy="18" r="2.1" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
        <div className="app__chrome-end">
          {(!setupComplete || operatorUnlocked) && (
            <>
              {setupComplete && (
                <button type="button" className="app__chrome-btn" onClick={handleOpenSetup}>
                  Configuración
                </button>
              )}
              <button
                type="button"
                className="app__chrome-btn app__chrome-btn--exit"
                onClick={handleQuit}
              >
                Salir
              </button>
            </>
          )}
        </div>
      </header>

      {pinOpen && (
        <OperatorPinModal
          expectedPin={appConfig.operatorPin}
          onSuccess={onPinSuccess}
          onCancel={() => {
            setPinOpen(false)
            setPendingOperatorAction(null)
          }}
        />
      )}
    </div>
  )
}

export default App
