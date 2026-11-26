import { beforeEach, expect, test, vi } from 'vitest';
import type { TextDocument } from 'vscode';
import { updateTextDocumentContent } from '../content-writer';
import { setupCommunication } from './webview-communication';

const mocks = vi.hoisted(() => ({
  clientMessage: (message: unknown): void => {
    throw new Error(`No client handler for ${String(message)}`);
  },
  serverMessage: (message: string): void => {
    throw new Error(`No server handler for ${message}`);
  },
  baseConstructor: vi.fn(),
  forwardServerMessage: vi.fn(),
  executeCommand: vi.fn(),
  getComponentForm: vi.fn(),
  iarContentUriFromEngineUri: vi.fn()
}));

vi.mock('vscode', () => ({
  commands: { executeCommand: mocks.executeCommand },
  Uri: {
    file: (path: string) => ({ scheme: 'file', path }),
    parse: (path: string) => ({ parsed: path })
  }
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
      readonly document: TextDocument,
      engineFileName: string
    ) {
      mocks.baseConstructor(engineFileName);
      mocks.clientMessage = message => this.handleClientMessage(message);
      mocks.serverMessage = message => this.handleServerMessage(message);
    }

    handleClientMessage(message: unknown) {
      return message;
    }

    handleServerMessage(message: string) {
      mocks.forwardServerMessage(message);
    }
  }
}));

vi.mock('../content-writer', () => ({ updateTextDocumentContent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../engine/engine-manager', () => ({
  IvyEngineManager: { instance: { engineApi: { getComponentForm: mocks.getComponentForm } } }
}));
vi.mock('../../project-explorer/iar-content-provider', async importOriginal => {
  const actual = await importOriginal<typeof import('../../project-explorer/iar-content-provider')>();
  return { ...actual, iarContentUriFromEngineUri: mocks.iarContentUriFromEngineUri };
});
vi.mock('../../views/browser/ivy-browser-view-provider', () => ({ IvyBrowserViewProvider: {} }));
vi.mock('../../base/logging-util', () => ({ logErrorMessage: vi.fn(), logInformationMessage: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getComponentForm.mockReset();
  mocks.iarContentUriFromEngineUri.mockReset();
});

const archiveUri = () => {
  const uri = {
    scheme: 'axonivy-iar-content',
    path: '/shared.iar/dialog/My Dialog.f.json',
    query: 'archive=%2Fdeps%2Fshared+lib.iar',
    with: ({ path }: { path: string }) => ({ scheme: uri.scheme, path, query: uri.query })
  };
  return uri;
};

const startEditor = (uri: object, engineFileName: string, readOnly: boolean) => {
  const document = { uri, fileName: '/unused' };
  let ready = (): void => {
    throw new Error('No ready handler');
  };
  const messenger = {
    registerWebviewPanel: vi.fn().mockReturnValue('participant'),
    onNotification: vi.fn((_type: unknown, handler: () => void) => {
      ready = handler;
    }),
    sendNotification: vi.fn()
  };
  setupCommunication(
    new URL('ws://localhost'),
    messenger as never,
    { onDidDispose: vi.fn() } as never,
    document as never,
    engineFileName,
    readOnly
  );
  return { document, messenger, ready: () => ready() };
};

test.each([true, false])('initializes the form editor with its engine filename and read-only state %s', readOnly => {
  const engineFileName = readOnly ? '/deps/shared lib.iar!/META-INF/ivy/dialog/My Dialog.f.json' : '/project/dialog/My Dialog.f.json';
  const { messenger, ready } = startEditor(archiveUri(), engineFileName, readOnly);

  ready();

  expect(messenger.sendNotification).toHaveBeenCalledWith(
    { method: 'initializeConnection' },
    'participant',
    { file: engineFileName, readOnly }
  );
  expect(mocks.baseConstructor).toHaveBeenCalledWith(engineFileName);
});

test('opens the read-only data class with the archive URI', () => {
  const uri = archiveUri();
  startEditor(uri, '/deps/shared lib.iar!/META-INF/ivy/dialog/My Dialog.f.json', true);

  mocks.clientMessage({ method: 'action', params: { actionId: 'openDataClass' } });

  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', {
    scheme: uri.scheme,
    path: '/shared.iar/dialog/My DialogData.d.json',
    query: uri.query
  });
});

