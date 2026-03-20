import monacoConfigPlugin from '@axonivy/monaco-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [
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
  css: {
    lightningcss: {
      errorRecovery: true
    }
  },
  // By default Vite adds a content hash to worker filenames. Drop it so the extension can locate the worker by fixed path.
  // Webviews only allow loading workers via blob: or data: URLs, so the extension needs to find and serve the file.
  worker: {
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[name].js'
      }
    }
  },
  server: {
    port: 3000,
    open: false,
    sourcemapIgnoreList(sourcePath: string, sourcemapPath: string) {
      return sourcePath.includes('node_modules') && !sourcePath.includes('@eclipse-glsp') && !sourcePath.includes('@axonivy');
    }
  },
  base: './'
}));
