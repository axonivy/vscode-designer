import { beforeEach, expect, test, vi } from 'vitest';
import { validateMavenExecutable } from './maven-version-validation';

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  execFileSync: vi.fn(),
  accessSync: vi.fn(),
  statSync: vi.fn(),
  showInformationMessage: vi.fn()
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
  statSync: mocks.statSync,
  accessSync: mocks.accessSync,
  constants: {
    X_OK: 1
  }
}));

vi.mock('child_process', () => ({
  execFileSync: mocks.execFileSync
}));

const VALID_MAVEN_VERSION_OUTPUT = 'Apache Maven 3.9.11';
const INVALID_MAVEN_VERSION_OUTPUT = 'Apache Maven 3.8.5';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inspect.mockImplementation((setting: string) => {
    expect(setting).toBe('executable.path');
    return { workspaceValue: undefined, globalValue: undefined };
  });
  mocks.execFileSync.mockReturnValue(VALID_MAVEN_VERSION_OUTPUT);
  mocks.statSync.mockImplementation(() => ({ isFile: () => true })); // by default, assume the file exists
  mocks.accessSync.mockReturnValue(undefined); // by default, assume the file is accessible
});

test('valid Workspace only override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: 'some/workspace/path', globalValue: undefined });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledOnce();
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid Workspace Maven executable setting'));
});

test('valid User only override ', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: 'some/User/path' });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid User Maven executable setting'));
});

test('valid no override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(0);
});

test('valid Workspace override beats valid User override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: 'some/workspace/path', globalValue: 'some/User/path' });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledOnce();
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid Workspace Maven executable setting'));
  expect(mocks.statSync).toHaveBeenCalledOnce(); // execution stops at first setting
});

test('invalid Workspace override beats valid User override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: 'validPathNeverEvaluated' });
  mocks.statSync.mockImplementation(() => ({ isFile: () => false }));
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
  expect(mocks.statSync).toHaveBeenCalledOnce(); // execution stops at first setting
});

test('invalid Workspace override not file', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: undefined });
  mocks.statSync.mockImplementation(() => ({ isFile: () => false }));
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
});

test('invalid Workspace override not executable', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: undefined });
  mocks.accessSync.mockImplementation(() => 'notAccessible');
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
});

test('invalid Workspace override wrong version', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: 'valid/executable/wrong/version', globalValue: undefined });
  mocks.execFileSync.mockReturnValue(INVALID_MAVEN_VERSION_OUTPUT);
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
});

test('invalid no Maven found neither PATH nor override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });
  mocks.execFileSync.mockReturnValue(INVALID_MAVEN_VERSION_OUTPUT);
  expect(() => validateMavenExecutable()).toThrow('No valid Maven executable found');
});
