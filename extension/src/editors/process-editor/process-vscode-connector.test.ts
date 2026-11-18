import { beforeEach, expect, test, vi } from 'vitest';
import { MessageOrigin, type ActionMessage, type NavigateToExternalTargetAction } from '@eclipse-glsp/vscode-integration';
import { ProcessVscodeConnector } from './process-vscode-connector';

const mocks = vi.hoisted(() => ({
  parseUri: vi.fn(),
  convertIarUri: vi.fn(),
  executeCommand: vi.fn()
}));

vi.mock('vscode', () => ({
  EventEmitter: class {
    event = vi.fn();
  },
  Uri: { parse: mocks.parseUri },
  commands: { executeCommand: mocks.executeCommand },
  window: { createStatusBarItem: () => ({}) }
}));

vi.mock('@eclipse-glsp/vscode-integration', () => ({
  GlspVscodeConnector: class {
    clientMap = new Map();
    disposables = [];
    onSelectionUpdate() {}
  },
  MessageOrigin: { SERVER: 'SERVER' }
}));

vi.mock('@eclipse-glsp/protocol', () => ({
  NavigationTarget: { getElementIds: () => [] }
}));

vi.mock('@axonivy/process-editor-protocol', () => ({}));

vi.mock('../../base/logging-util', () => ({
  logErrorMessage: vi.fn(),
  logInformationMessage: vi.fn(),
  logWarningMessage: vi.fn()
}));
vi.mock('../../project-explorer/iar-content-provider', () => ({ iarContentUriFromEngineUri: mocks.convertIarUri }));
vi.mock('./process-breakpoint-handler', () => ({
  ProcessBreakpointHandler: class {
    register() {}
  }
}));
vi.mock('./process-editor-provider', () => ({ default: { viewType: 'ivy.glspDiagram' } }));

class TestConnector extends ProcessVscodeConnector {
  navigate(message: ActionMessage<NavigateToExternalTargetAction>) {
    return this.handleNavigateToExternalTargetAction(message, undefined, MessageOrigin.SERVER);
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.executeCommand.mockResolvedValue(undefined);
});

const navigate = (absolutePath: string, isIar?: string) => {
  const connector = new TestConnector({} as never);
  const target = { uri: absolutePath, args: { absolutePath, ...(isIar === undefined ? {} : { isIar }) } };
  connector.navigate({ clientId: 'client', action: { kind: 'navigateToExternalTarget', target } });
};

test.each(['', 'jar:'])('converts a non-process target with prefix "%s" when isIar is true', prefix => {
  const fileUri = 'file:///shared.iar!/META-INF/ivy/Data.d.json';
  const originalUri = { path: '/shared.iar!/META-INF/ivy/Data.d.json' };
  const archiveUri = { scheme: 'axonivy-iar-content' };
  mocks.parseUri.mockReturnValue(originalUri);
  mocks.convertIarUri.mockReturnValue(archiveUri);

  navigate(`${prefix}${fileUri}`, 'true');

  expect(mocks.parseUri).toHaveBeenCalledWith(fileUri);
  expect(mocks.convertIarUri).toHaveBeenCalledWith(originalUri);
  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', archiveUri);
});

test.each(['false', undefined])('does not convert a non-process target when isIar is %s', isIar => {
  const originalUri = { path: '/shared.iar!/META-INF/ivy/Data.d.json' };
  mocks.parseUri.mockReturnValue(originalUri);

  navigate('file:///shared.iar!/META-INF/ivy/Data.d.json', isIar);

  expect(mocks.convertIarUri).not.toHaveBeenCalled();
  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', originalUri);
});

test('keeps process navigation unchanged for IAR targets', () => {
  const processUri = { toString: () => 'file:///shared.iar!/META-INF/ivy/Process.p.json' };
  mocks.parseUri.mockReturnValue(processUri);

  navigate('file:///shared.iar!/META-INF/ivy/Process.p.json', 'true');

  expect(mocks.convertIarUri).not.toHaveBeenCalled();
  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.openWith', processUri, 'ivy.glspDiagram');
});
