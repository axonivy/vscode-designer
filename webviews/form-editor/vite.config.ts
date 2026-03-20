import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react()],
  build: {
    manifest: 'build.manifest.json',
    outDir: '../../extension/dist/webviews/form-editor',
    chunkSizeWarningLimit: 5000
  },
  server: {
    port: 3000,
    open: false
  },
  base: './'
}));
