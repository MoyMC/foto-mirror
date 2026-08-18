import type { FilterPreset } from '../types'

interface FilterBarProps {
  filters: FilterPreset[]
  activeFilterId: string
  thumbnails: Record<string, string>
  orientation?: 'horizontal' | 'vertical'
  onFilterChange: (id: string) => void
}

export function FilterBar({
  filters,
  activeFilterId,
  thumbnails,
  orientation = 'horizontal',
  onFilterChange,
}: FilterBarProps) {
  return (
    <div
      className={`filter-bar${orientation === 'vertical' ? ' filter-bar--vertical' : ''}`}
      role="listbox"
      aria-label="Filtros"
    >
      {filters.map((f, index) => (
        <button
          key={f.id}
          type="button"
          role="option"
          className={`filter-bar__item${activeFilterId === f.id ? ' filter-bar__item--active' : ''}`}
          style={{ animationDelay: `${index * 40}ms` }}
          onClick={() => onFilterChange(f.id)}
          aria-label={`Filtro ${f.name}`}
          aria-selected={activeFilterId === f.id}
        >
          <span className="filter-bar__thumb">
            {thumbnails[f.id] ? (
              <img src={thumbnails[f.id]} alt="" className="filter-bar__thumb-img" />
            ) : (
              <span className="filter-bar__thumb-placeholder" />
            )}
          </span>
          <span className="filter-bar__name">{f.name}</span>
        </button>
      ))}
    </div>
  )
}
