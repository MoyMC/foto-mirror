import type { FrameConfig, Mode } from "../data/frames"

interface Props {
  frame: FrameConfig
  mode: Mode
  signText: string
}

// ---- Layout constants ----

// Strip 2 — 700 × 1800
const S2_W = 700,
  S2_H = 1800
const S2_PHOTOS = [
  { x: 70, y: 50, w: 560, h: 640 },
  { x: 70, y: 720, w: 560, h: 640 },
]
const S2_SIGN = { x: 70, y: 1400, w: 560, h: 320 }

// Strip 3 — 1200 × 1800
const S3_W = 1200,
  S3_H = 1800
const S3_PHOTOS = [
  { x: 180, y: 40, w: 840, h: 540 },
  { x: 180, y: 610, w: 840, h: 540 },
  { x: 180, y: 1180, w: 840, h: 540 },
]

// ---- Helpers ----

function PhotoSlot({
  x,
  y,
  w,
  h,
  tint,
  accent,
}: {
  x: number
  y: number
  w: number
  h: number
  tint: string
  accent: string
}) {
  const cx = x + w / 2,
    cy = y + h / 2
  const s = Math.min(w, h) * 0.075
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={tint} />
      <g transform={`translate(${cx},${cy})`} opacity={0.3}>
        <rect
          x={-s * 3.2}
          y={-s * 2.2}
          width={s * 6.4}
          height={s * 4.4}
          rx={s * 0.7}
          stroke={accent}
          strokeWidth={s * 0.4}
          fill="none"
        />
        <circle r={s * 1.5} stroke={accent} strokeWidth={s * 0.4} fill="none" />
        <rect
          x={-s * 1.1}
          y={-s * 3.2}
          width={s * 2.2}
          height={s}
          rx={s * 0.3}
          fill={accent}
          opacity={0.5}
        />
      </g>
    </g>
  )
}

