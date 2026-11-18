import fs from 'fs';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { TextDocument } from 'vscode';
import { FileSystemError } from 'vscode';
import { logErrorMessage } from '../../base/logging-util';
import { setupCommunication } from './webview-communication';

const mocks = vi.hoisted(() => ({
  dispatch: (message: unknown): void => {
    throw new Error(`No message handler for ${String(message)}`);
  },
  executeCommand: vi.fn(),
  uriFile: vi.fn(),
  stat: vi.fn()
}));

vi.mock('vscode', () => {
  class FileSystemError extends Error {
    constructor(readonly code: string) {
      super(code);
    }

    static FileNotFound() {
      return new FileSystemError('FileNotFound');
    }

    static NoPermissions() {
      return new FileSystemError('NoPermissions');
    }
  }
  return {
    commands: { executeCommand: mocks.executeCommand },
    FileSystemError,
    Uri: { file: mocks.uriFile },
    workspace: { fs: { stat: mocks.stat } }
  };
});

vi.mock('@eclipse-glsp/vscode-integration', () => ({
  DisposableCollection: class {
    dispose() {}
  }
}));

vi.mock('../editor-websocket-forwarder', () => ({
  EditorWebSocketForwarder: class {
    constructor(
      _url: URL,
      _endpoint: string,
      _messenger: unknown,
      _participant: unknown,
      _notification: unknown,
      readonly document: TextDocument
    ) {
      mocks.dispatch = message => this.handleClientMessage(message);
    }

    handleClientMessage(message: unknown) {
      return message;
    }
  }
}));

vi.mock('../java-provider', () => ({
  JavaProvider: class {
    javaTypes = vi.fn();
  }
}));
vi.mock('../content-writer', () => ({ updateTextDocumentContent: vi.fn() }));
vi.mock('../../base/logging-util', () => ({ logErrorMessage: vi.fn(), logInformationMessage: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.uriFile.mockImplementation(path => ({ scheme: 'file', path }));
  mocks.stat.mockReset().mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const openForm = (uri: object, readOnly: boolean) => {
  const document = { uri, fileName: '/unused' };
  const messenger = { registerWebviewPanel: vi.fn(), onNotification: vi.fn() };
  const panel = { onDidDispose: vi.fn() };
  setupCommunication(
    new URL('ws://localhost'),
    messenger as never,
    panel as never,
    document as never,
    '/archive.iar!/engine/Data.d.json',
    readOnly
  );
  mocks.dispatch({ method: 'action', params: { actionId: 'openForm' } });
};

const archiveDocumentUri = () => {
  const uri = {
    scheme: 'axonivy-iar-content',
    path: '/shared.iar/dialog/My DialogData.d.json',
    query: 'archive=%2Fdeps%2Fshared.iar',
    with: vi.fn(({ path }: { path: string }) => ({ scheme: uri.scheme, path, query: uri.query }))
  };
  return uri;
};

test.each([
  [true, '.f.json'],
  [false, '.xhtml']
])('opens the read-only dialog with archive form existence %s', async (formExists, extension) => {
  const uri = archiveDocumentUri();
  const exists = vi.spyOn(fs, 'existsSync');
  if (!formExists) {
    mocks.stat.mockRejectedValue(FileSystemError.FileNotFound());
  }

  openForm(uri, true);

  await vi.waitFor(() =>
    expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', {
      scheme: uri.scheme,
      path: `/shared.iar/dialog/My Dialog${extension}`,
      query: uri.query
    })
  );
  expect(mocks.stat).toHaveBeenCalledWith({
    scheme: uri.scheme,
    path: '/shared.iar/dialog/My Dialog.f.json',
    query: uri.query
  });
  expect(exists).not.toHaveBeenCalled();
  expect(mocks.uriFile).not.toHaveBeenCalled();
});

test('reports archive access errors without falling back to XHTML', async () => {
  const uri = archiveDocumentUri();
  const error = FileSystemError.NoPermissions();
  mocks.stat.mockRejectedValue(error);

  openForm(uri, true);

  await vi.waitFor(() => expect(logErrorMessage).toHaveBeenCalledWith(String(error)));
  expect(mocks.executeCommand).not.toHaveBeenCalled();
  expect(uri.with).not.toHaveBeenCalledWith({ path: '/shared.iar/dialog/My Dialog.xhtml' });
});

test.each([
  [true, '/project/dialog/Example.f.json'],
  [false, '/project/dialog/Example.xhtml']
])('opens the local dialog with form existence %s', (formExists, expectedPath) => {
  vi.spyOn(fs, 'existsSync').mockReturnValue(formExists);

  openForm({ scheme: 'file', path: '/project/dialog/ExampleData.d.json' }, false);

  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', { scheme: 'file', path: expectedPath });
});
