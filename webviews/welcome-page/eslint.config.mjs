import config from '@axonivy/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...config.base,
  ...config.i18n,
  {
    name: 'typescript-eslint',
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
]);
