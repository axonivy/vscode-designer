import { beforeEach, expect, test, vi } from 'vitest';
import { validateMavenExecutable } from './maven-version-validation';

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  execFileSync: vi.fn(),
  accessSync: vi.fn(),
  statSync: vi.fn(),
  showInformationMessage: vi.fn(),
  workspaceFolders: [] as Array<{ uri: { fsPath: string } }>
}));

const setWorkspaceFolders = (...folderPaths: string[]) => {
  mocks.workspaceFolders = folderPaths.map(fsPath => ({ uri: { fsPath } }));
};

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
    getConfiguration: (_section: string, scope?: { fsPath: string }) => ({
      inspect: (setting: string) => mocks.inspect(setting, scope)
    }),
    get workspaceFolders() {
      return mocks.workspaceFolders;
    }
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
  setWorkspaceFolders(); // by default, no workspace folders are set
  mocks.inspect.mockImplementation((setting: string) => {
    expect(setting).toBe('executable.path');
    return { workspaceFolderValue: undefined, workspaceValue: undefined, globalValue: undefined };
  });
  mocks.execFileSync.mockReturnValue(VALID_MAVEN_VERSION_OUTPUT); // by default, assume the Maven executable returns a valid version
  mocks.statSync.mockImplementation(() => ({ isFile: () => true })); // by default, assume the file exists
  mocks.accessSync.mockReturnValue(undefined); // by default, assume the file is accessible
});

test('valid Workspace only override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'some/workspace/path' });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledOnce();
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining('Found valid Workspace/Folder Maven executable setting')
  );
});

test('valid Workspace/Folder override list', async () => {
  setWorkspaceFolders('workspace-folder-a', 'workspace-folder-b');
  mocks.inspect.mockImplementation((setting: string, scope?: { fsPath: string }) => {
    expect(setting).toBe('executable.path');
    if (scope?.fsPath === 'workspace-folder-a') {
      return { workspaceFolderValue: 'some/workspace-a/path' };
    }
    if (scope?.fsPath === 'workspace-folder-b') {
      return { workspaceFolderValue: 'some/workspace-b/path' };
    }
    return { globalValue: undefined };
  });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.execFileSync).toHaveBeenCalledWith('some/workspace-a/path', ['--version'], expect.anything());
  expect(mocks.execFileSync).toHaveBeenCalledWith('some/workspace-b/path', ['--version'], expect.anything());
  expect(mocks.showInformationMessage).toHaveBeenCalledOnce();
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining('Found valid Workspace/Folder Maven executable setting')
  );
});

test('valid User only override ', async () => {
  mocks.inspect.mockReturnValue({ globalValue: 'some/User/path' });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledOnce();
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid User Maven executable setting'));
});

test('valid no override', async () => {
  mocks.inspect.mockReturnValue(undefined);
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.execFileSync).toHaveBeenCalledWith('mvn', ['--version'], expect.anything());
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(0);
});

test('valid Workspace override and valid User override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'some/workspace/path', globalValue: 'some/User/path' });
  expect(validateMavenExecutable()).toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(2);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining('Found valid Workspace/Folder Maven executable setting')
  );
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Found valid User Maven executable setting'));
});

test('invalid Workspace override beats valid User override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: 'validPathNeverEvaluated' });
  mocks.statSync.mockImplementation(() => ({ isFile: () => false }));
  expect(() => validateMavenExecutable()).toThrow('Invalid workspace Maven setting');
  expect(mocks.statSync).toHaveBeenCalledOnce(); // execution stops at first setting
});

test('invalid Workspace override not file', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: undefined });
  mocks.statSync.mockImplementation(() => ({ isFile: () => false }));
  expect(() => validateMavenExecutable()).toThrow('Invalid workspace Maven setting');
});

test('invalid Workspace override not executable', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: undefined });
  mocks.accessSync.mockImplementation(() => 'notAccessible');
  expect(() => validateMavenExecutable()).toThrow('Invalid workspace Maven setting');
});

test('invalid Workspace override wrong version', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'valid/executable/wrong/version', globalValue: undefined });
  mocks.execFileSync.mockReturnValue(INVALID_MAVEN_VERSION_OUTPUT);
  expect(() => validateMavenExecutable()).toThrow('Invalid workspace Maven setting');
});

test('invalid no Maven found neither PATH nor override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });
  mocks.execFileSync.mockReturnValue(INVALID_MAVEN_VERSION_OUTPUT);
  expect(() => validateMavenExecutable()).toThrow('No valid Maven executable found');
});
