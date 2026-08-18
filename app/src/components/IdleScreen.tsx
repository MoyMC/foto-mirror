import { useState } from 'react'
import type { AppConfig, FilterPreset } from '../types'
import { FilterBar } from './FilterBar'

export const COUNTDOWN_OPTIONS = [3, 5, 7, 10] as const

type RailPanel = 'filters' | 'seconds' | null

interface IdleScreenProps {
  config: AppConfig
  filters: FilterPreset[]
  filterThumbnails: Record<string, string>
  isReady: boolean
  activeFilterId: string
  countdownSeconds: number
  onFilterChange: (id: string) => void
  onCountdownChange: (seconds: number) => void
  onStart: () => void
}

export function IdleScreen({
  config,
  filters,
  filterThumbnails,
  isReady,
  activeFilterId,
  countdownSeconds,
  onFilterChange,
  onCountdownChange,
  onStart,
}: IdleScreenProps) {
  const [openPanel, setOpenPanel] = useState<RailPanel>(null)

  const togglePanel = (panel: Exclude<RailPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  return (
    <div className="screen screen--idle">
      <div className="screen__overlay" />
      <div className="idle__hero">
        <p className="idle__sub">Posa frente al espejo y captura el momento</p>
      </div>

      <aside className="idle__rail" aria-label="Opciones">
        <div
          className={`idle__flyout${openPanel ? ' idle__flyout--open' : ''}`}
          data-panel={openPanel ?? undefined}
        >
          <div className="idle__flyout-inner">
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
