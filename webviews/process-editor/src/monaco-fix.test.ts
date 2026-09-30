import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupCutShortcutHandler } from './monaco-fix';

const { monaco } = vi.hoisted(() => ({ monaco: vi.fn() }));
vi.mock('@axonivy/process-editor-inscription-view', () => ({
  MonacoUtil: { monaco }
}));

class TestDataTransfer {
  private data = new Map<string, string>();

  setData(type: string, text: string) {
    this.data.set(type, text);
  }

  getData(type: string) {
    return this.data.get(type) ?? '';
  }
}

class TestClipboardEvent extends Event {
  readonly clipboardData;

  constructor(type: string, options: ClipboardEventInit) {
    super(type, options);
    this.clipboardData = options.clipboardData;
  }
}

const pendingWrite = () => {
  let resolve: () => void = () => {
    throw new Error('Pending write was not initialized');
  };
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
};

const createFixture = () => {
  let handler: ((event: KeyboardEvent) => Promise<void>) | undefined;
  const addEventListener = vi.fn((type: string, listener: (event: KeyboardEvent) => Promise<void>) => {
    handler = listener;
  });
  vi.stubGlobal('document', { addEventListener });
  vi.stubGlobal('window', { location: { protocol: 'vscode-webview:' } });
  vi.stubGlobal('DataTransfer', TestDataTransfer);
  vi.stubGlobal('ClipboardEvent', TestClipboardEvent);

  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });

  const changes = new Map<string, () => void>();
  const disposables: { dispose: ReturnType<typeof vi.fn> }[] = [];
  const subscribe = (name: string) => (listener: () => void) => {
    changes.set(name, listener);
    const disposable = { dispose: vi.fn(() => changes.delete(name)) };
    disposables.push(disposable);
    return disposable;
  };
  const model = { getVersionId: vi.fn(() => 1) };
  let text = 'alpha beta';
  let selection = { start: 0, end: 5 };
  const target = {
    closest: vi.fn<() => object | null>(() => ({})),
    isConnected: true,
    dispatchEvent: vi.fn((event: TestClipboardEvent) => {
      if (event.type === 'copy') {
        event.clipboardData?.setData('text/plain', text.slice(selection.start, selection.end));
        event.preventDefault();
      }
      return !event.defaultPrevented;
    })
  };
  const editor = {
    getDomNode: vi.fn(() => ({ contains: (element: object) => element === target })),
    getModel: vi.fn(() => model),
    hasTextFocus: vi.fn(() => true),
    onDidChangeCursorSelection: subscribe('selection'),
    onDidChangeModelContent: subscribe('content'),
    onDidChangeModel: subscribe('model'),
    onDidBlurEditorText: subscribe('blur'),
    onDidDispose: subscribe('dispose'),
    trigger: vi.fn(() => {
      text = text.slice(0, selection.start) + text.slice(selection.end);
      changes.get('content')?.();
    })
  };
  monaco.mockResolvedValue({ editor: { getEditors: () => [editor] } });

  const keydown = (overrides: Partial<KeyboardEvent> = {}) =>
    ({
      key: 'x',
      ctrlKey: true,
      metaKey: false,
      target,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      ...overrides
    }) as KeyboardEvent;

  return {
    addEventListener,
    writeText,
    target,
    editor,
    model,
    changes,
    disposables,
    keydown,
    cut: (event = keydown()) => {
      if (!handler) {
        throw new Error('Cut handler was not registered');
      }
      return handler(event);
    },
    getText: () => text,
    setSelection: (start: number, end: number) => {
      selection = { start, end };
      changes.get('selection')?.();
    }
  };
};

