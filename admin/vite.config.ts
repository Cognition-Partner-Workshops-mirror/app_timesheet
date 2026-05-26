import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CareAI Admin Panel Vite Configuration
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API requests to FastAPI backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
