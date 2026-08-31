import type { SlideshowDisplayMode } from '../lib/slideshow'

interface IdleSlideshowProps {
  visible: boolean
  displayMode: SlideshowDisplayMode
  imageUrl: string | null
  faded: boolean
  onDismiss: () => void
}

export function IdleSlideshow({
  visible,
  displayMode,
  imageUrl,
  faded,
  onDismiss,
}: IdleSlideshowProps) {
  if (!visible || !imageUrl || displayMode === 'off') return null

  return (
    <div
      className={`idle-slideshow idle-slideshow--${displayMode}`}
      onPointerDown={onDismiss}
      role="presentation"
    >
      <img
        src={imageUrl}
        alt=""
        className={`idle-slideshow__img${faded ? ' idle-slideshow__img--visible' : ''}`}
        draggable={false}
      />
      {displayMode === 'fullscreen' && (
        <p className="idle-slideshow__hint">Toca para tomar tu foto</p>
      )}
    </div>
  )
}
