import { useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import {
  clampOverlayScale,
  DEFAULT_OVERLAY_SCALE,
  MAX_OVERLAY_SCALE,
  MIN_OVERLAY_SCALE,
  OVERLAY_BASE_FRACTION,
} from '../lib/overlay'
import {
  DEFAULT_EVENT_SIGN_X,
  DEFAULT_EVENT_SIGN_Y,
  clampSignCenter,
  clampSignPercent,
} from '../lib/eventSign'

interface PngOverlayProps {
  src: string
  x?: number
  y?: number
  scale?: number
  draggable?: boolean
  onPositionChange?: (x: number, y: number) => void
  onScaleChange?: (scale: number) => void
  className?: string
}

function fitPosition(
  x: number,
  y: number,
  el: HTMLElement | null,
): { x: number; y: number } {
  if (!el) {
    return {
      x: clampSignPercent(x, DEFAULT_EVENT_SIGN_X),
      y: clampSignPercent(y, DEFAULT_EVENT_SIGN_Y),
    }
  }
  return clampSignCenter(
    x,
    y,
    Math.max(el.offsetWidth, 1) / 2,
    Math.max(el.offsetHeight, 1) / 2,
    window.innerWidth,
    window.innerHeight,
  )
}

export function PngOverlay({
  src,
  x = DEFAULT_EVENT_SIGN_X,
  y = DEFAULT_EVENT_SIGN_Y,
  scale = DEFAULT_OVERLAY_SCALE,
  draggable = false,
  onPositionChange,
  onScaleChange,
  className = '',
}: PngOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; kind: 'move' | 'scale'; startX: number; startY: number; startScale: number } | null>(
    null,
  )
  const onPosRef = useRef(onPositionChange)
  onPosRef.current = onPositionChange
  const placed = Boolean(onPositionChange || draggable || className.includes('png-overlay--live'))
  const s = clampOverlayScale(scale)

  useLayoutEffect(() => {
    if (!placed || !onPosRef.current) return
    const el = rootRef.current
    if (!el) return
    const apply = () => {
      const next = fitPosition(x, y, rootRef.current)
      const emit = onPosRef.current
      if (emit && (Math.abs(next.x - x) > 0.2 || Math.abs(next.y - y) > 0.2)) {
        emit(next.x, next.y)
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [placed, x, y, s, src])

  const style = {
    ...(placed
      ? {
          left: `${clampSignPercent(x, DEFAULT_EVENT_SIGN_X)}%`,
          top: `${clampSignPercent(y, DEFAULT_EVENT_SIGN_Y)}%`,
        }
      : {}),
    width: `calc(min(100vw, 100vh) * ${OVERLAY_BASE_FRACTION} * ${s})`,
  } as CSSProperties

  const emitPosition = (clientX: number, clientY: number) => {
    if (!onPositionChange) return
    const next = fitPosition(
      (clientX / window.innerWidth) * 100,
      (clientY / window.innerHeight) * 100,
      rootRef.current,
    )
    onPositionChange(next.x, next.y)
  }

  const onMovePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || !onPositionChange) return
    if ((e.target as HTMLElement).dataset.handle === 'scale') return
    e.preventDefault()
    e.stopPropagation()
    drag.current = {
      pointerId: e.pointerId,
      kind: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startScale: s,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    emitPosition(e.clientX, e.clientY)
  }

  const onScalePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!onScaleChange) return
    e.preventDefault()
    e.stopPropagation()
    drag.current = {
      pointerId: e.pointerId,
      kind: 'scale',
      startX: e.clientX,
      startY: e.clientY,
      startScale: s,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== e.pointerId) return
    if (state.kind === 'move') {
      emitPosition(e.clientX, e.clientY)
      return
    }
    if (!onScaleChange) return
    const delta = (e.clientX - state.startX + (e.clientY - state.startY)) / 180
    onScaleChange(clampOverlayScale(state.startScale + delta))
  }

  return (
    <div
      ref={rootRef}
      className={`png-overlay${placed ? ' png-overlay--placed' : ''}${
        draggable ? ' png-overlay--drag' : ''
      } ${className}`.trim()}
      style={style}
      onPointerDown={onMovePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
    >
      <img src={src} alt="" draggable={false} />
      {draggable && onScaleChange ? (
        <button
          type="button"
          className="png-overlay__handle"
          data-handle="scale"
          aria-label="Escalar imagen"
          onPointerDown={onScalePointerDown}
        />
      ) : null}
      <span className="png-overlay__scale-hint" aria-hidden>
        {Math.round(s * 100)}%
      </span>
    </div>
  )
}

export { MIN_OVERLAY_SCALE, MAX_OVERLAY_SCALE }
