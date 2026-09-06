import { useState } from 'react';
import type { Category, Mode } from './data/frames';
import { FRAMES, CATEGORIES, CATEGORY_META } from './data/frames';
import FrameCard from './components/FrameCard';

const MODE_LABELS: Record<Mode, string> = {
  strip2: 'Tira 2',
  strip3: 'Tira 3',
};

const MODE_DIMS: Record<Mode, string> = {
  strip2: '700 × 1800 px',
  strip3: '1200 × 1800 px',
};

export default function App() {
  const [category, setCategory] = useState<Category>('all');
  const [mode, setMode] = useState<Mode>('strip2');
  const [signText, setSignText] = useState('Ana & Luis\n14 · Junio · 2026');

  const filtered = FRAMES.filter(f => category === 'all' || f.category === category);

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: '#0b0b0b', color: '#f0ece4', fontFamily: '"Outfit", system-ui, sans-serif' }}
    >
      {/* ---- Sidebar ---- */}
      <aside
        className="w-60 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderRight: '1px solid #1c1c1c', background: '#0e0e0e' }}
      >
        {/* Logo */}
        <div className="px-6 py-7 border-b" style={{ borderColor: '#1c1c1c' }}>
          <h1
            className="text-2xl tracking-tight"
            style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, color: '#c9a455' }}
          >
            FotoMirror
          </h1>
          <p className="text-[10px] mt-1 tracking-[0.22em] uppercase" style={{ color: '#484848' }}>
            Frame Catalog
          </p>
        </div>

        {/* Mode toggle */}
        <div className="px-5 pt-6 pb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: '#484848' }}>
            Formato
          </p>
          <div
            className="flex rounded-lg p-1 gap-1"
            style={{ background: '#111' }}
          >
            {(['strip2', 'strip3'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 text-xs py-2 rounded-md transition-all duration-200"
                style={{
                  background: mode === m ? '#c9a455' : 'transparent',
                  color: mode === m ? '#0b0b0b' : '#666',
                  fontWeight: mode === m ? 600 : 400,
                }}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: '#383838' }}>
            {MODE_DIMS[mode]}
          </p>
        </div>

        {/* Category filter */}
        <div className="px-5 py-4 border-t" style={{ borderColor: '#1a1a1a' }}>
          <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: '#484848' }}>
            Categoría
          </p>
          <div className="flex flex-col gap-0.5">
            {CATEGORIES.map(cat => {
              const isActive = category === cat.id;
              const meta = cat.id !== 'all' ? CATEGORY_META[cat.id] : null;
              const count = cat.id === 'all'
                ? FRAMES.length
                : FRAMES.filter(f => f.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="flex items-center justify-between text-left text-sm px-3 py-2.5 rounded-lg transition-all duration-150"
                  style={{
                    background: isActive ? '#191919' : 'transparent',
                    color: isActive ? (meta?.color ?? '#c9a455') : '#666',
                    border: isActive ? `1px solid ${meta?.color ?? '#c9a455'}28` : '1px solid transparent',
                  }}
                >
                  <span>{cat.label}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full tabular-nums"
                    style={{ background: '#1c1c1c', color: '#444' }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign text input */}
        <div className="px-5 py-4 border-t mt-auto" style={{ borderColor: '#1a1a1a' }}>
          <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: '#484848' }}>
            Texto del evento
          </p>
          <textarea
            value={signText}
            onChange={e => setSignText(e.target.value)}
            rows={3}
            placeholder={"Ej: Ana & Luis\n14 · Junio · 2026"}
            className="w-full text-sm rounded-lg px-3 py-2.5 resize-none transition-colors duration-200 placeholder-[#333]"
            style={{
              background: '#111',
              border: '1px solid #1e1e1e',
              color: '#f0ece4',
              outline: 'none',
              lineHeight: '1.5',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#c9a45540'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e'; }}
          />
          <p className="text-[10px] mt-2 leading-relaxed" style={{ color: '#383838' }}>
            Una línea por Enter · máx. 3 líneas
          </p>
        </div>
      </aside>

      {/* ---- Main ---- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="shrink-0 flex items-center justify-between px-8 py-4 border-b"
          style={{
            borderColor: '#1a1a1a',
            background: 'rgba(11,11,11,0.9)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div>
            <h2
              className="text-base font-light"
              style={{ fontFamily: '"Fraunces", Georgia, serif' }}
            >
              {category === 'all' ? 'Todos los marcos' : CATEGORY_META[category]?.label ?? 'Marcos'}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#484848' }}>
              {filtered.length} {filtered.length === 1 ? 'marco' : 'marcos'} · {MODE_DIMS[mode]}
            </p>
          </div>

          {/* Mode badge */}
          <div
            className="text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: '#1a1a1a', color: '#c9a455', border: '1px solid #2a2a2a' }}
          >
            {MODE_LABELS[mode]}
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p style={{ color: '#383838' }}>No hay marcos en esta categoría.</p>
            </div>
          ) : (
            <div
              className="grid gap-8"
              style={{
                gridTemplateColumns: mode === 'strip2'
                  ? 'repeat(auto-fill, minmax(160px, 220px))'
                  : 'repeat(auto-fill, minmax(240px, 300px))',
              }}
            >
              {filtered.map(frame => (
                <FrameCard
                  key={`${frame.id}-${mode}`}
                  frame={frame}
                  mode={mode}
                  signText={signText}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
