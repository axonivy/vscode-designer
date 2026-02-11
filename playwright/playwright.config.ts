import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    permissions: ['clipboard-read'],
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure'
  },
  testDir: './tests',
  workers: 1,
  reporter: process.env.CI ? [['junit', { outputFile: 'report.xml' }], ['list']] : 'html'
});
