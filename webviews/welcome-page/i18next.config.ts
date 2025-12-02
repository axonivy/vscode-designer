import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en'],
  extract: {
    input: ['src/**/*.ts', 'src/**/*.tsx'],
    output: 'src/translation/{{namespace}}/{{language}}.json',
    defaultNS: 'welcome-page',
    functions: ['t', '*.t'],
    transComponents: ['Trans'],
    defaultValue: '__MISSING_TRANSLATION__'
  },
  types: {
    input: ['locales/{{language}}/{{namespace}}.json'],
    output: 'src/types/i18next.d.ts'
  }
});
