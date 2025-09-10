import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  const config = {
    plugins: [tsconfigPaths()],
    build: {
      manifest: 'build.manifest.json',
      outDir: '../../extension/dist/webviews/database-editor',
      chunkSizeWarningLimit: 5000
    },
    base: './'
  };
  return config;
});
