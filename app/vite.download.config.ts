import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/** Build de la página de descarga (QR) → resources/download-page */
export default defineConfig({
  root: path.resolve(__dirname, 'download-page'),
  base: '/',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'resources/download-page'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
