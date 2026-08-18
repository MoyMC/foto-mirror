import { app } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface TetherStatus {
  available: boolean
  canShoot: boolean
  cameraModel?: string
  reason?: string
}

export interface TetherCaptureResult {
  ok: boolean
  filePath?: string
  dataUrl?: string
  error?: string
}

interface HelperResponse {
  ok: boolean
  cmd?: string
  model?: string
  canShoot?: boolean
  connected?: boolean
  filePath?: string
  error?: string
}

let helper: ChildProcessWithoutNullStreams | null = null
let stdoutBuffer = ''
let readySeen = false
let pending: {
  resolve: (value: HelperResponse) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
} | null = null
let lastModel: string | undefined
let connected = false

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function resolveHelperPath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'tether-ptp2', 'tether-ptp2.exe'),
    path.join(app.getAppPath(), 'resources', 'tether-ptp2', 'tether-ptp2.exe'),
    path.join(__dirname, '..', 'resources', 'tether-ptp2', 'tether-ptp2.exe'),
    path.join(process.cwd(), 'resources', 'tether-ptp2', 'tether-ptp2.exe'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function parseLine(line: string): HelperResponse | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    return JSON.parse(trimmed) as HelperResponse
  } catch {
    return null
  }
}

function onHelperData(chunk: Buffer) {
  stdoutBuffer += chunk.toString('utf8')
  let idx = stdoutBuffer.indexOf('\n')
  while (idx >= 0) {
    const line = stdoutBuffer.slice(0, idx)
    stdoutBuffer = stdoutBuffer.slice(idx + 1)
    const msg = parseLine(line)
    if (msg?.cmd === 'ready') readySeen = true
    if (msg && pending) {
      clearTimeout(pending.timer)
      const p = pending
      pending = null
      p.resolve(msg)
    }
    idx = stdoutBuffer.indexOf('\n')
  }
}

async function ensureHelper(): Promise<ChildProcessWithoutNullStreams> {
  if (helper && !helper.killed) return helper

  const exe = resolveHelperPath()
  if (!exe) {
    throw new Error(
      'No se encontró tether-ptp2.exe (compila native/tether-ptp2)',
    )
  }

  readySeen = false
  stdoutBuffer = ''
  helper = spawn(exe, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  helper.stdout.on('data', onHelperData)
  helper.stderr.on('data', () => undefined)
  helper.on('exit', () => {
    helper = null
    connected = false
    readySeen = false
    if (pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Helper PTP salió inesperadamente'))
      pending = null
    }
  })

  const start = Date.now()
  while (!readySeen && Date.now() - start < 8000) {
    await sleep(40)
  }
  if (!readySeen) {
    helper.kill()
    helper = null
    throw new Error('Helper PTP no respondió (ready)')
  }
  return helper
}

function sendCommand(command: string, timeoutMs: number): Promise<HelperResponse> {
  return new Promise((resolve, reject) => {
    if (pending) {
      reject(new Error('Ya hay un comando PTP en curso'))
      return
    }
    if (!helper || !helper.stdin.writable) {
      reject(new Error('Helper PTP no iniciado'))
      return
    }

    const timer = setTimeout(() => {
      pending = null
      reject(new Error(`Timeout PTP (${command})`))
    }, timeoutMs)

    pending = { resolve, reject, timer }
    helper.stdin.write(`${command}\n`, (err) => {
      if (err) {
        clearTimeout(timer)
        pending = null
        reject(err)
      }
    })
  })
}

async function usbHeuristic(): Promise<TetherStatus> {
  if (process.platform !== 'win32') {
    return {
      available: false,
      canShoot: false,
      reason: 'Tether solo está soportado en Windows',
    }
  }

  try {
    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      "$devs = Get-PnpDevice -Status OK | Where-Object {",
      "  $_.FriendlyName -match 'ILCE|Sony ILCE|Sony Corporation|Imaging Edge'",
      '}',
      "$devs | Select-Object -ExpandProperty FriendlyName -Unique",
    ].join('; ')

    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 10_000, windowsHide: true, encoding: 'utf8' },
    )

    const names = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (names.length === 0) {
      return {
        available: false,
        canShoot: false,
        reason:
          'No se detectó cámara Sony por USB. Conecta en modo PC remoto e Imaging Edge cerrado.',
      }
    }

    return {
      available: true,
      canShoot: false,
      cameraModel: names.find((n) => /ILCE/i.test(n)) ?? names[0],
      reason: 'Sony USB detectada.',
    }
  } catch {
    return {
      available: false,
      canShoot: false,
      reason: 'No se pudo consultar los dispositivos USB',
    }
  }
}

export async function getTetherStatus(): Promise<TetherStatus> {
  const exe = resolveHelperPath()
  if (!exe) {
    const base = await usbHeuristic()
    return {
      ...base,
      canShoot: false,
      reason: base.available
        ? 'Sony detectada, pero falta tether-ptp2.exe'
        : base.reason,
    }
  }

  if (connected && helper && !helper.killed) {
    try {
      const status = await sendCommand('status', 4000)
      if (status.ok && status.connected) {
        return {
          available: true,
          canShoot: true,
          cameraModel: lastModel,
          reason: 'Sesión PTP 2 activa',
        }
      }
      connected = false
    } catch {
      connected = false
    }
  }

  try {
    await ensureHelper()
    const res = await sendCommand('connect', 25_000)
    if (!res.ok) {
      const usb = await usbHeuristic()
      return {
        available: usb.available,
        canShoot: false,
        cameraModel: usb.cameraModel,
        reason:
          res.error ??
          'No se pudo abrir sesión PTP (cierra Imaging Edge / sample v2)',
      }
    }
    connected = true
    lastModel = res.model
    return {
      available: true,
      canShoot: true,
      cameraModel: res.model,
      reason: 'Sesión PTP 2 activa — HDMI debería salir de Conectando',
    }
  } catch (err) {
    const usb = await usbHeuristic()
    return {
      available: usb.available,
      canShoot: false,
      cameraModel: usb.cameraModel ?? lastModel,
      reason: err instanceof Error ? err.message : 'Error al conectar PTP',
    }
  }
}

export async function captureTethered(opts: {
  photosDir: string
  timeoutMs?: number
}): Promise<TetherCaptureResult> {
  try {
    if (!connected) {
      const status = await getTetherStatus()
      if (!status.canShoot) {
        return { ok: false, error: status.reason ?? 'Tether no listo' }
      }
    }

    await ensureHelper()
    const timeout = Math.max(opts.timeoutMs ?? 8000, 8000)
    const res = await sendCommand(`capture ${opts.photosDir}`, timeout + 3000)
    if (!res.ok || !res.filePath) {
      return { ok: false, error: res.error ?? 'Captura tether falló' }
    }

    const buffer = await fs.promises.readFile(res.filePath)
    const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`
    return { ok: true, filePath: res.filePath, dataUrl }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error en captura tether',
    }
  }
}

export async function disconnectTether(): Promise<void> {
  try {
    if (helper && !helper.killed) {
      try {
        await sendCommand('disconnect', 4000)
      } catch {
        // ignore
      }
      try {
        helper.stdin.write('quit\n')
      } catch {
        // ignore
      }
      helper.kill()
    }
  } finally {
    helper = null
    connected = false
    readySeen = false
  }
}
