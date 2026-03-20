import { defineConfig } from 'vite';

export default defineConfig(() => ({
  build: {
    manifest: 'build.manifest.json',
    outDir: '../../extension/dist/webviews/browser',
    chunkSizeWarningLimit: 5000,
    rolldownOptions: {
      input: 'src/index.ts'
    }
  },
  server: {
    port: 3000,
    open: false
  },
  base: './'
}));
