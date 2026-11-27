import path from 'path';
import { afterEach, expect, test, vi } from 'vitest';

const { createUserDialog, getIvyProjects, readFile } = vi.hoisted(() => ({
  createUserDialog: vi.fn().mockResolvedValue(undefined),
  getIvyProjects: vi.fn<() => Promise<string[]>>(),
  readFile: vi.fn()
}));

vi.mock('../../engine/engine-manager', () => ({
  IvyEngineManager: {
    get instance() {
      return { createUserDialog };
    }
  }
}));

vi.mock('../../project-explorer/ivy-project-manager', () => ({
  IvyProjectManager: { instance: { getIvyProjects } }
}));

const windowsDrive = /^[a-z]:[/\\]/i;

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
    file: (fsPath: string) => ({
      fsPath: windowsDrive.test(fsPath) ? fsPath.replace(/^[A-Z]/, drive => drive.toLowerCase()).replaceAll('/', '\\') : fsPath
    }),
    joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
      fsPath: [base.fsPath, ...segments].join(windowsDrive.test(base.fsPath) ? '\\' : '/')
    })
  },
  workspace: { fs: { readFile } }
}));

import { createNewDialog } from './new-dialog';

afterEach(() => {
  vi.restoreAllMocks();
  createUserDialog.mockClear();
  getIvyProjects.mockReset();
  readFile.mockReset();
});

const pomWithGroupId = (groupId: string) => Buffer.from(`<project><groupId>${groupId}</groupId></project>`);

test('defaults an omitted namespace to the project namespace from pom.xml', async () => {
  getIvyProjects.mockResolvedValue(['/workspace/purchase']);
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
  getIvyProjects.mockResolvedValue(['/workspace/purchase']);
  readFile.mockResolvedValue(pomWithGroupId('com.acme'));

  await createNewDialog({ name: 'OrderForm', namespace: 'purchase.order', projectPath: '/workspace/purchase' });

  expect(readFile).not.toHaveBeenCalled();
  expect(createUserDialog).toHaveBeenCalledWith(expect.objectContaining({ namespace: 'purchase.order' }));
});

test('normalizes Windows project paths before sending them to the engine', async () => {
  vi.spyOn(path, 'isAbsolute').mockImplementation(path.win32.isAbsolute);
  const projectDir = 'c:\\work\\purchase';
  getIvyProjects.mockResolvedValue([projectDir]);

  await createNewDialog({ name: 'OrderForm', namespace: 'purchase.order', projectPath: 'C:/work/purchase' });

  expect(createUserDialog).toHaveBeenCalledWith(expect.objectContaining({ projectDir }));
});
