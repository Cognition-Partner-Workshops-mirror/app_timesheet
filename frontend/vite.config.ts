import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the backend Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy health check endpoint to the backend
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  }
})
