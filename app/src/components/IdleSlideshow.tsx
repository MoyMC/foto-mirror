import { useEffect, useRef } from 'react'
import type { SlideshowDisplayMode, SlideshowImage } from '../lib/slideshow'

interface IdleSlideshowProps {
  visible: boolean
  displayMode: SlideshowDisplayMode
  item: SlideshowImage | null
  faded: boolean
  audioEnabled: boolean
  onDismiss: () => void
  onMediaEnded: () => void
}

export function IdleSlideshow({
  visible,
  displayMode,
  item,
  faded,
  audioEnabled,
  onDismiss,
  onMediaEnded,
}: IdleSlideshowProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !item || item.kind !== 'video' || !visible) return
    video.muted = !audioEnabled
    video.currentTime = 0
    const play = video.play()
    if (play && typeof play.catch === 'function') {
      play.catch(() => {
        // Autoplay with sound may fail — retry muted once.
        if (!video.muted) {
          video.muted = true
          void video.play().catch(() => undefined)
        }
      })
    }
  }, [item, visible, audioEnabled])

  if (!visible || !item?.url || displayMode === 'off') return null

  return (
    <div
      className={`idle-slideshow idle-slideshow--${displayMode}`}
      onPointerDown={onDismiss}
      role="presentation"
    >
      {item.kind === 'video' ? (
        <video
          key={item.url}
          ref={videoRef}
          className={`idle-slideshow__media${faded ? ' idle-slideshow__media--visible' : ''}`}
          src={item.url}
          playsInline
          muted={!audioEnabled}
          autoPlay
          onEnded={onMediaEnded}
          onError={onMediaEnded}
        />
      ) : (
        <img
          src={item.url}
          alt=""
          className={`idle-slideshow__media${faded ? ' idle-slideshow__media--visible' : ''}`}
          draggable={false}
        />
      )}
      {displayMode === 'fullscreen' && (
        <p className="idle-slideshow__hint">Toca para tomar tu foto</p>
      )}
    </div>
  )
}
