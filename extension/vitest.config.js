import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    // test-integration runs inside a real VS Code extension host via Mocha (see src/test-integration/runTest.ts),
    exclude: [...configDefaults.exclude, 'src/test-integration/**'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: 'report.xml'
  }
});
