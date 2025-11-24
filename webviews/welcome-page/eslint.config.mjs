import config from '@axonivy/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...config.base,
  ...config.i18n,
  {
    name: 'typescript-eslint',
    languageOptions: {
      parserOptions: {
        project: true, // Uses tsconfig.json from current directory
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
]);
