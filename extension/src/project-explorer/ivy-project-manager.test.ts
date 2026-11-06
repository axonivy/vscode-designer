import path from 'path';
import { beforeEach, expect, test, vi } from 'vitest';
import { DiagnosticSeverity, type Diagnostic, type ExtensionContext, type Uri } from 'vscode';
import type { IvyProjectManager } from './ivy-project-manager';

const mocks = vi.hoisted(() => ({
  findFiles: vi.fn(),
  executeCommand: vi.fn(),
  diagnostics: new Map<string, Diagnostic[]>(),
  initProjects: vi.fn(),
  logErrorMessageWithActions: vi.fn<(message: string, actions: Record<string, () => void>) => Promise<void>>()
}));

vi.mock('vscode', () => ({
  Diagnostic: class {
    constructor(
      public range: unknown,
      public message: string,
      public severity: number
    ) {}
  },
  DiagnosticSeverity: { Error: 0 },
  Range: class {
    constructor(
      public startLine: number,
      public startCharacter: number,
      public endLine: number,
      public endCharacter: number
    ) {}
  },
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
  },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  languages: {
    createDiagnosticCollection: () => ({
      clear: () => mocks.diagnostics.clear(),
      set: (uri: Uri, diagnostics: Diagnostic[]) => mocks.diagnostics.set(uri.fsPath, diagnostics),
      forEach: (callback: () => void) => mocks.diagnostics.forEach(callback)
    })
  },
  workspace: {
    findFiles: mocks.findFiles,
    onDidChangeWorkspaceFolders: vi.fn()
  },
  commands: { executeCommand: mocks.executeCommand },
  l10n: {
    t: (message: string, ...args: unknown[]) =>
      args.reduce<string>((text, arg, index) => text.replace(`{${index}}`, String(arg)), message)
  }
}));

vi.mock('../base/commands', () => ({ executeCommand: mocks.executeCommand }));
vi.mock('../base/configurations', () => ({
  config: { projectExcludePattern: () => '', projectMaximumNumber: () => 50 }
}));
vi.mock('../base/java-extension-api', () => ({ runJavaProjectImport: vi.fn() }));
vi.mock('../base/logging-util', () => ({ logErrorMessageWithActions: mocks.logErrorMessageWithActions }));
vi.mock('../engine/diagnostics', () => ({ IvyDiagnostics: { instance: { refresh: vi.fn() } } }));
vi.mock('../engine/engine-manager', () => ({
  IvyEngineManager: { instance: { projects: async () => [], initProjects: mocks.initProjects } }
}));

let manager: IvyProjectManager;

const findProjects = async (projectPaths: string[]) => {
  mocks.findFiles.mockResolvedValue(projectPaths.map(p => ({ fsPath: path.join(p, '.ivyproject') })));
  await manager.refresh();
  return manager.getIvyProjects();
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  mocks.findFiles.mockResolvedValue([]);
  const { IvyProjectManager } = await import('./ivy-project-manager');
  const context: Partial<ExtensionContext> = { subscriptions: [] };
  await IvyProjectManager.init(context as ExtensionContext);
  manager = IvyProjectManager.instance;
  await manager.getIvyProjects();
});

test('keeps distinct projects sorted and deduplicates project paths', async () => {
  expect(await findProjects(['/workspace/z', '/workspace/a', '/workspace/z'])).toEqual(['/workspace/a', '/workspace/z']);
  expect(mocks.diagnostics.size).toBe(0);
  expect(await manager.hasErrors()).toBe(false);
  expect(mocks.executeCommand).toHaveBeenLastCalledWith('setContext', 'ivy:hasIvyProjects', true);
  expect(mocks.logErrorMessageWithActions).not.toHaveBeenCalled();
});

test('reports both base-name and sanitized-name collisions for duplicate base names', async () => {
  const projectPaths = ['/workspace/one/demo', '/workspace/two/demo'];
  expect(await findProjects(projectPaths)).toEqual([]);
  for (const projectPath of projectPaths) {
    const diagnostics = mocks.diagnostics.get(projectPath);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics?.map(d => d.message)).toEqual([
      `Multiple project directories resolve to the same name 'demo':\n${projectPaths.join('\n')}.\nPlease cleanup the workspace.`,
      `Multiple project directories resolve to the same sanitized name 'demo':\n${projectPaths.join('\n')}.\nPlease cleanup the workspace.`
    ]);
    for (const diagnostic of diagnostics ?? []) {
      expect(diagnostic.source).toBe('Axon Ivy Project Search');
      expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
      projectPaths.forEach(p => expect(diagnostic.message).toContain(p));
    }
  }
  expect(await manager.hasErrors()).toBe(true);
  expect(mocks.executeCommand).toHaveBeenLastCalledWith('setContext', 'ivy:hasIvyProjects', false);
});

test('reports only sanitized-name collisions for different names with the same sanitized name', async () => {
  const projectPaths = ['/workspace/demo.one', '/workspace/demo-one'];
  expect(await findProjects([...projectPaths, '/workspace/unique'])).toEqual(['/workspace/unique']);
  for (const projectPath of projectPaths) {
    const diagnostics = mocks.diagnostics.get(projectPath);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics?.[0]?.message).toBe(
      `Multiple project directories resolve to the same sanitized name 'demo-one':\n${projectPaths.join('\n')}.\nPlease cleanup the workspace.`
    );
  }
  expect(mocks.diagnostics.has('/workspace/unique')).toBe(false);
});

test('offers an action to focus the Problems view for sanitized-name collisions', async () => {
  await findProjects(['/workspace/demo.one', '/workspace/demo-one']);
  expect(mocks.logErrorMessageWithActions).toHaveBeenCalledWith(
    expect.stringContaining('The resulting name is truncated to a maximum of 40 characters.'),
    { 'Show Problem View': expect.any(Function) }
  );
  const actions = mocks.logErrorMessageWithActions.mock.lastCall?.[1];
  expect(actions?.['Show Problem View']).toBeTypeOf('function');
  actions?.['Show Problem View']?.();
  expect(mocks.executeCommand).toHaveBeenLastCalledWith('workbench.panel.markers.view.focus');
});

test('records different collision lists per project path', async () => {
  const projectPaths = ['/workspace/one/demo.one', '/workspace/two/demo.one', '/workspace/demo-one'];
  expect(await findProjects(projectPaths)).toEqual([]);
  const diagnostics = mocks.diagnostics.get(projectPaths[0]!);
  expect(diagnostics).toHaveLength(2);
  expect(diagnostics?.[0]?.message).toContain(projectPaths[1]);
  expect(diagnostics?.[0]?.message).not.toContain(projectPaths[2]);
  projectPaths.forEach(p => expect(diagnostics?.[1]?.message).toContain(p));
  expect(mocks.diagnostics.get(projectPaths[2]!)).toHaveLength(1);
});

test('clears collision diagnostics after the conflicting project is removed', async () => {
  await findProjects(['/workspace/demo.one', '/workspace/demo-one']);
  expect(mocks.diagnostics.size).toBe(2);
  expect(await findProjects(['/workspace/demo.one'])).toEqual(['/workspace/demo.one']);
  expect(mocks.diagnostics.size).toBe(0);
  expect(await manager.hasErrors()).toBe(false);
});
