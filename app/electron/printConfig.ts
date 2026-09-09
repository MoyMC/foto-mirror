/** 4×6" dye-sub sheet @ 300 dpi (DNP DS-RX1, media 102×152 mm). */
export const PRINT_DPI = 300

export const SHEET_WIDTH_IN = 4
export const SHEET_HEIGHT_IN = 6
export const STRIP_WIDTH_IN = 2

export const SHEET_WIDTH_PX = SHEET_WIDTH_IN * PRINT_DPI
export const SHEET_HEIGHT_PX = SHEET_HEIGHT_IN * PRINT_DPI
export const STRIP_WIDTH_PX = STRIP_WIDTH_IN * PRINT_DPI

/** Windows printer queue name (Configuración → Impresoras). */
export const DEFAULT_PRINTER_NAME = 'DS-RX1'

/** Sentinel selected in the wizard instead of a real Windows queue. */
export const SIMULATE_PRINTER_ID = '__fotomirror_simulate__'
export const SIMULATE_PRINTER_LABEL = 'Simulación (no imprime)'

/**
 * Compensación fija del driver DNP en Windows: el 4×6 se envía como 6×4 apaisado.
 * No depende de la rotación del wizard (esa ya va en el JPEG guardado).
 */
export const DNP_DRIVER_ROTATE_DEGREES: 0 | 90 | 180 | 270 = 90

export interface PrintRuntimeSettings {
  /** Guest-facing print UI + worker. Off until the wizard enables it. */
  enabled: boolean
  /** Windows queue name, or {@link SIMULATE_PRINTER_ID}. */
  printerName: string
}

let runtime: PrintRuntimeSettings = {
  enabled: false,
  printerName: defaultPrinterFromEnv(),
}

function envFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function defaultPrinterFromEnv(): string {
  if (envFlag(process.env.FOTOMIRROR_PRINT_SIMULATE)) return SIMULATE_PRINTER_ID
  return process.env.FOTOMIRROR_PRINTER?.trim() || DEFAULT_PRINTER_NAME
}

export function getPrintSettings(): PrintRuntimeSettings {
  return { ...runtime }
}

export function setPrintSettings(next: Partial<PrintRuntimeSettings>): PrintRuntimeSettings {
  if (typeof next.enabled === 'boolean') runtime.enabled = next.enabled
  if (typeof next.printerName === 'string' && next.printerName.trim()) {
    runtime.printerName = next.printerName.trim()
  }
  return getPrintSettings()
}

export function isPrintingEnabled(): boolean {
  return runtime.enabled
}

export function isPrintSimulationEnabled(): boolean {
  return runtime.printerName === SIMULATE_PRINTER_ID
}

export function resolvePrinterName(): string {
  if (runtime.printerName === SIMULATE_PRINTER_ID) return DEFAULT_PRINTER_NAME
  return runtime.printerName || DEFAULT_PRINTER_NAME
}

export function isSimulatePrinterId(name: string): boolean {
  return name === SIMULATE_PRINTER_ID
}