function SignSlotH({
  slot,
  colors,
  signText,
  font,
}: {
  slot: { x: number y: number w: number h: number }
  colors: FrameConfig["colors"]
  signText: string
  font: string
}) {
  const lines = signText
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 3)
  const empty = lines.length === 0
  const displayLines = empty ? ["EVENT TEXT"] : lines
  const lineCount = displayLines.length
  const fontSize = lineCount === 1 ? 78 : lineCount === 2 ? 60 : 48
  const lineH = fontSize * 1.38
  const totalH = lineCount * lineH
  const y0 = slot.y + slot.h / 2 - totalH / 2 + fontSize * 0.85
  const cx = slot.x + slot.w / 2

  return (
    <g>
      <rect
        x={slot.x}
        y={slot.y}
        width={slot.w}
        height={slot.h}
        fill={colors.sign}
      />
      {displayLines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={y0 + i * lineH}
          textAnchor="middle"
          fontFamily={font}
          fontSize={fontSize}
          fill={colors.signText}
          opacity={empty ? 0.25 : 1}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

function SignSlotV({
  band,
  colors,
  signText,
  font,
}: {
  band: { x: number y: number w: number h: number }
  colors: FrameConfig["colors"]
  signText: string
  font: string
}) {
  const lines = signText
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 3)
  const empty = lines.length === 0
  const displayText = empty ? "EVENT TEXT" : lines.join(" · ")
  const bx = band.x + band.w / 2
  const by = band.y + band.h / 2

  return (
    <g>
      <rect
        x={band.x}
        y={band.y}
        width={band.w}
        height={band.h}
        fill={colors.sign}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={font}
        fontSize={60}
        fill={colors.signText}
        opacity={empty ? 0.25 : 1}
        transform={`rotate(-90,${bx},${by})`}
        x={bx}
        y={by}
      >
        {displayText}
      </text>
    </g>
  )
}

// ---- Decoration renderers ----

function BotanicalDecorS2({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent
  return (
    <g>
      {/* Double border */}
      <rect
        x={16}
        y={16}
        width={668}
        height={1768}
        fill="none"
        stroke={a}
        strokeWidth={3.5}
      />
      <rect
        x={24}
        y={24}
        width={652}
        height={1752}
        fill="none"
        stroke={a}
        strokeWidth={1.2}
        opacity={0.45}
      />

      {/* Corner dots */}
      {[
        [16, 16],
        [684, 16],
        [16, 1784],
        [684, 1784],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} fill={a} />
      ))}

      {/* Top-left leaf cluster */}
      <g transform="translate(44,44)">
        <path
          d="M0,0 C-10,-16-8,-36 0,-52 C8,-36 10,-16 0,0"
          fill={a}
          opacity={0.65}
          transform="rotate(-40)"
        />
        <path
          d="M0,0 C-10,-14-8,-30 0,-44 C8,-14 10,-14 0,0"
          fill={a}
          opacity={0.45}
          transform="rotate(-80)"
        />
        <line
          x1={0}
          y1={0}
          x2={-26}
          y2={-26}
          stroke={a}
          strokeWidth={1.5}
          opacity={0.4}
        />
      </g>

      {/* Top-right leaf cluster */}
      <g transform="translate(656,44)">
        <path
          d="M0,0 C10,-16 8,-36 0,-52 C-8,-36-10,-16 0,0"
          fill={a}
          opacity={0.65}
          transform="rotate(40)"
        />
        <path
          d="M0,0 C10,-14 8,-30 0,-44 C-8,-14-10,-14 0,0"
          fill={a}
          opacity={0.45}
          transform="rotate(80)"
        />
        <line
          x1={0}
          y1={0}
          x2={26}
          y2={-26}
          stroke={a}
          strokeWidth={1.5}
          opacity={0.4}
        />
      </g>

      {/* Bottom-left */}
      <g transform="translate(44,1756)">
        <path
          d="M0,0 C-10,16-8,36 0,52 C8,36 10,16 0,0"
          fill={a}
          opacity={0.65}
          transform="rotate(40)"
        />
        <path
          d="M0,0 C-10,14-8,30 0,44 C8,14 10,14 0,0"
          fill={a}
          opacity={0.45}
          transform="rotate(80)"
        />
        <line
          x1={0}
          y1={0}
          x2={-26}
          y2={26}
          stroke={a}
          strokeWidth={1.5}
          opacity={0.4}
        />
      </g>

      {/* Bottom-right */}
      <g transform="translate(656,1756)">
        <path
          d="M0,0 C10,16 8,36 0,52 C-8,36-10,16 0,0"
          fill={a}
          opacity={0.65}
          transform="rotate(-40)"
        />
        <path
          d="M0,0 C10,14 8,30 0,44 C-8,14-10,14 0,0"
          fill={a}
          opacity={0.45}
          transform="rotate(-80)"
        />
        <line
          x1={0}
          y1={0}
          x2={26}
          y2={26}
          stroke={a}
          strokeWidth={1.5}
          opacity={0.4}
        />
      </g>

      {/* Small side ornaments */}
      <g transform="translate(35,900)">
        <circle r={4} fill={a} opacity={0.5} />
        <line
          x1={0}
          y1={-30}
          x2={0}
          y2={30}
          stroke={a}
          strokeWidth={1}
          opacity={0.35}
        />
      </g>
      <g transform="translate(665,900)">
        <circle r={4} fill={a} opacity={0.5} />
        <line
          x1={0}
          y1={-30}
          x2={0}
          y2={30}
          stroke={a}
          strokeWidth={1}
          opacity={0.35}
        />
      </g>
    </g>
  )
}

