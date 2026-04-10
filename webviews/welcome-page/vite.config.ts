import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [tailwindcss(), react()],
  build: {
    manifest: 'build.manifest.json',
    outDir: '../../extension/dist/webviews/welcome-page',
    chunkSizeWarningLimit: 5000
  },
  server: {
    port: 3001,
    open: false
  },
  base: './'
}));
