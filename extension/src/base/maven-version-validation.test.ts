import { beforeEach, expect, test, vi } from 'vitest';
import { MAVEN_SETTING_KEY, validateMavenExecutable } from './maven-version-validation';

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  exec: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
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
    showInformationMessage: mocks.showInformationMessage,
    showWarningMessage: mocks.showWarningMessage
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

vi.mock('child_process', () => ({
  exec: mocks.exec
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
  mocks.exec.mockImplementation((_command: string, _options: unknown, callback: (error: null, stdout: string, stderr: string) => void) => {
    callback(null, VALID_MAVEN_VERSION_OUTPUT, '');
  }); // by default, assume the Maven executable returns a valid version
});

test.skip('valid Workspace only override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'some/workspace/path' });
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(0);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "some/workspace/path"`)
  );
});

test.skip('valid Workspace override and valid User override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'some/workspace/path', globalValue: 'some/User/path' });
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(0);
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(2);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "some/workspace/path"`)
  );
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid global user Maven executable setting "${MAVEN_SETTING_KEY}": "some/User/path"`)
  );
});

test.skip('valid workspace override multi-root', async () => {
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
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(0);
  expect(mocks.exec).toHaveBeenCalledWith('"some/workspace-a/path" --version', expect.anything(), expect.anything());
  expect(mocks.exec).toHaveBeenCalledWith('"some/workspace-b/path" --version', expect.anything(), expect.anything());
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(2);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "some/workspace-a/path"`)
  );
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "some/workspace-b/path"`)
  );
});

test.skip('valid workspace override list and valid User override', async () => {
  setWorkspaceFolders('workspace-folder-a', 'workspace-folder-b');
  mocks.inspect.mockImplementation((setting: string, scope?: { fsPath: string }) => {
    expect(setting).toBe('executable.path');
    if (scope?.fsPath === 'workspace-folder-a') {
      return { workspaceFolderValue: 'some/workspace-a/path' };
    }
    if (scope?.fsPath === 'workspace-folder-b') {
      return { workspaceFolderValue: 'some/workspace-b/path' };
    }
    return { globalValue: 'some/User/path' };
  });
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(0);
  expect(mocks.exec).toHaveBeenCalledWith('"some/workspace-a/path" --version', expect.anything(), expect.anything());
  expect(mocks.exec).toHaveBeenCalledWith('"some/workspace-b/path" --version', expect.anything(), expect.anything());
  expect(mocks.exec).toHaveBeenCalledWith('"some/User/path" --version', expect.anything(), expect.anything());
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(3);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "some/workspace-a/path"`)
  );
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "some/workspace-b/path"`)
  );
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid global user Maven executable setting "${MAVEN_SETTING_KEY}": "some/User/path"`)
  );
});

test.skip('valid User only override ', async () => {
  mocks.inspect.mockReturnValue({ globalValue: 'some/User/path' });
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(0);
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid global user Maven executable setting "${MAVEN_SETTING_KEY}": "some/User/path"`)
  );
});

test.skip('valid no override', async () => {
  mocks.inspect.mockReturnValue(undefined);
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.exec).toHaveBeenCalledWith('"mvn" --version', expect.anything(), expect.anything());
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(0);
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(0);
});

test.skip('invalid Workspace wrong version override and valid User override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: 'some/User/path' });
  mocks.exec.mockImplementationOnce((_command, _options, callback) => callback(null, INVALID_MAVEN_VERSION_OUTPUT, ''));
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(1);
  expect(mocks.showWarningMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Invalid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "invalidPath"`)
  );
  expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
  expect(mocks.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Found valid global user Maven executable setting "${MAVEN_SETTING_KEY}": "some/User/path"`)
  );
});

test.skip('invalid Workspace throws error override', async () => {
  setWorkspaceFolders('workspace-folder');
  mocks.inspect.mockReturnValue({ workspaceValue: 'invalidPath', globalValue: undefined });
  mocks.exec.mockImplementationOnce((_command, _options, callback) => {
    callback(new Error('Maven executable failed'), '', '');
  });
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(1);
  expect(mocks.showWarningMessage).toHaveBeenCalledWith(
    expect.stringContaining(`Invalid workspace Maven executable setting "${MAVEN_SETTING_KEY}": "invalidPath"`)
  );
});

test.skip('invalid no Maven found neither PATH nor override', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });
  mocks.exec.mockImplementation((_command, _options, callback) => callback(null, INVALID_MAVEN_VERSION_OUTPUT, ''));
  await expect(validateMavenExecutable()).resolves.toBeUndefined();
  expect(mocks.showWarningMessage).toHaveBeenCalledTimes(1);
  expect(mocks.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('No valid Maven executable found'));
});
