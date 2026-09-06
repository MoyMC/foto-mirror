import { useState } from 'react'
import type { AppConfig, FilterPreset, PhotoMode } from '../types'
import { poseCountForMode } from '../lib/photoMode'
import { FilterBar } from './FilterBar'

export const COUNTDOWN_OPTIONS = [3, 5, 7, 10] as const

type RailPanel = 'photo-mode' | 'filters' | 'seconds' | 'strip-0' | 'strip-1' | 'strip-2' | null

const PHOTO_MODE_OPTIONS: { mode: PhotoMode; label: string }[] = [
  { mode: 'individual', label: '1 Foto' },
  { mode: 'strip2', label: 'Tira 2' },
  { mode: 'strip3', label: 'Tira 3' },
]

interface IdleScreenProps {
  config: AppConfig
  filters: FilterPreset[]
  filterThumbnails: Record<string, string>
  isReady: boolean
  photoMode: PhotoMode
  activeFilterId: string
  stripFilterIds: [string, string, string]
  countdownSeconds: number
  onPhotoModeChange: (mode: PhotoMode) => void
  onFilterChange: (id: string) => void
  onStripFilterChange: (index: 0 | 1 | 2, id: string) => void
  onCountdownChange: (seconds: number) => void
  onStart: () => void
  onInteraction?: () => void
}

