import config from '@axonivy/eslint-config';

export default config.defineConfig(
  ...config.base,
  ...config.i18n,
  // TypeScript configs
  {
    name: 'typescript-eslint',
    languageOptions: {
      parserOptions: {
        project: true, // Uses tsconfig.json from current directory
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  // Project specific configs
  {
    name: 'ignore-files',
    ignores: ['**/scripts/download-*', '**/.vscode-test/*', '**/generated/client*', '**/browser/media/*', '**/monaco-workers/*']
  },
  {
    name: 'vscode/rules',
    rules: {
      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-force-option': 'off',
      'playwright/no-conditional-in-test': 'off'
    }
  }
);
