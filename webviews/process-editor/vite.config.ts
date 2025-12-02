import monacoConfigPlugin from '@axonivy/monaco-vite-plugin';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  const config = {
    plugins: [
      tsconfigPaths(),
      monacoConfigPlugin({
        ignorePackages: [
          'vscode-messenger-webview',
          'vscode-messenger-common',
          '@eclipse-glsp/vscode-integration',
          '@eclipse-glsp/vscode-integration-webview',
          '@axonivy/vscode-webview-common'
        ]
      })
    ],
    build: {
      manifest: 'build.manifest.json',
      outDir: '../../extension/dist/webviews/process-editor',
      chunkSizeWarningLimit: 5000
    },
    server: {
      port: 3000,
      open: false,
      sourcemapIgnoreList(sourcePath: string, sourcemapPath: string) {
        return sourcePath.includes('node_modules') && !sourcePath.includes('@eclipse-glsp') && !sourcePath.includes('@axonivy');
      }
    },
    resolve: { alias: { path: 'path-browserify' } },
    base: './'
  };
  return config;
});
