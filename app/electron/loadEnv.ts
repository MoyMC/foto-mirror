import fs from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'

/** Carga `app/.env` (dev, build portable o .env junto al ejecutable). */
export function loadAppEnv(): void {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
  ]

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      config({ path: envPath, override: false })
      return
    }
  }
}
