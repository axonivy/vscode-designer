import fs from 'fs';
import { beforeEach, expect, test, vi } from 'vitest';
import { validateAndSyncMavenVersion } from './maven-version-validation';

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  showInformationMessage: vi.fn(),
  statSync: vi.fn(),
  accessSync: vi.fn(),
  execFileSync: vi.fn()
}));

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    }),
    showInformationMessage: mocks.showInformationMessage
  },
  workspace: {
    getConfiguration: () => ({
      inspect: mocks.inspect
    })
  }
}));

vi.mock('fs', () => ({
  default: {
    constants: { X_OK: 1 },
    statSync: mocks.statSync,
    accessSync: mocks.accessSync
  }
}));

vi.mock('child_process', () => ({
  execFileSync: mocks.execFileSync
}));

const validMavenOutput = 'Apache Maven 3.9.11\n';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inspect.mockImplementation((setting: string) => {
    expect(setting).toBe('executable.path');
    return { workspaceValue: undefined, globalValue: undefined };
  });
  mocks.statSync.mockReturnValue({ isFile: () => true });
  mocks.execFileSync.mockReturnValue(validMavenOutput);
});

test('valid Maven from PATH', async () => {
  await expect(validateAndSyncMavenVersion()).resolves.toBeUndefined();

  expect(mocks.execFileSync).toHaveBeenCalledWith('mvn', ['--version'], { encoding: 'utf8', windowsHide: true });
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid Maven path in system PATH.'));
});

test('valid workspace Maven override', async () => {
  const executablePath = '/workspace/maven/bin/mvn';
  mocks.inspect.mockReturnValue({ workspaceValue: executablePath, globalValue: undefined });

  await expect(validateAndSyncMavenVersion()).resolves.toBeUndefined();

  expect(mocks.statSync).toHaveBeenCalledWith(executablePath);
  expect(mocks.accessSync).toHaveBeenCalledWith(executablePath, fs.constants.X_OK);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining('Found valid Maven path override in Workspace settings.')
  );
});

test('valid user Maven override', async () => {
  const executablePath = '/home/user/maven/bin/mvn';
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: executablePath });

  await expect(validateAndSyncMavenVersion()).resolves.toBeUndefined();

  expect(mocks.statSync).toHaveBeenCalledWith(executablePath);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid Maven path override in User settings.'));
});

test('invalid Maven executable path', async () => {
  const executablePath = '/invalid/maven';
  mocks.inspect.mockReturnValue({ workspaceValue: executablePath, globalValue: undefined });
  mocks.statSync.mockReturnValue({ isFile: () => false });

  await expect(validateAndSyncMavenVersion()).resolves.toBeUndefined();

  expect(mocks.showInformationMessage).not.toHaveBeenCalledWith(expect.stringContaining('Workspace settings'));
});

test('invalid Maven version', async () => {
  mocks.execFileSync.mockReturnValue('Apache Maven 3.8.8\n');

  await expect(validateAndSyncMavenVersion()).resolves.toBeUndefined();

  expect(mocks.showInformationMessage).not.toHaveBeenCalled();
});

test('Maven command failure', async () => {
  mocks.execFileSync.mockImplementation(() => {
    throw new Error('Maven not found');
  });

  await expect(validateAndSyncMavenVersion()).resolves.toBeUndefined();

  expect(mocks.showInformationMessage).not.toHaveBeenCalled();
});
