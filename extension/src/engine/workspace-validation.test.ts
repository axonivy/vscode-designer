import { beforeEach, describe, expect, test, vi } from 'vitest';
import { State } from 'vscode-languageclient/node';
import { WorkspaceValidation } from './workspace-validation';

const { showErrorMessage, createOutputChannel, output, statusBar } = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  createOutputChannel: vi.fn(),
  output: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), show: vi.fn(), dispose: vi.fn() },
  statusBar: { overrideStatusBar: vi.fn(), showTemporarySuccess: vi.fn(), refreshStatusBar: vi.fn() }
}));

vi.mock('vscode', () => ({
  l10n: { t: (message: string) => message },
  window: { createOutputChannel, showErrorMessage }
}));

vi.mock('../base/status-bar', () => ({ StatusBar: statusBar, newMarkdownString: (text: string) => text }));
vi.mock('vscode-languageclient/node', () => ({ State: { Running: 2, Stopped: 1 } }));

const mockClient = () => {
  const onNotification = vi.fn().mockReturnValue({ dispose: vi.fn() });
  const onDidChangeState = vi.fn().mockReturnValue({ dispose: vi.fn() });
  return {
    onNotification,
    onDidChangeState,
    notify: (event: object) => onNotification.mock.calls[0]?.[1](event),
    disconnect: () => onDidChangeState.mock.calls[0]?.[0]({ oldState: State.Running, newState: State.Stopped })
  };
};

describe('workspace validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createOutputChannel.mockReturnValue(output);
    showErrorMessage.mockResolvedValue(undefined);
  });

  test('keeps the existing status bar busy until both runs finish and logs their durations', () => {
    const validation = new WorkspaceValidation();
    const ivy = mockClient();
    const xhtml = mockClient();
    validation.watch('Ivy', ivy);
    validation.watch('XHTML', xhtml);
    expect(createOutputChannel).toHaveBeenCalledExactlyOnceWith('Axon Ivy Validation', { log: true });
    expect(statusBar.overrideStatusBar).not.toHaveBeenCalled();

    ivy.notify({ runId: 'ivy-1', phase: 'STARTED' });
    xhtml.notify({ runId: 'xhtml-1', phase: 'STARTED' });
    expect(statusBar.overrideStatusBar).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ text: 'Validating workspace...', icon: '$(loading~spin)' })
    );

    ivy.notify({ runId: 'ivy-1', phase: 'FINISHED', durationMs: 42 });
    expect(statusBar.showTemporarySuccess).not.toHaveBeenCalled();
    xhtml.notify({ runId: 'xhtml-1', phase: 'WARNING', message: 'File validation failed' });
    xhtml.notify({ runId: 'xhtml-1', phase: 'FINISHED', durationMs: 130 });

    expect(statusBar.showTemporarySuccess).toHaveBeenCalledExactlyOnceWith('Validation successful');
    expect(showErrorMessage).not.toHaveBeenCalled();
    expect(output.info.mock.calls.flat()).toEqual([
      '[ivy-1] Ivy Workspace validation started.',
      '[xhtml-1] XHTML Workspace validation started.',
      '[ivy-1] Ivy Workspace validation finished in 42 ms.',
      '[xhtml-1] XHTML Workspace validation finished in 130 ms.'
    ]);
    expect(output.warn).toHaveBeenCalledWith('[xhtml-1] XHTML Workspace validation: File validation failed');
    validation.dispose();
  });

  test('offers to open the shared channel on failure without clearing another active run', async () => {
    const validation = new WorkspaceValidation();
    const ivy = mockClient();
    const xhtml = mockClient();
    validation.watch('Ivy', ivy);
    validation.watch('XHTML', xhtml);

    xhtml.notify({ runId: 'xhtml-1', phase: 'STARTED' });
    ivy.notify({ runId: 'ivy-1', phase: 'STARTED' });
    xhtml.disconnect();
    expect(statusBar.refreshStatusBar).not.toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledWith('[xhtml-1] XHTML Workspace validation interrupted: language server disconnected.');
    ivy.notify({ runId: 'ivy-1', phase: 'FINISHED', durationMs: 12 });
    expect(statusBar.refreshStatusBar).toHaveBeenCalledOnce();
    expect(showErrorMessage).toHaveBeenCalledExactlyOnceWith('Workspace validation did not complete', 'Open Validation Output');
    await Promise.resolve();
    expect(output.show).not.toHaveBeenCalled();

    showErrorMessage.mockResolvedValueOnce('Open Validation Output');
    ivy.notify({ runId: 'ivy-2', phase: 'STARTED' });
    ivy.notify({ runId: 'ivy-2', phase: 'FAILED', durationMs: 24, message: 'Unexpected error' });
    expect(statusBar.refreshStatusBar).toHaveBeenCalledTimes(2);
    expect(output.error).toHaveBeenCalledWith('[ivy-2] Ivy Workspace validation failed after 24 ms: Unexpected error');
    await Promise.resolve();
    expect(output.show).toHaveBeenCalledOnce();

    ivy.notify({ runId: 'ivy-3', phase: 'STARTED' });
    ivy.notify({ runId: 'ivy-3', phase: 'FINISHED', durationMs: 3 });
    expect(statusBar.showTemporarySuccess).toHaveBeenCalledExactlyOnceWith('Validation successful');
    validation.dispose();
  });
});
