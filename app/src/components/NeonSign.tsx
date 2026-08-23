import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import {
  DEFAULT_EVENT_SIGN_FONT,
  DEFAULT_EVENT_SIGN_SIZE,
  DEFAULT_EVENT_SIGN_X,
  DEFAULT_EVENT_SIGN_Y,
  clampSignCenter,
  clampSignPercent,
  eventSignLines,
  signFontById,
  signSizeById,
  type EventSignFontId,
  type EventSignSizeId,
} from '../lib/eventSign'

interface NeonSignProps {
  text: string
  className?: string
  x?: number
  y?: number
  fontId?: EventSignFontId
  sizeId?: EventSignSizeId
  draggable?: boolean
  onPositionChange?: (x: number, y: number) => void
}

function fitSignPosition(
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
    Math.max(el.offsetWidth, el.scrollWidth) / 2,
    Math.max(el.offsetHeight, el.scrollHeight) / 2,
    window.innerWidth,
    window.innerHeight,
  )
}

export function NeonSign({
  text,
  className = '',
  x = DEFAULT_EVENT_SIGN_X,
  y = DEFAULT_EVENT_SIGN_Y,
  fontId = DEFAULT_EVENT_SIGN_FONT,
  sizeId = DEFAULT_EVENT_SIGN_SIZE,
  draggable = false,
  onPositionChange,
}: NeonSignProps) {
  const lines = eventSignLines(text)
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number } | null>(null)
  const onPosRef = useRef(onPositionChange)
  onPosRef.current = onPositionChange
  const font = signFontById(fontId)
  const size = signSizeById(sizeId)
  const placed = Boolean(onPositionChange || draggable || className.includes('neon-sign--live'))

  useLayoutEffect(() => {
    if (!placed || lines.length === 0 || !onPosRef.current) return
    const el = rootRef.current
    if (!el) return

    const apply = () => {
      const next = fitSignPosition(x, y, rootRef.current)
      const emit = onPosRef.current
      if (emit && (Math.abs(next.x - x) > 0.2 || Math.abs(next.y - y) > 0.2)) {
        emit(next.x, next.y)
      }
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener('resize', apply)
    void document.fonts?.ready.then(apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [placed, lines.length, x, y, fontId, sizeId, text])

  if (lines.length === 0) return null

  const style = {
    fontFamily: font.family,
    fontWeight: font.weight,
    letterSpacing: font.letterSpacing,
    '--sign-size': size.css,
    ...(placed
      ? {
          left: `${clampSignPercent(x, DEFAULT_EVENT_SIGN_X)}%`,
          top: `${clampSignPercent(y, DEFAULT_EVENT_SIGN_Y)}%`,
        }
      : {}),
  } as CSSProperties

  const emitPosition = (clientX: number, clientY: number) => {
    if (!onPositionChange) return
    const next = fitSignPosition(
      (clientX / window.innerWidth) * 100,
      (clientY / window.innerHeight) * 100,
      rootRef.current,
    )
    onPositionChange(next.x, next.y)
  }

  return (
    <div
      ref={rootRef}
      className={`neon-sign${placed ? ' neon-sign--placed' : ''}${
        draggable ? ' neon-sign--drag' : ''
      } ${className}`.trim()}
      style={style}
      onPointerDown={
        draggable && onPositionChange
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              drag.current = { pointerId: e.pointerId }
              e.currentTarget.setPointerCapture(e.pointerId)
              emitPosition(e.clientX, e.clientY)
            }
          : undefined
      }
      onPointerMove={
        draggable && onPositionChange
          ? (e) => {
              if (!drag.current || drag.current.pointerId !== e.pointerId) return
              emitPosition(e.clientX, e.clientY)
            }
          : undefined
      }
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
    >
      {lines.map((line, index) => (
        <span key={`${index}-${line}`} className="neon-sign__line">
          {line}
        </span>
      ))}
    </div>
  )
}

export function drawNeonSign(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  color: string,
  xPercent = DEFAULT_EVENT_SIGN_X,
  yPercent = DEFAULT_EVENT_SIGN_Y,
  fontId: EventSignFontId = DEFAULT_EVENT_SIGN_FONT,
  sizeId: EventSignSizeId = DEFAULT_EVENT_SIGN_SIZE,
): void {
  const lines = eventSignLines(text)
  if (lines.length === 0) return

  const font = signFontById(fontId)
  const size = signSizeById(sizeId)
  const fontSize = Math.round(Math.min(width, height) * size.canvasScale)
  const lineHeight = fontSize * 1.12

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${font.weight} ${fontSize}px ${font.family}`
  if (font.letterSpacing && 'letterSpacing' in ctx) {
    ctx.letterSpacing = font.letterSpacing
  }

  const maxLineW = lines.reduce((widest, line) => Math.max(widest, ctx.measureText(line).width), 0)
  const blockH = Math.max(lineHeight, (lines.length - 1) * lineHeight + fontSize * 0.2)
  const fitted = clampSignCenter(
    xPercent,
    yPercent,
    maxLineW / 2,
    blockH / 2,
    width,
    height,
    Math.round(width * 0.03),
  )
  const cx = (width * fitted.x) / 100
  const cy = (height * fitted.y) / 100
  const startY = cy - ((lines.length - 1) * lineHeight) / 2

  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = fontSize * 0.55
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, fontSize * 0.03)

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight
    ctx.strokeText(lines[i], cx, y)
    ctx.fillText(lines[i], cx, y)
  }
  ctx.restore()
}
