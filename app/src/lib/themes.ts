export type AppThemeId =
  | 'neon-white'
  | 'neon-cyan'
  | 'neon-magenta'
  | 'neon-lime'
  | 'neon-amber'
  | 'neon-violet'

export interface AppTheme {
  id: AppThemeId
  name: string
  /** Swatch color for the wizard picker */
  swatch: string
}

export const APP_THEMES: AppTheme[] = [
  { id: 'neon-white', name: 'Blanco', swatch: '#ffffff' },
  { id: 'neon-cyan', name: 'Cian', swatch: '#2ef0ff' },
  { id: 'neon-magenta', name: 'Magenta', swatch: '#ff2ec8' },
  { id: 'neon-lime', name: 'Lima', swatch: '#b8ff2e' },
  { id: 'neon-amber', name: 'Ámbar', swatch: '#ffb020' },
  { id: 'neon-violet', name: 'Violeta', swatch: '#b44dff' },
]

export const DEFAULT_THEME_ID: AppThemeId = 'neon-white'

export function normalizeThemeId(value: unknown): AppThemeId {
  if (typeof value === 'string' && APP_THEMES.some((t) => t.id === value)) {
    return value as AppThemeId
  }
  return DEFAULT_THEME_ID
}

export function applyAppTheme(themeId: AppThemeId): void {
  document.documentElement.dataset.theme = themeId
}