function BotanicalDecorS3({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent
  return (
    <g>
      {/* Center area border */}
      <rect
        x={168}
        y={28}
        width={864}
        height={1744}
        fill="none"
        stroke={a}
        strokeWidth={2}
        opacity={0.4}
      />

      {/* Left band top ornament */}
      <g transform="translate(80,80)">
        <path
          d="M0,0 C-12,-20-10,-44 0,-64 C10,-44 12,-20 0,0"
          fill={a}
          opacity={0.6}
        />
        <path
          d="M0,0 C-14,-18-12,-38 0,-54 C12,-18 14,-18 0,0"
          fill={a}
          opacity={0.4}
          transform="rotate(-60)"
        />
        <path
          d="M0,0 C14,-18 12,-38 0,-54 C-12,-18-14,-18 0,0"
          fill={a}
          opacity={0.4}
          transform="rotate(60)"
        />
      </g>

      {/* Left band bottom ornament */}
      <g transform="translate(80,1720)">
        <path
          d="M0,0 C-12,20-10,44 0,64 C10,44 12,20 0,0"
          fill={a}
          opacity={0.6}
        />
        <path
          d="M0,0 C-14,18-12,38 0,54 C12,18 14,18 0,0"
          fill={a}
          opacity={0.4}
          transform="rotate(60)"
        />
        <path
          d="M0,0 C14,18 12,38 0,54 C-12,18-14,18 0,0"
          fill={a}
          opacity={0.4}
          transform="rotate(-60)"
        />
      </g>

      {/* Left band vertical vine */}
      <path
        d="M 80,120 Q 60,300 80,480 Q 100,660 80,840 Q 60,1020 80,1200 Q 100,1380 80,1560 Q 60,1680 80,1700"
        stroke={a}
        strokeWidth={1.5}
        fill="none"
        opacity={0.3}
      />

      {/* Left band small leaves along vine */}
      {[240, 480, 720, 960, 1200, 1440].map((y, i) => (
        <g key={y} transform={`translate(80,${y})`}>
          <path
            d={
              i % 2 === 0
                ? "M0,0 C-18,-8-30,-2-28,12 C-10,10 0,0 0,0"
                : "M0,0 C18,-8 30,-2 28,12 C10,10 0,0 0,0"
            }
            fill={a}
            opacity={0.4}
          />
        </g>
      ))}

      {/* Outer border */}
      <rect
        x={14}
        y={14}
        width={1172}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={3}
      />
      <rect
        x={22}
        y={22}
        width={1156}
        height={1756}
        fill="none"
        stroke={a}
        strokeWidth={1}
        opacity={0.4}
      />
    </g>
  )
}

const STAR_D =
  "M0,-1 L0.225,-0.309 L0.951,-0.309 L0.363,0.118 L0.588,0.809 L0,0.382 L-0.588,0.809 L-0.363,0.118 L-0.951,-0.309 L-0.225,-0.309 Z"

function StarsDecorS2({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent,
    a2 = c.accent2
  const stars: [number, number, number, string, number][] = [
    [35, 80, 28, a, 0.9],
    [35, 180, 18, a2, 0.6],
    [20, 300, 12, a, 0.5],
    [50, 420, 22, a, 0.75],
    [25, 520, 14, a2, 0.5],
    [665, 100, 26, a, 0.85],
    [680, 220, 16, a2, 0.6],
    [658, 360, 20, a, 0.7],
    [35, 700, 10, a, 0.4],
    [665, 680, 10, a, 0.4],
    [35, 900, 24, a, 0.8],
    [665, 920, 20, a2, 0.65],
    [50, 1100, 14, a, 0.5],
    [650, 1080, 18, a, 0.6],
    [35, 1200, 20, a, 0.7],
    [665, 1200, 22, a, 0.75],
    [20, 1340, 12, a2, 0.45],
  ]

  return (
    <g>
      {/* Border */}
      <rect
        x={14}
        y={14}
        width={672}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={2.5}
      />
      <rect
        x={22}
        y={22}
        width={656}
        height={1756}
        fill="none"
        stroke={a}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Stars */}
      {stars.map(([cx, cy, r, fill, op], i) => (
        <path
          key={i}
          d={STAR_D}
          fill={fill}
          opacity={op}
          transform={`translate(${cx},${cy}) scale(${r})`}
        />
      ))}

      {/* Crown at top center */}
      <g transform="translate(350,32)" opacity={0.75}>
        <polygon points="0,-22 -8,-8 -24,-14 -18,0 18,0 24,-14 8,-8" fill={a} />
        <rect x={-18} y={0} width={36} height={6} rx={2} fill={a} />
        {[-8, 0, 8].map((x, i) => (
          <circle key={i} cx={x} cy={-22 + Math.abs(x) * 0.5} r={3} fill={a} />
        ))}
      </g>

      {/* Dot grid in margins */}
      {[130, 260, 390, 520, 650, 780, 910, 1040, 1170, 1300].map((y, i) => (
        <g key={y}>
          <circle
            cx={35}
            cy={y}
            r={2.5}
            fill={a}
            opacity={0.3 + (i % 3) * 0.1}
          />
          <circle
            cx={665}
            cy={y}
            r={2.5}
            fill={a}
            opacity={0.3 + (i % 3) * 0.1}
          />
        </g>
      ))}
    </g>
  )
}

function StarsDecorS3({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent,
    a2 = c.accent2
  const leftStars: [number, number, number, string, number][] = [
    [80, 100, 28, a, 0.9],
    [55, 220, 18, a2, 0.6],
    [100, 360, 16, a, 0.7],
    [70, 500, 22, a, 0.8],
    [50, 660, 14, a2, 0.5],
    [90, 820, 20, a, 0.75],
    [65, 980, 16, a, 0.6],
    [80, 1140, 24, a, 0.85],
    [55, 1300, 12, a2, 0.45],
    [90, 1460, 18, a, 0.65],
    [70, 1620, 20, a, 0.7],
  ]
  return (
    <g>
      <rect
        x={14}
        y={14}
        width={1172}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={2.5}
      />
      <rect
        x={22}
        y={22}
        width={1156}
        height={1756}
        fill="none"
        stroke={a}
        strokeWidth={1}
        opacity={0.35}
      />
      {leftStars.map(([cx, cy, r, fill, op], i) => (
        <path
          key={i}
          d={STAR_D}
          fill={fill}
          opacity={op}
          transform={`translate(${cx},${cy}) scale(${r})`}
        />
      ))}
      {leftStars.map(([, cy, r, fill, op], i) => (
        <path
          key={`r${i}`}
          d={STAR_D}
          fill={fill}
          opacity={op}
          transform={`translate(${1200 - leftStars[i][0]},${cy}) scale(${r})`}
        />
      ))}
      <g transform="translate(600,60)" opacity={0.8}>
        <polygon
          points="0,-28 -10,-10 -30,-18 -22,0 22,0 30,-18 10,-10"
          fill={a}
        />
        <rect x={-22} y={0} width={44} height={8} rx={2} fill={a} />
      </g>
    </g>
  )
}

const CONFETTI_SHAPES = [
  "rect",
  "circle",
  "diamond",
  "rect",
  "circle",
  "rect",
  "diamond",
]

function ConfettiPiece({
  x,
  y,
  size,
  angle,
  shape,
  color,
  opacity,
}: {
  x: number
  y: number
  size: number
  angle: number
  shape: string
  color: string
  opacity: number
}) {
  if (shape === "circle")
    return (
      <circle cx={x} cy={y} r={size * 0.6} fill={color} opacity={opacity} />
    )
  if (shape === "diamond")
    return (
      <polygon
        points={`${x},${y - size} ${x + size * 0.7},${y} ${x},${y + size} ${x - size * 0.7},${y}`}
        fill={color}
        opacity={opacity}
        transform={`rotate(${angle},${x},${y})`}
      />
    )
  return (
    <rect
      x={x - size * 0.6}
      y={y - size * 0.4}
      width={size * 1.2}
      height={size * 0.8}
      rx={size * 0.15}
      fill={color}
      opacity={opacity}
      transform={`rotate(${angle},${x},${y})`}
    />
  )
}

function ConfettiDecorS2({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent,
    a2 = c.accent2
  const pieces: [number, number, number, number, string, string, number][] = [
    [25, 80, 12, -30, "rect", a, 0.8],
    [50, 140, 8, 45, "circle", a2, 0.6],
    [30, 200, 14, 15, "diamond", a, 0.7],
    [55, 270, 10, -60, "rect", a2, 0.55],
    [20, 350, 12, 80, "circle", a, 0.65],
    [45, 430, 14, -15, "diamond", a, 0.8],
    [30, 510, 9, 35, "rect", a2, 0.5],
    [55, 600, 13, -45, "circle", a, 0.7],
    [675, 90, 11, 20, "diamond", a, 0.75],
    [650, 170, 13, -40, "rect", a2, 0.6],
    [680, 250, 9, 55, "circle", a, 0.65],
    [655, 340, 14, -25, "rect", a, 0.8],
    [670, 450, 10, 70, "diamond", a2, 0.55],
    [648, 550, 12, -50, "circle", a, 0.7],
    [30, 770, 10, 30, "rect", a2, 0.5],
    [670, 790, 11, -35, "rect", a, 0.6],
    [25, 950, 13, 60, "diamond", a, 0.7],
    [675, 980, 9, -20, "circle", a2, 0.55],
    [40, 1100, 11, 45, "circle", a, 0.65],
    [660, 1120, 13, -60, "diamond", a, 0.75],
    [30, 1250, 10, 25, "rect", a2, 0.5],
    [670, 1270, 12, -40, "rect", a, 0.6],
  ]

  return (
    <g>
      <rect
        x={14}
        y={14}
        width={672}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={2.5}
      />
      {pieces.map(([x, y, size, angle, shape, color, opacity], i) => (
        <ConfettiPiece
          key={i}
          x={x}
          y={y}
          size={size}
          angle={angle}
          shape={shape}
          color={color}
          opacity={opacity}
        />
      ))}
      {/* Diagonal line accents at top */}
      <line
        x1={20}
        y1={20}
        x2={70}
        y2={50}
        stroke={a}
        strokeWidth={2}
        opacity={0.5}
      />
      <line
        x1={630}
        y1={50}
        x2={680}
        y2={20}
        stroke={a}
        strokeWidth={2}
        opacity={0.5}
      />
    </g>
  )
}

function ConfettiDecorS3({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent,
    a2 = c.accent2
  const pieces: [number, number, number, number, string, string, number][] = [
    [80, 100, 14, -30, "rect", a, 0.8],
    [55, 200, 10, 45, "circle", a2, 0.65],
    [100, 320, 13, 15, "diamond", a, 0.75],
    [60, 440, 11, -55, "rect", a2, 0.55],
    [90, 560, 14, 30, "circle", a, 0.7],
    [50, 680, 10, -25, "diamond", a, 0.65],
    [80, 800, 13, 60, "rect", a2, 0.6],
    [60, 920, 12, -40, "circle", a, 0.75],
    [90, 1040, 10, 20, "diamond", a, 0.65],
    [55, 1160, 14, -60, "rect", a2, 0.6],
    [80, 1280, 11, 35, "circle", a, 0.7],
    [60, 1400, 13, -15, "diamond", a, 0.65],
    [85, 1520, 10, 50, "rect", a2, 0.55],
    [55, 1640, 12, -35, "circle", a, 0.7],
  ]

  return (
    <g>
      <rect
        x={14}
        y={14}
        width={1172}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={2.5}
      />
      {pieces.map(([x, y, size, angle, shape, color, opacity], i) => (
        <ConfettiPiece
          key={i}
          x={x}
          y={y}
          size={size}
          angle={angle}
          shape={shape}
          color={color}
          opacity={opacity}
        />
      ))}
      {pieces.map(([x, y, size, angle, shape, color, opacity], i) => (
        <ConfettiPiece
          key={`r${i}`}
          x={1200 - x}
          y={y}
          size={size}
          angle={-angle}
          shape={shape}
          color={color}
          opacity={opacity}
        />
      ))}
    </g>
  )
}

function ArtDecoDecorS2({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent
  return (
    <g>
      {/* Triple border */}
      <rect
        x={12}
        y={12}
        width={676}
        height={1776}
        fill="none"
        stroke={a}
        strokeWidth={4}
      />
      <rect
        x={20}
        y={20}
        width={660}
        height={1760}
        fill="none"
        stroke={a}
        strokeWidth={1}
        opacity={0.5}
      />
      <rect
        x={28}
        y={28}
        width={644}
        height={1744}
        fill="none"
        stroke={a}
        strokeWidth={0.7}
        opacity={0.3}
      />

      {/* Top center fan */}
      <g transform="translate(350,36)" opacity={0.85}>
        {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((angle, i) => (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={0}
            y2={-32}
            stroke={a}
            strokeWidth={2.5}
            transform={`rotate(${angle})`}
            opacity={1 - Math.abs(angle) / 80}
          />
        ))}
        <line x1={-40} y1={0} x2={40} y2={0} stroke={a} strokeWidth={1.5} />
      </g>

      {/* Bottom center fan */}
      <g transform="translate(350,1764)" opacity={0.85}>
        {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((angle, i) => (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={0}
            y2={32}
            stroke={a}
            strokeWidth={2.5}
            transform={`rotate(${angle})`}
            opacity={1 - Math.abs(angle) / 80}
          />
        ))}
        <line x1={-40} y1={0} x2={40} y2={0} stroke={a} strokeWidth={1.5} />
      </g>

      {/* Corner geometric ornaments */}
      {[
        [40, 40, 1, 1],
        [660, 40, -1, 1],
        [40, 1760, 1, -1],
        [660, 1760, -1, -1],
      ].map(([cx, cy, sx, sy], i) => (
        <g key={i} transform={`translate(${cx},${cy}) scale(${sx},${sy})`}>
          <line x1={0} y1={0} x2={0} y2={-30} stroke={a} strokeWidth={2} />
          <line x1={0} y1={0} x2={30} y2={0} stroke={a} strokeWidth={2} />
          <line
            x1={0}
            y1={0}
            x2={22}
            y2={-22}
            stroke={a}
            strokeWidth={1}
            opacity={0.5}
          />
          <circle cx={0} cy={0} r={4} fill={a} />
        </g>
      ))}

      {/* Side diamonds */}
      <polygon points="35,900 22,912 35,924 48,912" fill={a} opacity={0.7} />
      <polygon
        points="665,900 652,912 665,924 678,912"
        fill={a}
        opacity={0.7}
      />
    </g>
  )
}

function ArtDecoDecorS3({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent
  return (
    <g>
      <rect
        x={12}
        y={12}
        width={1176}
        height={1776}
        fill="none"
        stroke={a}
        strokeWidth={4}
      />
      <rect
        x={20}
        y={20}
        width={1160}
        height={1760}
        fill="none"
        stroke={a}
        strokeWidth={1}
        opacity={0.45}
      />
      <rect
        x={28}
        y={28}
        width={1144}
        height={1744}
        fill="none"
        stroke={a}
        strokeWidth={0.7}
        opacity={0.28}
      />

      {/* Left band ornaments */}
      {[80, 900, 1720].map((y, i) => (
        <g key={i} transform={`translate(80,${y})`}>
          {[-50, -37, -24, -12, 0, 12, 24, 37, 50].map((angle, j) => (
            <line
              key={j}
              x1={0}
              y1={0}
              x2={0}
              y2={i === 1 ? -38 : i === 0 ? -30 : 30}
              stroke={a}
              strokeWidth={2}
              transform={`rotate(${angle + (i === 2 ? 180 : 0)})`}
              opacity={1 - Math.abs(angle) / 65}
            />
          ))}
          <line
            x1={-40}
            y1={0}
            x2={40}
            y2={0}
            stroke={a}
            strokeWidth={1.2}
            opacity={0.5}
          />
        </g>
      ))}

      {/* Corner ornaments */}
      {[
        [20, 20, 1, 1],
        [1180, 20, -1, 1],
        [20, 1780, 1, -1],
        [1180, 1780, -1, -1],
      ].map(([cx, cy, sx, sy], i) => (
        <g key={i} transform={`translate(${cx},${cy}) scale(${sx},${sy})`}>
          <line x1={0} y1={0} x2={0} y2={-36} stroke={a} strokeWidth={2.5} />
          <line x1={0} y1={0} x2={36} y2={0} stroke={a} strokeWidth={2.5} />
          <circle cx={0} cy={0} r={5} fill={a} />
        </g>
      ))}

      {/* Diamonds along left band */}
      {[360, 720, 1080, 1440].map((y) => (
        <polygon
          key={y}
          points={`80,${y - 14} 66,${y} 80,${y + 14} 94,${y}`}
          fill={a}
          opacity={0.6}
        />
      ))}
    </g>
  )
}

function NeonDecorS2({
  c,
  frameId,
}: {
  c: FrameConfig["colors"]
  frameId: string
}) {
  const a = c.accent,
    a2 = c.accent2
  const filterId = `neon-${frameId}-s2`
  return (
    <g>
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer neon border */}
      <rect
        x={14}
        y={14}
        width={672}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={3}
        filter={`url(#${filterId})`}
      />
      <rect
        x={14}
        y={14}
        width={672}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={1.5}
      />

      {/* Inner accent border */}
      <rect
        x={24}
        y={24}
        width={652}
        height={1752}
        fill="none"
        stroke={a2}
        strokeWidth={1}
        opacity={0.6}
        filter={`url(#${filterId})`}
      />

      {/* Corner neon accents */}
      {[
        [14, 14],
        [686, 14],
        [14, 1786],
        [686, 1786],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={8}
          fill={i % 2 === 0 ? a : a2}
          filter={`url(#${filterId})`}
        />
      ))}

      {/* Mid-side neon dashes */}
      {[
        [14, 900],
        [686, 900],
      ].map(([x, y], i) => (
        <g key={i}>
          <line
            x1={x}
            y1={y - 40}
            x2={x}
            y2={y + 40}
            stroke={i === 0 ? a : a2}
            strokeWidth={3}
            filter={`url(#${filterId})`}
          />
        </g>
      ))}

      {/* Diagonal corner lines */}
      <line
        x1={14}
        y1={50}
        x2={70}
        y2={14}
        stroke={a}
        strokeWidth={2}
        filter={`url(#${filterId})`}
      />
      <line
        x1={630}
        y1={14}
        x2={686}
        y2={50}
        stroke={a2}
        strokeWidth={2}
        filter={`url(#${filterId})`}
      />
      <line
        x1={14}
        y1={1750}
        x2={70}
        y2={1786}
        stroke={a2}
        strokeWidth={2}
        filter={`url(#${filterId})`}
      />
      <line
        x1={630}
        y1={1786}
        x2={686}
        y2={1750}
        stroke={a}
        strokeWidth={2}
        filter={`url(#${filterId})`}
      />
    </g>
  )
}

function NeonDecorS3({
  c,
  frameId,
}: {
  c: FrameConfig["colors"]
  frameId: string
}) {
  const a = c.accent,
    a2 = c.accent2
  const filterId = `neon-${frameId}-s3`
  return (
    <g>
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x={14}
        y={14}
        width={1172}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={3}
        filter={`url(#${filterId})`}
      />
      <rect
        x={14}
        y={14}
        width={1172}
        height={1772}
        fill="none"
        stroke={a}
        strokeWidth={1.5}
      />
      <rect
        x={24}
        y={24}
        width={1152}
        height={1752}
        fill="none"
        stroke={a2}
        strokeWidth={1}
        opacity={0.6}
        filter={`url(#${filterId})`}
      />
      {[
        [14, 14],
        [1186, 14],
        [14, 1786],
        [1186, 1786],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={10}
          fill={i % 2 === 0 ? a : a2}
          filter={`url(#${filterId})`}
        />
      ))}
      {[360, 900, 1440].map((y) => (
        <g key={y}>
          <circle cx={14} cy={y} r={6} fill={a} filter={`url(#${filterId})`} />
          <circle
            cx={1186}
            cy={y}
            r={6}
            fill={a2}
            filter={`url(#${filterId})`}
          />
        </g>
      ))}
    </g>
  )
}

function MinimalDecorS2({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent
  return (
    <g>
      {/* Clean single border */}
      <rect
        x={16}
        y={16}
        width={668}
        height={1768}
        fill="none"
        stroke={a}
        strokeWidth={3}
      />

      {/* Top accent bar */}
      <rect x={16} y={16} width={668} height={8} fill={a} />

      {/* Bottom accent bar */}
      <rect x={16} y={1776} width={668} height={8} fill={a} />

      {/* Thin rule above sign slot */}
      <line
        x1={50}
        y1={1390}
        x2={650}
        y2={1390}
        stroke={a}
        strokeWidth={1.5}
        opacity={0.5}
      />

      {/* Corner squares */}
      {[
        [16, 16],
        [674, 16],
        [16, 1774],
        [674, 1774],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 4} y={y - 4} width={8} height={8} fill={a} />
      ))}

      {/* Logo placeholder in top margin */}
      <rect
        x={290}
        y={26}
        width={120}
        height={20}
        rx={3}
        fill={a}
        opacity={0.15}
      />
      <text
        x={350}
        y={42}
        textAnchor="middle"
        fontFamily="Outfit, sans-serif"
        fontSize={14}
        fill={a}
        opacity={0.4}
        letterSpacing={3}
      >
        BRAND
      </text>
    </g>
  )
}

function MinimalDecorS3({ c }: { c: FrameConfig["colors"] }) {
  const a = c.accent
  return (
    <g>
      <rect
        x={16}
        y={16}
        width={1168}
        height={1768}
        fill="none"
        stroke={a}
        strokeWidth={3}
      />
      {/* Side accent bars */}
      <rect x={16} y={16} width={8} height={1768} fill={a} />
      <rect x={1176} y={16} width={8} height={1768} fill={a} />
      {/* Top/bottom bars */}
      <rect x={16} y={16} width={1168} height={6} fill={a} />
      <rect x={16} y={1778} width={1168} height={6} fill={a} />
      {/* Thin vertical dividers between photos and bands */}
      <line
        x1={172}
        y1={30}
        x2={172}
        y2={1770}
        stroke={a}
        strokeWidth={1}
        opacity={0.3}
      />
      <line
        x1={1028}
        y1={30}
        x2={1028}
        y2={1770}
        stroke={a}
        strokeWidth={1}
        opacity={0.3}
      />
      {/* Corner squares */}
      {[
        [16, 16],
        [1176, 16],
        [16, 1778],
        [1176, 1778],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width={6} height={6} fill={a} />
      ))}
    </g>
  )
}

// ---- Sign font per decoration ----
const SIGN_FONT: Record<string, string> = {
  botanical: '"Playfair Display", Georgia, serif',
  stars: '"Great Vibes", cursive',
  confetti: '"Outfit", sans-serif',
  neon: '"Outfit", sans-serif',
  artdeco: '"Playfair Display", Georgia, serif',
  minimal: '"Outfit", sans-serif',
}

// ---- Main component ----

export default function FrameSVG({ frame, mode, signText }: Props) {
  const { colors, decoration, id } = frame
  const font = SIGN_FONT[decoration]
  const text = signText || frame.defaultText

  if (mode === "strip2") {
    return (
      <svg
        viewBox={`0 0 ${S2_W} ${S2_H}`}
        width="100%"
        style={{ display: "block", aspectRatio: `${S2_W}/${S2_H}` }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Frame background */}
        <rect width={S2_W} height={S2_H} fill={colors.frame} />

        {/* Back-layer decoration */}
        {decoration === "botanical" && <BotanicalDecorS2 c={colors} />}
        {decoration === "stars" && <StarsDecorS2 c={colors} />}
        {decoration === "confetti" && <ConfettiDecorS2 c={colors} />}
        {decoration === "artdeco" && <ArtDecoDecorS2 c={colors} />}
        {decoration === "neon" && <NeonDecorS2 c={colors} frameId={id} />}
        {decoration === "minimal" && <MinimalDecorS2 c={colors} />}

        {/* Photo slots */}
        {S2_PHOTOS.map((slot, i) => (
          <PhotoSlot
            key={i}
            {...slot}
            tint={colors.photoTint}
            accent={colors.accent}
          />
        ))}

        {/* Sign slot */}
        <SignSlotH slot={S2_SIGN} colors={colors} signText={text} font={font} />
      </svg>
    )
  }

  // Strip 3
  const LEFT_BAND = { x: 0, y: 0, w: 160, h: S3_H }
  const RIGHT_BAND = { x: 1040, y: 0, w: 160, h: S3_H }

  return (
    <svg
      viewBox={`0 0 ${S3_W} ${S3_H}`}
      width="100%"
      style={{ display: "block", aspectRatio: `${S3_W}/${S3_H}` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Frame background */}
      <rect width={S3_W} height={S3_H} fill={colors.frame} />

      {/* Side bands bg */}
      <rect
        x={LEFT_BAND.x}
        y={LEFT_BAND.y}
        width={LEFT_BAND.w}
        height={LEFT_BAND.h}
        fill={colors.sign}
        opacity={0.6}
      />
      <rect
        x={RIGHT_BAND.x}
        y={RIGHT_BAND.y}
        width={RIGHT_BAND.w}
        height={RIGHT_BAND.h}
        fill={colors.sign}
      />

      {/* Back-layer decoration */}
      {decoration === "botanical" && <BotanicalDecorS3 c={colors} />}
      {decoration === "stars" && <StarsDecorS3 c={colors} />}
      {decoration === "confetti" && <ConfettiDecorS3 c={colors} />}
      {decoration === "artdeco" && <ArtDecoDecorS3 c={colors} />}
      {decoration === "neon" && <NeonDecorS3 c={colors} frameId={id} />}
      {decoration === "minimal" && <MinimalDecorS3 c={colors} />}

      {/* Photo slots */}
      {S3_PHOTOS.map((slot, i) => (
        <PhotoSlot
          key={i}
          {...slot}
          tint={colors.photoTint}
          accent={colors.accent}
        />
      ))}

      {/* Sign slot — vertical in right band */}
      <SignSlotV
        band={RIGHT_BAND}
        colors={colors}
        signText={text}
        font={font}
      />
    </svg>
  )
}
