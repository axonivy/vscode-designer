import { afterEach, expect, test, vi } from 'vitest';

const { createUserDialog, readFile } = vi.hoisted(() => ({
  createUserDialog: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn()
}));

vi.mock('../../engine/engine-manager', () => ({
  IvyEngineManager: {
    get instance() {
      return { createUserDialog };
    }
  }
}));

vi.mock('vscode', () => ({
  l10n: {
    t: (message: string, ...args: unknown[]) =>
      args.reduce<string>((result, arg, index) => result.replace(`{${index}}`, String(arg)), message)
  },
  LanguageModelTextPart: class {
    constructor(public value: string) {}
  },
  LanguageModelToolResult: class {
    constructor(public content: unknown[]) {}
  },
  MarkdownString: class {
    constructor(public value: string) {}
  },
  Uri: {
    parse: vi.fn(),
    file: (fsPath: string) => ({ fsPath }),
    joinPath: (base: { fsPath: string }, ...segments: string[]) => ({ fsPath: [base.fsPath, ...segments].join('/') })
  },
  workspace: { fs: { readFile } }
}));

import { createNewDialog } from './new-dialog';

afterEach(() => {
  createUserDialog.mockClear();
  readFile.mockReset();
});

const pomWithGroupId = (groupId: string) => Buffer.from(`<project><groupId>${groupId}</groupId></project>`);

test('defaults an omitted namespace to the project namespace from pom.xml', async () => {
  readFile.mockResolvedValue(pomWithGroupId('com.acme-corp'));

  await createNewDialog({ name: 'OrderForm', projectPath: '/workspace/purchase' });

  expect(readFile).toHaveBeenCalledWith({ fsPath: '/workspace/purchase/pom.xml' });
  expect(createUserDialog).toHaveBeenCalledWith({
    name: 'OrderForm',
    namespace: 'com.acme.corp',
    projectDir: '/workspace/purchase',
    type: 'Form'
  });
});

test('keeps an explicitly requested namespace', async () => {
  readFile.mockResolvedValue(pomWithGroupId('com.acme'));

  await createNewDialog({ name: 'OrderForm', namespace: 'purchase.order', projectPath: '/workspace/purchase' });

  expect(readFile).not.toHaveBeenCalled();
  expect(createUserDialog).toHaveBeenCalledWith(expect.objectContaining({ namespace: 'purchase.order' }));
});
