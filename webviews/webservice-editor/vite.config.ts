import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react()],
  build: {
    manifest: 'build.manifest.json',
    outDir: '../../extension/dist/webviews/webservice-editor',
    chunkSizeWarningLimit: 5000
  },
  server: {
    port: 3012,
    open: false
  },
  base: './'
}));
