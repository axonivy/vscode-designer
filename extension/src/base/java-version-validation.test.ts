import path from 'path';
import { expect, test, vi } from 'vitest';
import { validateAndSyncJavaVersion } from './java-version-validation';

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    }),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn()
  },
  workspace: {
    getConfiguration: () => ({
      get: vi.fn(),
      update: vi.fn()
    })
  },
  ConfigurationTarget: {
    Global: 1
  },
  commands: {
    executeCommand: vi.fn()
  }
}));

const testDir = (javaHome: string) => path.join(__dirname, 'java-version-validation-test', javaHome);

test('Undefined JAVA_HOME and IVY_JAVA_HOME', async () => {
  vi.stubEnv('JAVA_HOME', undefined);
  vi.stubEnv('IVY_JAVA_HOME', undefined);
  await expect(validateAndSyncJavaVersion()).rejects.toThrow(
    'JAVA_HOME is not set. Please set JAVA_HOME or IVY_JAVA_HOME environment variable to a valid Java 25 installation path.'
  );
});

test('Valid JAVA_HOME', async () => {
  vi.stubEnv('JAVA_HOME', testDir('java25'));
  vi.stubEnv('IVY_JAVA_HOME', undefined);
  await expect(validateAndSyncJavaVersion()).resolves.toBeUndefined();
});

test('Valid IVY_JAVA_HOME', async () => {
  vi.stubEnv('JAVA_HOME', testDir('java21'));
  vi.stubEnv('IVY_JAVA_HOME', testDir('java25'));
  await expect(validateAndSyncJavaVersion()).resolves.toBeUndefined();
});

test('Invalid IVY_JAVA_HOME', async () => {
  const java21Dir = testDir('java21');
  vi.stubEnv('JAVA_HOME', undefined);
  vi.stubEnv('IVY_JAVA_HOME', java21Dir);
  await expect(validateAndSyncJavaVersion()).rejects.toThrow(`Wrong Java version detected under ${java21Dir}. Expected Java 25.`);
});

test('Invalid IVY_JAVA_HOME', async () => {
  const java21Dir = testDir('java21');
  vi.stubEnv('JAVA_HOME', java21Dir);
  vi.stubEnv('IVY_JAVA_HOME', undefined);
  await expect(validateAndSyncJavaVersion()).rejects.toThrow(`Wrong Java version detected under ${java21Dir}. Expected Java 25.`);
});
