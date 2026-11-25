import { beforeEach, expect, test, vi } from 'vitest';
import { setupCommunication } from './webview-communication';

const mocks = vi.hoisted(() => ({ executeCommand: vi.fn(), notification: vi.fn() }));
vi.mock('vscode', () => ({
  commands: { executeCommand: mocks.executeCommand },
  window: { onDidChangeActiveColorTheme: () => ({ dispose() {} }) },
  ColorThemeKind: {},
  l10n: { t: (message: string) => message }
}));
vi.mock('vscode-languageclient', () => import('vscode-languageserver-protocol'));
vi.mock('@eclipse-glsp/vscode-integration', () => ({ DisposableCollection: class { dispose() {} } }));
vi.mock('../websocket-forwarder', () => ({ WebSocketForwarder: class { dispose() {} } }));
vi.mock('../java-provider', () => ({ JavaProvider: class { hover = vi.fn(); } }));
vi.mock('../../base/logging-util', () => ({ logErrorMessage: vi.fn(), logInformationMessage: vi.fn() }));
vi.mock('./inscription-view/action-handlers', () => ({ handleActionLocal: vi.fn() }));
vi.mock('../../views/browser/ivy-browser-view-provider', () => ({ IvyBrowserViewProvider: {} }));

beforeEach(() => vi.clearAllMocks());

const bindWebview = () => {
  const uri = { scheme: 'file', fsPath: '/workspace/owning-project/process/start.p.json' };
  const participant = { type: 'webview', webviewId: 'owning-webview' };
  setupCommunication(
    new URL('ws://localhost'),
    { onNotification: mocks.notification, onRequest: vi.fn() } as never,
    { onDidDispose: vi.fn() } as never,
    { uri } as never,
    participant as never
  );
  return { uri, participant };
};

test('binds the download notification to the sending webview and its document', async () => {
  const { uri, participant } = bindWebview();
  const [, handler, options] = mocks.notification.mock.calls.find(call => call[0].method === 'java/downloadDependencySources') ?? [];
  expect(options).toEqual({ sender: participant });
  await handler();
  expect(mocks.executeCommand).toHaveBeenCalledWith('ivyProjects.downloadDependencySources', uri);
});

test('ignores command/path arguments supplied by a download notification', async () => {
  const { uri } = bindWebview();
  const [, handler] = mocks.notification.mock.calls.find(call => call[0].method === 'java/downloadDependencySources') ?? [];
  await handler({ command: 'arbitrary.command', path: '/another/project/pom.xml' });
  expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('ivyProjects.downloadDependencySources', uri);
});
