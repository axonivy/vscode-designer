import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => ({
  plugins: [tsconfigPaths()],
  build: {
    manifest: 'build.manifest.json',
    outDir: '../../extension/dist/webviews/browser',
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: 'src/index.ts'
    }
  },
  server: {
    port: 3000,
    open: false
  },
  base: './'
}));
