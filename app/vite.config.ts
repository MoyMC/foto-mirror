import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'
import fs from 'node:fs'

const eventosRoot = path.resolve(__dirname, '../eventos')
const webOnly = process.env.VITE_WEB_ONLY === '1'

function serveEventos(): Plugin {
  return {
    name: 'serve-eventos',
    configureServer(server) {
      server.middlewares.use('/eventos', (req, res, next) => {
        const urlPath = (req.url ?? '/').split('?')[0]
        const filePath = path.normalize(path.join(eventosRoot, urlPath))
        if (!filePath.startsWith(eventosRoot) || !fs.existsSync(filePath)) {
          return next()
        }
        const ext = path.extname(filePath)
        const types: Record<string, string> = {
          '.json': 'application/json',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.jpg': 'image/jpeg',
        }
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  base: './',
  server: {
    open: false,
  },
  plugins: [
    react(),
    serveEventos(),
    ...(webOnly
      ? []
      : [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: ['electron', 'better-sqlite3', 'sharp', 'pdfkit', 'pdf-to-printer', 'dotenv'],
                  },
                },
              },
            },
            preload: {
              input: path.join(__dirname, 'electron/preload.ts'),
              vite: {
                build: {
                  outDir: 'dist-electron',
                },
              },
            },
            renderer: {},
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
