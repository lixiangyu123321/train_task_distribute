import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://124.221.85.5:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://124.221.85.5:8081',
        ws: true,
      },
    },
  },
});
