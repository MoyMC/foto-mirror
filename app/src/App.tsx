import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppPhase, CaptureMode, PhotoMode, PrinterOption, StripCaptureFrame, TetherStatus } from './types'
import { appConfig } from './lib/appConfig'
import { getFilterCss, resolveFilters } from './lib/filters'
import { useFilterThumbnails } from './hooks/useFilterThumbnails'
import {
  captureModeLabel,
  DEFAULT_PRINTER_NAME,
  loadStoredCaptureMode,
  loadStoredEventSignFontId,
  loadStoredEventSignSizeId,
  loadStoredEventSignText,
  loadStoredEventSignX,
  loadStoredEventSignY,
  loadStoredPhotosDir,
  loadStoredPreviewRotation,
  loadStoredPrintEnabled,
  loadStoredPrinterName,
  loadStoredSlideshowIdleEnabled,
  loadStoredSlideshowIdleSeconds,
  loadStoredSlideshowIncludeEventPhotos,
  loadStoredSlideshowMemoriesDir,
  loadStoredThemeId,
  saveSessionConfig,
  shortPath,
  SIMULATE_PRINTER_ID,
} from './lib/sessionConfig'
import { constrainEventSignInput, hasEventSign, normalizeEventSign } from './lib/eventSign'
import { normalizeSlideshowIdleSeconds } from './lib/slideshow'
import { composePhoto } from './lib/composePhoto'
import { composePhotoStrip } from './lib/stripCompositor'
import { createStripId, isStripMode, poseCountForMode, STRIP_FLASH_MS } from './lib/photoMode'
import { type PreviewRotation } from './lib/orientation'
import { applyAppTheme, themeNeonColor, type AppThemeId } from './lib/themes'
import { pickDefaultDeviceId, useCamera } from './hooks/useCamera'
import { usePhotoCompositor } from './hooks/usePhotoCompositor'
import { useSlideshowImages } from './hooks/useSlideshowImages'
import { useIdleSlideshow } from './hooks/useIdleSlideshow'
import { CameraPreview } from './components/CameraPreview'
import { NeonSign } from './components/NeonSign'
import { IdleSlideshow } from './components/IdleSlideshow'
import { SetupWizard } from './components/SetupWizard'
import { COUNTDOWN_OPTIONS, IdleScreen } from './components/IdleScreen'
import { CountdownScreen } from './components/CountdownScreen'
import { StripFlashScreen } from './components/StripFlashScreen'
import { ReviewScreen } from './components/ReviewScreen'
import { ShareScreen } from './components/ShareScreen'
import { OperatorPinModal } from './components/OperatorPinModal'
import './App.css'

const OPERATOR_UNLOCK_MS = 90_000

