import { beforeEach, expect, test, vi } from 'vitest';
import { CompletionItemKind, Position, type Uri } from 'vscode';

const mocks = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('vscode', () => ({
  CompletionItemKind: { Class: 7, Interface: 8, Enum: 9, Method: 1 },
  MarkdownString: class MarkdownString {
    value = '';
  },
  Position: class Position {
    constructor(
      public line: number,
      public character: number
    ) {}
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
    joinPath: (base: { fsPath: string }, ...paths: string[]) => ({ fsPath: [base.fsPath, ...paths].join('/') })
  },
  workspace: { fs: { writeFile: mocks.writeFile } }
}));
vi.mock('../base/commands', () => ({ executeCommand: mocks.executeCommand }));
vi.mock('../base/logging-util', () => ({ logWarningMessage: vi.fn() }));
vi.mock('../project-explorer/ivy-project-manager', () => ({
  IvyProjectManager: { instance: { getIvyProjects: () => [] } }
}));
vi.mock('../project-explorer/tree-selection', () => ({ treeUriToProjectPath: async () => '/workspace/project' }));

import { JavaProvider } from './java-provider';

beforeEach(() => {
  vi.clearAllMocks();
});

test('downloads missing Java method documentation on demand during contextual completion', async () => {
  const code = 'ISecurityContext.cur';
  const missingDocumentation = { label: 'current()', kind: CompletionItemKind.Method };
  const resolvedDocumentation = {
    ...missingDocumentation,
    documentation: 'Gets the current security context.'
  };
  mocks.executeCommand
    .mockResolvedValueOnce({ items: [missingDocumentation] })
    .mockResolvedValueOnce([{ contents: 'ISecurityContext documentation' }])
    .mockResolvedValueOnce({ items: [resolvedDocumentation] });

  const provider = new JavaProvider({ fsPath: '/workspace/project/process.p.json' } as Uri);
  const items = await provider.contextualCompletionItems(code, new Position(0, code.length), ['import ch.ivyteam.ivy.security.ISecurityContext;'], 1000);

  expect(items).toEqual([resolvedDocumentation]);
  expect(mocks.executeCommand.mock.calls.map(([command]) => command)).toEqual([
    'vscode.executeCompletionItemProvider',
    'vscode.executeHoverProvider',
    'vscode.executeCompletionItemProvider'
  ]);
});

test('does not request a hover when contextual completion already has Java documentation', async () => {
  const item = {
    label: 'current()',
    kind: CompletionItemKind.Method,
    documentation: 'Gets the current security context.'
  };
  mocks.executeCommand.mockResolvedValueOnce({ items: [item] });

  const provider = new JavaProvider({ fsPath: '/workspace/project/process.p.json' } as Uri);
  const items = await provider.contextualCompletionItems('ISecurityContext.cur', new Position(0, 20), [], 1000);

  expect(items).toEqual([item]);
  expect(mocks.executeCommand).toHaveBeenCalledTimes(1);
});