describe('Monaco clipboard cut', () => {
  let fixture: ReturnType<typeof createFixture>;

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fixture = createFixture();
    await setupCutShortcutHandler();
  });

  afterEach(() => {
    expect(fixture.disposables.every(listener => listener.dispose.mock.calls.length === 1)).toBe(true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test.each(['Control', 'Meta'])('cuts only after a successful %s+X clipboard write', async modifier => {
    const event = fixture.keydown({ ctrlKey: modifier === 'Control', metaKey: modifier === 'Meta' });
    fixture.writeText.mockImplementation(async text => {
      expect(text).toBe('alpha');
      expect(fixture.getText()).toBe('alpha beta');
      expect(fixture.editor.trigger).not.toHaveBeenCalled();
    });

    await fixture.cut(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(fixture.writeText).toHaveBeenCalledExactlyOnceWith('alpha');
    expect(fixture.editor.trigger).toHaveBeenCalledExactlyOnceWith('keyboard', 'cut', undefined);
    expect(fixture.getText()).toBe(' beta');
    expect(fixture.target.dispatchEvent).toHaveBeenCalledOnce();
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('does not delete when a clipboard write is rejected', async () => {
    const error = new Error('Clipboard permission denied');
    fixture.writeText.mockRejectedValue(error);

    await fixture.cut();

    expect(fixture.getText()).toBe('alpha beta');
    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Clipboard cut failed:', error);
  });

  test('does not delete when clipboard writing is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await fixture.cut();

    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    expect(fixture.getText()).toBe('alpha beta');
    expect(console.error).toHaveBeenCalled();
  });

  test.each(['empty', 'unhandled', 'throws'])('does not write or delete when copy capture is %s', async failure => {
    if (failure === 'empty') {
      fixture.setSelection(0, 0);
    } else if (failure === 'unhandled') {
      fixture.target.dispatchEvent.mockReturnValue(true);
    } else {
      fixture.target.dispatchEvent.mockImplementation(() => {
        throw new Error('Copy capture failed');
      });
    }

    await fixture.cut();

    expect(fixture.writeText).not.toHaveBeenCalled();
    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    expect(fixture.getText()).toBe('alpha beta');
    expect(console.error).toHaveBeenCalledOnce();
  });

  test('preserves whitespace-only captured text', async () => {
    fixture.setSelection(5, 6);

    await fixture.cut();

    expect(fixture.writeText).toHaveBeenCalledExactlyOnceWith(' ');
    expect(fixture.getText()).toBe('alphabeta');
  });

  test.each(['selection', 'content', 'model', 'blur', 'dispose'])('cancels deletion when %s changes during an asynchronous write', async change => {
    const write = pendingWrite();
    fixture.writeText.mockReturnValue(write.promise);

    const cut = fixture.cut();
    expect(fixture.writeText).toHaveBeenCalledWith('alpha');
    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    if (change === 'selection') {
      fixture.setSelection(6, 10);
    } else {
      fixture.changes.get(change)?.();
    }
    write.resolve();
    await cut;

    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    expect(fixture.getText()).toBe('alpha beta');
    expect(console.warn).toHaveBeenCalledOnce();
  });

  test('does not delete a changed selection even when it moves back before the write finishes', async () => {
    const write = pendingWrite();
    fixture.writeText.mockReturnValue(write.promise);

    const cut = fixture.cut();
    fixture.setSelection(6, 10);
    fixture.setSelection(0, 5);
    write.resolve();
    await cut;

    expect(fixture.writeText).toHaveBeenCalledExactlyOnceWith('alpha');
    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    expect(fixture.getText()).toBe('alpha beta');
  });

  test('cuts an unchanged selection after a delayed successful write', async () => {
    const write = pendingWrite();
    fixture.writeText.mockReturnValue(write.promise);

    const cut = fixture.cut();
    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    write.resolve();
    await cut;

    expect(fixture.getText()).toBe(' beta');
    expect(fixture.editor.trigger).toHaveBeenCalledOnce();
  });

  test('does not delete after the target is detached', async () => {
    const write = pendingWrite();
    fixture.writeText.mockReturnValue(write.promise);

    const cut = fixture.cut();
    fixture.target.isConnected = false;
    write.resolve();
    await cut;

    expect(fixture.editor.trigger).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledOnce();
  });

  test('does not intercept unrelated shortcuts or non-Monaco targets', async () => {
    await fixture.cut(fixture.keydown({ key: 'c' }));
    await fixture.cut(fixture.keydown({ ctrlKey: false }));
    fixture.target.closest.mockReturnValue(null);
    Object.assign(fixture.target, { classList: { contains: () => false } });
    const event = fixture.keydown();
    await fixture.cut(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(fixture.writeText).not.toHaveBeenCalled();
    expect(fixture.editor.trigger).not.toHaveBeenCalled();
  });

  test('leaves native browser cut handling unchanged', async () => {
    vi.stubGlobal('window', { location: { protocol: 'https:' } });
    fixture.addEventListener.mockClear();
    monaco.mockClear();

    await setupCutShortcutHandler();

    expect(monaco).not.toHaveBeenCalled();
    expect(fixture.addEventListener).not.toHaveBeenCalled();
  });
});
