import { useCallback, useEffect, useRef, useState } from 'react'
import { captureFilteredFrame } from '../lib/filters'
import type { PreviewRotation } from '../lib/orientation'
import { CAMERA_DEVICE_KEY, loadSessionConfig } from '../lib/sessionConfig'
import type { FilterPreset, VideoInputDevice } from '../types'

interface UseCameraOptions {
  width?: number
  height?: number
  deviceId: string | null
  rotation?: PreviewRotation
}

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  cameras: VideoInputDevice[]
  activeCameraLabel: string | null
  error: string | null
  errorHint: string | null
  isReady: boolean
  captureFrame: (preset: FilterPreset) => string | null
  refreshCameras: () => void
  reconnect: () => void
}

function mapCameraError(err: unknown, deviceCount: number): { message: string; hint: string } {
  const name = err instanceof DOMException ? err.name : ''

  if (name === 'NotFoundError' || (err instanceof Error && /not found/i.test(err.message))) {
    return {
      message: 'No se encontró la cámara seleccionada',
      hint: 'Elige otra cámara en el selector o pulsa Actualizar si acabas de conectar la Sony.',
    }
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      message: 'Permiso de cámara denegado',
      hint: 'Permite el acceso a la cámara para esta app en la configuración del sistema.',
    }
  }

  if (name === 'NotReadableError') {
    return {
      message: 'La cámara está en uso por otra aplicación',
      hint:
        'Cierra Configuración → Cámaras, Zoom, Teams u otras apps que usen la cámara, elige otra en el selector y espera unos segundos.',
    }
  }

  if (name === 'OverconstrainedError') {
    return {
      message: 'La cámara no admite la resolución solicitada',
      hint: 'Prueba otra cámara o reduce captureWidth / captureHeight en config.json.',
    }
  }

  const fallback = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'

  return {
    message: fallback,
    hint:
      deviceCount === 0
        ? 'No hay dispositivos de video. Conecta la cámara y pulsa Actualizar.'
        : `Hay ${deviceCount} cámara(s). Prueba otra en el selector.`,
  }
}

async function ensureCameraPermission(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const needsPermission = devices
    .filter((d) => d.kind === 'videoinput')
    .some((d) => !d.label)

  if (!needsPermission) return

  const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  temp.getTracks().forEach((t) => t.stop())
}

export async function listVideoInputs(): Promise<VideoInputDevice[]> {
  await ensureCameraPermission()
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Cámara ${index + 1}`,
    }))
}

function pickDefaultDeviceId(
  cameras: VideoInputDevice[],
  preferredLabel?: string,
): string | null {
  if (cameras.length === 0) return null

  const session = loadSessionConfig()
  if (session && cameras.some((c) => c.deviceId === session.cameraDeviceId)) {
    return session.cameraDeviceId
  }

  const stored = localStorage.getItem(CAMERA_DEVICE_KEY)
  if (stored && cameras.some((c) => c.deviceId === stored)) return stored

  if (preferredLabel) {
    const needle = preferredLabel.toLowerCase()
    const match = cameras.find((c) => c.label.toLowerCase().includes(needle))
    if (match) return match.deviceId
  }

  const sony = cameras.find((c) => /sony|imaging edge/i.test(c.label))
  if (sony) return sony.deviceId

  return cameras[0].deviceId
}

async function openCamera(
  width: number,
  height: number,
  deviceId: string | null,
): Promise<MediaStream> {
  const deviceConstraint = deviceId ? { deviceId: { exact: deviceId } } : {}

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        ...deviceConstraint,
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: {
        ...deviceConstraint,
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    { video: { ...deviceConstraint }, audio: false },
  ]

  if (deviceId) {
    attempts.push({
      video: { deviceId: { ideal: deviceId }, width: { ideal: width }, height: { ideal: height } },
      audio: false,
    })
  } else {
    attempts.unshift({
      video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } },
      audio: false,
    })
  }

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      lastError = e
      if (
        e instanceof DOMException &&
        (e.name === 'NotReadableError' ||
          e.name === 'NotAllowedError' ||
          e.name === 'PermissionDeniedError')
      ) {
        throw e
      }
    }
  }
  throw lastError
}

export function useCamera({
  width = 1920,
  height = 1080,
  deviceId,
  rotation = 0,
}: UseCameraOptions): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameras, setCameras] = useState<VideoInputDevice[]>([])
  const [activeCameraLabel, setActiveCameraLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorHint, setErrorHint] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const refreshCameras = useCallback(() => {
    void listVideoInputs()
      .then(setCameras)
      .catch(() => setCameras([]))
  }, [])

  const reconnect = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    refreshCameras()

    const onDeviceChange = () => refreshCameras()
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
  }, [refreshCameras])

  useEffect(() => {
    if (deviceId) {
      localStorage.setItem(CAMERA_DEVICE_KEY, deviceId)
    }
  }, [deviceId])

  useEffect(() => {
    let active = true
    let mediaStream: MediaStream | null = null

    async function start() {
      setError(null)
      setErrorHint(null)
      setIsReady(false)
      setActiveCameraLabel(null)

      if (!deviceId) return

      let deviceCount = 0
      try {
        const devices = await listVideoInputs()
        deviceCount = devices.length
        const selected = devices.find((d) => d.deviceId === deviceId)
        if (selected) setActiveCameraLabel(selected.label)
      } catch {
        /* ignore */
      }

      try {
        mediaStream = await openCamera(width, height, deviceId)

        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop())
          return
        }

        setStream(mediaStream)

        const video = videoRef.current
        if (video) {
          video.srcObject = mediaStream
          await video.play()
          setIsReady(true)
        }
      } catch (err) {
        if (!active) return
        const { message, hint } = mapCameraError(err, deviceCount)
        setError(message)
        setErrorHint(hint)
        setIsReady(false)
      }
    }

    void start()

    return () => {
      active = false
      mediaStream?.getTracks().forEach((t) => t.stop())
      setStream(null)
      setIsReady(false)
    }
  }, [width, height, deviceId, attempt])

  const captureFrame = useCallback(
    (preset: FilterPreset): string | null => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return null
      const srcW = video.videoWidth || width
      const srcH = video.videoHeight || height
      return captureFilteredFrame(video, srcW, srcH, preset, 0.92, rotation)
    },
    [width, height, rotation],
  )

  return {
    videoRef,
    stream,
    cameras,
    activeCameraLabel,
    error,
    errorHint,
    isReady,
    captureFrame,
    refreshCameras,
    reconnect,
  }
}

export { pickDefaultDeviceId }
