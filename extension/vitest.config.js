import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: 'report.xml'
  }
});
