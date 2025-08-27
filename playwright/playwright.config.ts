import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // permissions: ['clipboard-read'],
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry'
  },
  testDir: './tests',
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [['junit', { outputFile: 'report.xml' }]] : 'html'
});
