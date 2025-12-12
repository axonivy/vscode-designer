import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => ({
  plugins: [tsconfigPaths()],
  build: {
    manifest: 'build.manifest.json',
    outDir: '../../extension/dist/webviews/cms-editor',
    chunkSizeWarningLimit: 5000
  },
  server: {
    port: 3003,
    open: false
  },
  base: './'
}));
