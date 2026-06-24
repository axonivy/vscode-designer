import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    permissions: ['clipboard-read'],
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  workers: process.env.RUN_IN_BROWSER ? 3 : 1,
  timeout: 40_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['junit', { outputFile: 'report.xml' }], ['list']] : 'html',
  projects: [
    { name: 'integration-parallel', testDir: './tests/integration', grepInvert: /@serial/ },
    { name: 'integration-serial', testDir: './tests/integration', grep: /@serial/, workers: 1 },
    { name: 'performance', testDir: './tests/performance', timeout: 120_000, expect: { timeout: 60_000 } }
  ]
});