test('opens the read-only process using the tree engine file URI', () => {
  startEditor(archiveUri(), '/deps/shared lib.iar!/META-INF/ivy/dialog/My Dialog.f.json', true);

  mocks.clientMessage({ method: 'action', params: { actionId: 'openProcess' } });

  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', {
    scheme: 'file',
    path: '/deps/shared lib.iar!/META-INF/ivy/dialog/My DialogProcess.p.json'
  });
});

test('opens component forms from IAR archives in the archive content view', async () => {
  const engineFormUri = 'jar:file:///deps/shared%20lib.iar!/META-INF/ivy/dialog/Component.f.json';
  const parsedFormUri = 'file:///deps/shared%20lib.iar!/META-INF/ivy/dialog/Component.f.json';
  const archiveContentUri = {
    scheme: 'axonivy-iar-content',
    path: '/shared.iar/dialog/Component.f.json',
    query: 'archive=%2Fdeps%2Fshared+lib.iar'
  };
  mocks.getComponentForm.mockResolvedValue({ uri: engineFormUri });
  mocks.iarContentUriFromEngineUri.mockReturnValue(archiveContentUri);
  startEditor(archiveUri(), '/deps/shared lib.iar!/META-INF/ivy/dialog/Parent.f.json', false);

  mocks.clientMessage({
    method: 'action',
    params: { actionId: 'openComponent', payload: 'component-id', context: { project: 'project' } }
  });

  await vi.waitFor(() =>
    expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', archiveContentUri)
  );
  expect(mocks.iarContentUriFromEngineUri).toHaveBeenCalledWith({ parsed: parsedFormUri });
});

test('opens component forms outside IAR archives using their parsed URI', async () => {
  const formUri = 'file:///project/dialog/Component.f.json';
  mocks.getComponentForm.mockResolvedValue({ uri: formUri });
  mocks.iarContentUriFromEngineUri.mockReturnValue(undefined);
  startEditor({ scheme: 'file', path: '/project/dialog/Parent.f.json' }, '/project/dialog/Parent.f.json', false);

  mocks.clientMessage({
    method: 'action',
    params: { actionId: 'openComponent', payload: 'component-id', context: { project: 'project' } }
  });

  await vi.waitFor(() => expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', { parsed: formUri }));
  expect(mocks.iarContentUriFromEngineUri).toHaveBeenCalledWith({ parsed: formUri });
});

test.each([
  ['openDataClass', { parsed: '/project/dialog/ExampleData.d.json' }],
  ['openProcess', { scheme: 'file', path: '/project/dialog/ExampleProcess.p.json' }]
])('keeps local %s navigation unchanged', (actionId, expectedUri) => {
  startEditor(
    {
      scheme: 'file',
      path: '/project/dialog/Example.f.json',
      with: ({ path }: { path: string }) => ({ scheme: 'file', path })
    },
    '/project/dialog/Example.f.json',
    false
  );

  mocks.clientMessage({ method: 'action', params: { actionId } });

  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', expectedUri);
});

test.each([true, false])('only writes server content for a writable document (read-only: %s)', async readOnly => {
  const { document } = startEditor(archiveUri(), '/deps/shared lib.iar!/META-INF/ivy/dialog/My Dialog.f.json', readOnly);
  const message = JSON.stringify({ result: { content: 'updated' } });

  mocks.serverMessage(message);

  await vi.waitFor(() => expect(mocks.forwardServerMessage).toHaveBeenCalledWith(message));
  if (readOnly) {
    expect(updateTextDocumentContent).not.toHaveBeenCalled();
  } else {
    expect(updateTextDocumentContent).toHaveBeenCalledWith(document, { content: 'updated' });
  }
});
