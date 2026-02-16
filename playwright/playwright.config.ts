import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    permissions: ['clipboard-read'],
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  workers: 1,
  timeout: 40_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [['junit', { outputFile: 'report.xml' }], ['list']] : 'html',
  projects: [
    { name: 'integration', testDir: './tests/integration' },
    { name: 'performance', testDir: './tests/performance' }
  ]
});
