import { useState } from 'react';
import type { FrameConfig, Mode } from '../data/frames';
import { CATEGORY_META } from '../data/frames';
import FrameSVG from './FrameSVG';

interface Props {
  frame: FrameConfig;
  mode: Mode;
  signText: string;
}

export default function FrameCard({ frame, mode, signText }: Props) {
  const [hovered, setHovered] = useState(false);
  const meta = CATEGORY_META[frame.category];

  return (
    <div
      className="flex flex-col gap-3 group cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Frame preview */}
      <div
        className="rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: '#0f0f0f',
          border: hovered ? `1px solid ${meta.color}44` : '1px solid #1e1e1e',
          boxShadow: hovered ? `0 8px 40px ${meta.color}18` : '0 2px 12px rgba(0,0,0,0.4)',
        }}
      >
        <FrameSVG frame={frame} mode={mode} signText={signText} />
      </div>

      {/* Metadata */}
      <div className="px-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.label}
          </span>
        </div>
        <h3
          className="text-sm leading-snug transition-colors"
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            color: hovered ? meta.color : '#f0ece4',
            fontWeight: 400,
          }}
        >
          {frame.name}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>
          {frame.subtitle}
        </p>
      </div>
    </div>
  );
}
