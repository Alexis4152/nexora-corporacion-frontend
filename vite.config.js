import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo /api se reenvía al backend (8091): mismo origen para el navegador, así la cookie httpOnly
// del refresh token (SameSite=Strict, path /api/v1/auth) funciona sin CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5181,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:8091', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})