function PhotoModeIcon({ mode }: { mode: PhotoMode }) {
  if (mode === 'strip2') {
    return (
      <svg className="idle__rail-icon" viewBox="0 0 24 24" aria-hidden>
        <rect x="6" y="4" width="12" height="7" rx="1.2" fill="currentColor" />
        <rect x="6" y="13" width="12" height="7" rx="1.2" fill="currentColor" />
      </svg>
    )
  }
  if (mode === 'strip3') {
    return (
      <svg className="idle__rail-icon" viewBox="0 0 24 24" aria-hidden>
        <rect x="6" y="3" width="12" height="5" rx="1.2" fill="currentColor" />
        <rect x="6" y="9.5" width="12" height="5" rx="1.2" fill="currentColor" />
        <rect x="6" y="16" width="12" height="5" rx="1.2" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="idle__rail-icon" viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="11" r="3.5" fill="currentColor" />
    </svg>
  )
}

export function IdleScreen({
  config,
  filters,
  filterThumbnails,
  isReady,
  photoMode,
  activeFilterId,
  stripFilterIds,
  countdownSeconds,
  onPhotoModeChange,
  onFilterChange,
  onStripFilterChange,
  onCountdownChange,
  onStart,
  onInteraction,
}: IdleScreenProps) {
  const [openPanel, setOpenPanel] = useState<RailPanel>(null)

  const togglePanel = (panel: Exclude<RailPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  const photoModeLabel =
    photoMode === 'individual' ? '1 Foto' : photoMode === 'strip2' ? 'Tira 2' : 'Tira 3'
  const poseCount = poseCountForMode(photoMode)

  const stripPanelIndex =
    openPanel === 'strip-0' ? 0 : openPanel === 'strip-1' ? 1 : openPanel === 'strip-2' ? 2 : null

  return (
    <div className="screen screen--idle" onPointerDown={onInteraction}>
      <div className="screen__overlay" />
      <div className="idle__hero">
        <p className="idle__sub">
          {photoMode === 'strip2'
            ? 'Tira de 2: dos poses · al imprimir espera otra tira'
            : photoMode === 'strip3'
              ? 'Tira de 3: tres poses en una hoja completa'
              : 'Posa frente al espejo y captura el momento'}
        </p>
      </div>

      <aside className="idle__rail" aria-label="Opciones">
        <div
          className={`idle__flyout${openPanel ? ' idle__flyout--open' : ''}`}
          data-panel={openPanel ?? undefined}
        >
          <div className="idle__flyout-inner">
            {openPanel === 'photo-mode' && (
              <div className="idle__photo-mode" role="listbox" aria-label="Tipo de foto">
                {PHOTO_MODE_OPTIONS.map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    role="option"
                    aria-selected={photoMode === mode}
                    className={`idle__photo-mode-option${photoMode === mode ? ' idle__photo-mode-option--active' : ''}`}
                    onClick={() => {
                      onPhotoModeChange(mode)
                      setOpenPanel(null)
                    }}
                  >
                    <PhotoModeIcon mode={mode} />
                    <span className="idle__photo-mode-label">{label}</span>
                  </button>
                ))}
              </div>
            )}
            {openPanel === 'filters' && (
              <FilterBar
                filters={filters}
                activeFilterId={activeFilterId}
                thumbnails={filterThumbnails}
                orientation="vertical"
                onFilterChange={(id) => {
                  onFilterChange(id)
                  setOpenPanel(null)
                }}
              />
            )}
            {stripPanelIndex !== null && stripPanelIndex < poseCount && (
              <FilterBar
                filters={filters}
                activeFilterId={stripFilterIds[stripPanelIndex]}
                thumbnails={filterThumbnails}
                orientation="vertical"
                onFilterChange={(id) => {
                  onStripFilterChange(stripPanelIndex, id)
                  setOpenPanel(null)
                }}
              />
            )}
            {openPanel === 'seconds' && (
              <div className="idle__seconds" role="listbox" aria-label="Segundos de cuenta regresiva">
                {COUNTDOWN_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    role="option"
                    aria-selected={countdownSeconds === sec}
                    className={`idle__seconds-option${countdownSeconds === sec ? ' idle__seconds-option--active' : ''}`}
                    onClick={() => {
                      onCountdownChange(sec)
                      setOpenPanel(null)
                    }}
                  >
                    <span className="idle__seconds-value">{sec}</span>
                    <span className="idle__seconds-unit">seg</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="idle__rail-btns">
          <button
            type="button"
            className={`idle__rail-btn${openPanel === 'photo-mode' ? ' idle__rail-btn--active' : ''}`}
            aria-expanded={openPanel === 'photo-mode'}
            aria-label={`Tipo de foto: ${photoModeLabel}`}
            onClick={() => togglePanel('photo-mode')}
          >
            <PhotoModeIcon mode={photoMode} />
            <span className="idle__rail-label">{photoModeLabel}</span>
          </button>

          {photoMode === 'individual' ? (
            <button
              type="button"
              className={`idle__rail-btn${openPanel === 'filters' ? ' idle__rail-btn--active' : ''}`}
              aria-expanded={openPanel === 'filters'}
              aria-label="Filtros"
              onClick={() => togglePanel('filters')}
            >
              <svg className="idle__rail-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v1.17a2 2 0 0 1-.586 1.414l-4.828 4.828A2 2 0 0 0 14 14.328V18a1 1 0 0 1-.553.894l-3 1.5A1 1 0 0 1 9 19.5v-5.172a2 2 0 0 0-.586-1.414L3.586 8.086A2 2 0 0 1 3 6.672V5.5Z"
                />
              </svg>
              <span className="idle__rail-label">Filtros</span>
            </button>
          ) : (
            (Array.from({ length: poseCount }, (_, i) => i) as Array<0 | 1 | 2>).map((index) => {
              const panel = `strip-${index}` as const
              const isOpen = openPanel === panel
              return (
                <button
                  key={panel}
                  type="button"
                  className={`idle__rail-btn${isOpen ? ' idle__rail-btn--active' : ''}`}
                  aria-expanded={isOpen}
                  aria-label={`Filtro foto ${index + 1}`}
                  onClick={() => togglePanel(panel)}
                >
                  <span className="idle__rail-seconds">{index + 1}</span>
                  <span className="idle__rail-label">Filtro</span>
                </button>
              )
            })
          )}

          <button
            type="button"
            className={`idle__rail-btn${openPanel === 'seconds' ? ' idle__rail-btn--active' : ''}`}
            aria-expanded={openPanel === 'seconds'}
            aria-label={`Segundos: ${countdownSeconds}`}
            onClick={() => togglePanel('seconds')}
          >
            <span className="idle__rail-seconds">{countdownSeconds}</span>
            <span className="idle__rail-label">Seg</span>
          </button>

          <button
            type="button"
            className="idle__rail-capture"
            onClick={onStart}
            disabled={!isReady}
          >
            <svg className="idle__rail-capture-icon" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4h2.5A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4H9V3.5ZM12 8.25a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5Zm0 1.75a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
              />
            </svg>
            <span className="idle__rail-capture-label">{config.texts.idleButton}</span>
          </button>
        </div>
      </aside>
    </div>
  )
}
