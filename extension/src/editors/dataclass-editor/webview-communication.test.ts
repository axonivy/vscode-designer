import fs from 'fs';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { TextDocument } from 'vscode';
import { setupCommunication } from './webview-communication';

const mocks = vi.hoisted(() => ({
  dispatch: (message: unknown): void => {
    throw new Error(`No message handler for ${String(message)}`);
  },
  executeCommand: vi.fn(),
  uriFile: vi.fn()
}));

vi.mock('vscode', () => ({
  commands: { executeCommand: mocks.executeCommand },
  Uri: { file: mocks.uriFile }
}));

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

test('opens the read-only XHTML sibling with the archive URI', () => {
  const dialogUri = { scheme: 'axonivy-iar-content', path: '/shared.iar/dialog/My Dialog.xhtml', query: 'archive=%2Fdeps%2Fshared.iar' };
  const uri = {
    scheme: dialogUri.scheme,
    path: '/shared.iar/dialog/My DialogData.d.json',
    query: dialogUri.query,
    with: vi.fn().mockReturnValue(dialogUri)
  };
  const exists = vi.spyOn(fs, 'existsSync');

  openForm(uri, true);

  expect(uri.with).toHaveBeenCalledWith({ path: '/shared.iar/dialog/My Dialog.xhtml' });
  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', dialogUri);
  expect(exists).not.toHaveBeenCalled();
  expect(mocks.uriFile).not.toHaveBeenCalled();
});

test.each([
  [true, '/project/dialog/Example.f.json'],
  [false, '/project/dialog/Example.xhtml']
])('opens the local dialog with form existence %s', (formExists, expectedPath) => {
  vi.spyOn(fs, 'existsSync').mockReturnValue(formExists);

  openForm({ scheme: 'file', path: '/project/dialog/ExampleData.d.json' }, false);

  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', { scheme: 'file', path: expectedPath });
});
