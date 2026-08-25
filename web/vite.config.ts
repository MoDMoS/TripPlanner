import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/trip-api': {
        target: 'http://127.0.0.1:3003',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/trip-api/, ''),
      },
      '/api/auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
