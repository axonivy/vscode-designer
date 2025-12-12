import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => ({
  plugins: [tsconfigPaths()],
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
