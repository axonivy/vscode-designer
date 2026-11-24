import { defineConfig } from '@x18n/cli';

// Detected presets: react-i18next, i18next, vscode-extension. They apply automatically.
export default defineConfig({
  sourceLocale: 'en',
  resources: [
    { pattern: 'extension/l10n/bundle.l10n.{locale}.{ext}' },
    { pattern: 'extension/l10n/bundle.l10n.{ext}' },
    { pattern: 'extension/package.nls.{locale}.{ext}' },
    { pattern: 'extension/package.nls.{ext}' },
    { pattern: 'webviews/welcome-page/src/translation/welcome-page/{locale}.json' }
  ]
});
