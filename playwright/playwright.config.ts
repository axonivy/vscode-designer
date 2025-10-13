import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    permissions: ['clipboard-read'],
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 }
    }
  },
  testDir: './tests',
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [['junit', { outputFile: 'report.xml' }]] : 'html'
});
