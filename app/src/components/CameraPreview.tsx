import type { PreviewRotation } from '../lib/orientation'
import { previewCssTransform } from '../lib/orientation'

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  filter: string
  hidden?: boolean
  rotation?: PreviewRotation
}

export function CameraPreview({
  videoRef,
  filter,
  hidden,
  rotation = 0,
}: CameraPreviewProps) {
  const swap = rotation === 90 || rotation === 270

  return (
    <video
      ref={videoRef}
      className={`camera-preview${swap ? ' camera-preview--rotated' : ''}${
        hidden ? ' camera-preview--hidden' : ''
      }`}
      data-rotation={rotation}
      style={{
        filter,
        transform: previewCssTransform(rotation),
      }}
      autoPlay
      playsInline
      muted
    />
  )
}