function App() {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
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
  const [slideshowMemoriesDir, setSlideshowMemoriesDir] = useState<string | null>(() =>
    loadStoredSlideshowMemoriesDir(),
  )
  const [slideshowIncludeEventPhotos, setSlideshowIncludeEventPhotos] = useState(() =>
    loadStoredSlideshowIncludeEventPhotos(),
  )
  const [slideshowIdleEnabled, setSlideshowIdleEnabled] = useState(() =>
    loadStoredSlideshowIdleEnabled(),
  )
  const [slideshowIdleSeconds, setSlideshowIdleSeconds] = useState(() =>
    loadStoredSlideshowIdleSeconds(),
  )
  const [printEnabled, setPrintEnabled] = useState(() => loadStoredPrintEnabled())
  const [printerName, setPrinterName] = useState(() => loadStoredPrinterName())
  const [printers, setPrinters] = useState<PrinterOption[]>([])
  const [printersLoading, setPrintersLoading] = useState(false)
  const [simulatePrinterLabel, setSimulatePrinterLabel] = useState('Simulación (no imprime)')
  const [slideshowRefreshKey, setSlideshowRefreshKey] = useState(0)
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
  const [photoMode, setPhotoMode] = useState<PhotoMode>('individual')
  const [stripFilterIds, setStripFilterIds] = useState<[string, string, string]>([
    appConfig.defaultFilterId,
    appConfig.defaultFilterId,
    appConfig.defaultFilterId,
  ])
  const [stripPose, setStripPose] = useState(0)
  const [stripFlashCompleted, setStripFlashCompleted] = useState(0)
  const [stripId, setStripId] = useState<string | null>(null)
  const [stripFrames, setStripFrames] = useState<StripCaptureFrame[]>([])
  const [stripComposedCells, setStripComposedCells] = useState<string[]>([])
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null)
  const stripFramesRef = useRef<StripCaptureFrame[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [cameraInitialized, setCameraInitialized] = useState(false)
  const [operatorUnlocked, setOperatorUnlocked] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pendingOperatorAction, setPendingOperatorAction] = useState<
    'menu' | 'setup' | 'quit' | null
  >(null)
  const capturingRef = useRef(false)
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stripPoseCount = poseCountForMode(photoMode)
  const stripMode = isStripMode(photoMode)

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

  const slideshowConfig = useMemo(
    () => ({
      enabled: slideshowIdleEnabled,
      memoriesDir: slideshowMemoriesDir,
      includeEventPhotos: slideshowIncludeEventPhotos,
      idleSeconds: slideshowIdleSeconds,
    }),
    [
      slideshowIdleEnabled,
      slideshowMemoriesDir,
      slideshowIncludeEventPhotos,
      slideshowIdleSeconds,
    ],
  )

  const slideshowImagesActive =
    setupComplete && phase === 'idle' && electronAvailable && slideshowIdleEnabled

  const { images: slideshowImages, hasMemoryImages } = useSlideshowImages({
    config: slideshowConfig,
    photosDir,
    enabled: slideshowImagesActive,
    refreshKey: slideshowRefreshKey,
  })

  const {
    slideshowVisible,
    displayMode: slideshowDisplayMode,
    current: slideshowCurrent,
    fade: slideshowFade,
    bumpActivity: bumpSlideshowActivity,
  } = useIdleSlideshow({
    active: setupComplete && phase === 'idle' && !error,
    config: slideshowConfig,
    images: slideshowImages,
    hasMemoryImages,
    onDismiss: () => {},
  })

  const fullscreenSlideshow =
    slideshowVisible && slideshowDisplayMode === 'fullscreen'

  const filters = resolveFilters(appConfig.filters)
  const activeFilter = filters.find((f) => f.id === activeFilterId) ?? filters[0]
  const filterThumbnails = useFilterThumbnails(videoRef, filters, isReady, previewRotation)

  const composeOverlay = useMemo(
    () => ({
      logoUrl: null as string | null,
      signText: eventSignText,
      neonColor: themeNeonColor(themeId),
      signX: eventSignX,
      signY: eventSignY,
      signFontId: eventSignFontId,
      signSizeId: eventSignSizeId,
      previewRotation,
    }),
    [
      eventSignText,
      themeId,
      eventSignX,
      eventSignY,
      eventSignFontId,
      eventSignSizeId,
      previewRotation,
    ],
  )

  const composedPhoto = usePhotoCompositor(
    photoMode === 'individual' ? rawPhoto : null,
    composeOverlay,
    activeFilter,
    previewRotation,
    Boolean(tetherSourcePath) && !usedFallback,
  )

  const finishStripSession = useCallback(
    async (frames: StripCaptureFrame[]) => {
      const cells = await Promise.all(
        frames.map((frame, index) => {
          const filter = filters.find((f) => f.id === stripFilterIds[index]) ?? filters[0]
          const needsOrientation = Boolean(frame.tetherSourcePath) && !frame.usedFallback
          return composePhoto(frame.rawPhoto, filter, {
            ...composeOverlay,
            signText: '',
            needsOrientationPass: needsOrientation,
          })
        }),
      )
      const portraitStrip = previewRotation === 90 || previewRotation === 270
      const strip = await composePhotoStrip(cells, {
        cellAspect: portraitStrip ? 2 / 3 : 3 / 2,
      })
      setStripComposedCells(cells)
      setStripFrames(frames)
      setReviewPhoto(strip)
      setPhase('review')
    },
    [composeOverlay, filters, stripFilterIds, previewRotation],
  )

  const clearStripTetherFiles = useCallback((frames: StripCaptureFrame[]) => {
    if (!window.electronAPI?.deletePhotoFile) return
    for (const frame of frames) {
      if (frame.tetherSourcePath) {
        void window.electronAPI.deletePhotoFile(frame.tetherSourcePath)
      }
    }
  }, [])

  const resetStripFilters = useCallback(() => {
    const defaultId = appConfig.defaultFilterId
    setStripFilterIds([defaultId, defaultId, defaultId])
  }, [])

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

  const refreshPrinters = useCallback(async () => {
    if (!window.electronAPI?.listPrinters) {
      setPrinters([])
      return
    }
    setPrintersLoading(true)
    try {
      const [list, simulate] = await Promise.all([
        window.electronAPI.listPrinters(),
        window.electronAPI.getSimulatePrinter?.() ??
          Promise.resolve({ id: SIMULATE_PRINTER_ID, label: 'Simulación (no imprime)' }),
      ])
      setPrinters(list)
      setSimulatePrinterLabel(simulate.label)
      setPrinterName((current) => {
        if (current === SIMULATE_PRINTER_ID || current === simulate.id) return simulate.id
        if (list.some((p) => p.name === current)) return current
        const preferred =
          list.find((p) => p.name === DEFAULT_PRINTER_NAME) ??
          list.find((p) => p.isDefault) ??
          list[0]
        return preferred?.name ?? SIMULATE_PRINTER_ID
      })
    } catch {
      setPrinters([])
    } finally {
      setPrintersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (wizardStep !== 6 || setupComplete) return
    void refreshPrinters()
  }, [wizardStep, setupComplete, refreshPrinters])

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
      if (!result.photo) {
        capturingRef.current = false
        setPhase('idle')
        return
      }

      if (stripMode) {
        const frame: StripCaptureFrame = {
          rawPhoto: result.photo,
          tetherSourcePath: result.tetherFilePath ?? null,
          usedFallback: result.usedFallback,
          fallbackReason: result.error ?? null,
        }
        const nextFrames = [...stripFramesRef.current, frame]
        stripFramesRef.current = nextFrames

        if (nextFrames.length < stripPoseCount) {
          setStripPose(nextFrames.length)
          setStripFlashCompleted(nextFrames.length)
          setPhase('strip-flash')
          capturingRef.current = false
          return
        }

        await finishStripSession(nextFrames)
        setCountdown(countdownSeconds)
        capturingRef.current = false
        return
      }

      setRawPhoto(result.photo)
      setUsedFallback(result.usedFallback)
      setFallbackReason(result.error ?? null)
      setTetherSourcePath(result.tetherFilePath ?? null)
      setPhase('review')
      setCountdown(countdownSeconds)
      capturingRef.current = false
    })()
  }, [
    setupComplete,
    phase,
    countdown,
    countdownSeconds,
    takePhoto,
    photoMode,
    stripMode,
    stripPoseCount,
    finishStripSession,
  ])

  useEffect(() => {
    if (!setupComplete || phase !== 'strip-flash') return

    const timer = setTimeout(() => {
      setCountdown(countdownSeconds)
      setPhase('countdown')
    }, STRIP_FLASH_MS)

    return () => clearTimeout(timer)
  }, [setupComplete, phase, countdownSeconds])

  const handlePickFolder = async () => {
    if (!window.electronAPI?.selectPhotosDir) return
    const dir = await window.electronAPI.selectPhotosDir()
    if (dir) setPhotosDir(dir)
  }

  const handlePickSlideshowDir = async () => {
    if (!window.electronAPI?.selectSlideshowDir) return
    const dir = await window.electronAPI.selectSlideshowDir()
    if (dir) setSlideshowMemoriesDir(dir)
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
        slideshowMemoriesDir,
        slideshowIncludeEventPhotos,
        slideshowIdleEnabled,
        slideshowIdleSeconds,
        printEnabled,
        printerName,
      })
    }

    setCaptureMode(mode)
    setEventSignText(normalizeEventSign(eventSignText))

    if (window.electronAPI && photosDir) {
      await window.electronAPI.setPrintSettings?.({
        enabled: printEnabled,
        printerName,
      })
      await window.electronAPI.startPhotoServer(photosDir)
      await window.electronAPI.setSlideshowMemoriesDir(slideshowMemoriesDir)
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
    if (stripMode) {
      stripFramesRef.current = []
      setStripFrames([])
      setStripComposedCells([])
      setReviewPhoto(null)
      setStripId(createStripId())
      setStripPose(0)
    }
    setCountdown(countdownSeconds)
    setPhase('countdown')
  }

  const retake = () => {
    if (stripMode) {
      clearStripTetherFiles(stripFrames)
      stripFramesRef.current = []
      setStripFrames([])
      setStripComposedCells([])
      setReviewPhoto(null)
      setStripPose(0)
      setPhase('idle')
      return
    }

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
    const individualPhoto = composedPhoto
    const stripPhoto = reviewPhoto

    if (stripMode) {
      if (!stripPhoto || stripFrames.length !== stripPoseCount || !stripId || !photosDir) return
      if (!window.electronAPI?.saveStripPhotos) return

      const poses = stripFrames.map((frame, index) => {
        const keepNative = Boolean(frame.tetherSourcePath) && !frame.usedFallback
        // Always persist composed cells (orientation + filter) so print matches the web crop UI.
        const hasComposed = Boolean(stripComposedCells[index])
        const needsEdit = hasComposed || stripFilterIds[index] !== 'normal' || keepNative

        return {
          pose: index + 1,
          originalFilePath: keepNative ? frame.tetherSourcePath! : undefined,
          originalDataUrl: keepNative ? undefined : frame.rawPhoto,
          editedDataUrl: stripComposedCells[index] ?? frame.rawPhoto,
          reuseOriginalAsEdited: !needsEdit,
        }
      })

      const result = await window.electronAPI.saveStripPhotos({
        photosDir,
        stripId,
        stripKind: photoMode === 'strip2' ? 'strip2' : 'strip3',
        stripDataUrl: stripPhoto,
        poses,
        themeId,
        signText: hasEventSign(eventSignText) ? normalizeEventSign(eventSignText) : null,
        previewRotation,
      })

      for (const frame of stripFrames) {
        if (frame.tetherSourcePath && !frame.usedFallback && window.electronAPI.deletePhotoFile) {
          void window.electronAPI.deletePhotoFile(frame.tetherSourcePath)
        }
      }

      setSavedPhoto(stripPhoto)
      setDownloadUrl(result.downloadUrl)
      stripFramesRef.current = []
      setStripFrames([])
      setStripComposedCells([])
      setReviewPhoto(null)
      setSlideshowRefreshKey((k) => k + 1)
      setPhase('share')
      return
    }

    if (!individualPhoto || !rawPhoto) return

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
        printMeta: {
          signText: hasEventSign(eventSignText) ? normalizeEventSign(eventSignText) : null,
          signX: eventSignX,
          signY: eventSignY,
          signFontId: eventSignFontId,
          signSizeId: eventSignSizeId,
          themeId,
          previewRotation,
          needsOrientationPass: keepNative,
        },
      })

      if (tetherSourcePath && !keepNative && window.electronAPI.deletePhotoFile) {
        void window.electronAPI.deletePhotoFile(tetherSourcePath)
      }

      setSavedPhoto(composedPhoto)
      setDownloadUrl(result.downloadUrl)
      setRawPhoto(null)
      setTetherSourcePath(null)
      setSlideshowRefreshKey((k) => k + 1)
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
    resetStripFilters()
    setPhase('idle')
  }

  const previewFilter =
    photoMode === 'individual' && activeFilter ? getFilterCss(activeFilter) : 'none'

  const reviewDisplayPhoto = stripMode ? reviewPhoto : composedPhoto
  const canShowReview = Boolean(reviewDisplayPhoto) && phase === 'review'

  return (
    <div className="app">
      <CameraPreview
        videoRef={videoRef}
        filter={previewFilter}
        rotation={previewRotation}
        hidden={
          fullscreenSlideshow ||
          (setupComplete && (phase === 'countdown' || phase === 'review' || phase === 'share'))
        }
      />

      {hasEventSign(eventSignText) &&
        !fullscreenSlideshow &&
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
          onPickSlideshowDir={() => void handlePickSlideshowDir()}
          onSlideshowIdleEnabledChange={setSlideshowIdleEnabled}
          onSlideshowIncludeEventChange={setSlideshowIncludeEventPhotos}
          onSlideshowIdleSecondsChange={(sec) =>
            setSlideshowIdleSeconds(normalizeSlideshowIdleSeconds(sec))
          }
          slideshowMemoriesDir={slideshowMemoriesDir}
          slideshowIncludeEventPhotos={slideshowIncludeEventPhotos}
          slideshowIdleEnabled={slideshowIdleEnabled}
          slideshowIdleSeconds={slideshowIdleSeconds}
          printEnabled={printEnabled}
          printerName={printerName}
          printers={printers}
          printersLoading={printersLoading}
          simulatePrinterLabel={simulatePrinterLabel}
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
          onPrintEnabledChange={setPrintEnabled}
          onPrinterNameChange={setPrinterName}
          onRefreshPrinters={() => void refreshPrinters()}
          onGoToStep={setWizardStep}
          onCheckTether={() => void refreshTetherStatus()}
          onTestCapture={() => void handleTestCapture()}
          onBack={() =>
            setWizardStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5 | 6) : 1))
          }
          onNext={() =>
            setWizardStep((s) => (s < 6 ? ((s + 1) as 1 | 2 | 3 | 4 | 5 | 6) : 6))
          }
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
          photoMode={photoMode}
          activeFilterId={activeFilterId}
          stripFilterIds={stripFilterIds}
          countdownSeconds={countdownSeconds}
          onPhotoModeChange={setPhotoMode}
          onFilterChange={setActiveFilterId}
          onStripFilterChange={(index, id) => {
            setStripFilterIds((current) => {
              const next = [...current] as [string, string, string]
              next[index] = id
              return next
            })
          }}
          onCountdownChange={setCountdownSeconds}
          onStart={startCountdown}
          onInteraction={bumpSlideshowActivity}
        />
      )}

      <IdleSlideshow
        visible={slideshowVisible}
        displayMode={slideshowDisplayMode}
        imageUrl={slideshowCurrent?.url ?? null}
        faded={slideshowFade}
        onDismiss={bumpSlideshowActivity}
      />

      {setupComplete && phase === 'strip-flash' && stripMode && (
        <StripFlashScreen completedPose={stripFlashCompleted} poseCount={stripPoseCount} />
      )}

      {setupComplete && phase === 'countdown' && (
        <CountdownScreen
          countdown={countdown}
          label={appConfig.texts.countdownLabel}
          poseLabel={stripMode ? `Pose ${stripPose + 1} de ${stripPoseCount}` : null}
        />
      )}

      {setupComplete && canShowReview && reviewDisplayPhoto && (
        <ReviewScreen
          photo={reviewDisplayPhoto}
          variant={stripMode ? 'strip' : 'individual'}
          config={appConfig}
          captureSource={
            stripMode
              ? null
              : captureMode === 'tethered'
                ? usedFallback
                  ? 'preview'
                  : 'tether'
                : 'preview'
          }
          fallbackReason={stripMode ? null : fallbackReason}
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

      <header className={`app__chrome${fullscreenSlideshow ? ' app__chrome--hidden' : ''}`}>
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
