import { beforeEach, expect, test, vi } from 'vitest';
import { FileType, ThemeIcon, TreeItemCollapsibleState } from 'vscode';
import { IvyProjectTreeDataProvider } from './ivy-project-tree-data-provider';

const mocks = vi.hoisted(() => ({
  findFiles: vi.fn(),
  findEngineProjects: vi.fn(),
  executeCommand: vi.fn()
}));

vi.mock('vscode', () => {
  class EventEmitter {
    event = vi.fn();
    fire = vi.fn();
  }
  class TreeItem {
    description?: string;
    tooltip?: string;
    iconPath?: unknown;
    contextValue?: string;
    command?: unknown;
    constructor(
      public label: unknown,
      public collapsibleState?: number
    ) {}
  }
  class ThemeIcon {
    constructor(public id: string) {}
  }
  class Range {
    constructor(
      public startLine: number,
      public startCharacter: number,
      public endLine: number,
      public endCharacter: number
    ) {}
  }
  class Diagnostic {
    constructor(
      public range: Range,
      public message: string,
      public severity: number
    ) {}
  }
  return {
    Diagnostic,
    DiagnosticSeverity: { Error: 0 },
    EventEmitter,
    FileType: { Directory: 2 },
    Range,
    ThemeIcon,
    TreeItem,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    Uri: {
      file: (fsPath: string) => ({ fsPath }),
      parse: (value: string) => ({ fsPath: value })
    },
    l10n: {
      t: (message: string, ...args: unknown[]) =>
        args.reduce<string>((text, arg, index) => text.replace(`{${index}}`, String(arg)), message)
    },
    workspace: { findFiles: mocks.findFiles }
  };
});

vi.mock('../base/commands', () => ({ executeCommand: mocks.executeCommand }));
vi.mock('../base/configurations', () => ({ config: { projectExcludePattern: () => '', projectMaximumNumber: () => 50 } }));
vi.mock('../engine/diagnostics', () => ({ IvyDiagnostics: { instance: { projectFileUrisToBeConverted: () => [] } } }));

beforeEach(() => {
  mocks.findFiles.mockResolvedValue([{ fsPath: '/workspace/local/.ivyproject' }]);
  mocks.findEngineProjects.mockResolvedValue([
    {
      artifactId: 'workspace-project',
      groupId: 'com.example',
      id: { id: 'workspace-project', isIar: false },
      version: '1.0.0',
      projectDirectory: '/workspace/local'
    },
    {
      artifactId: 'shared-project',
      groupId: 'com.example',
      id: { id: 'shared-project', isIar: true },
      version: '2.1.0',
      projectDirectory: '/home/user/.m2/repository/com/example/shared-project/2.1.0/shared-project-2.1.0.iar'
    }
  ]);
});

test('lists IAR projects in a separate read-only section', async () => {
  const provider = new IvyProjectTreeDataProvider(Promise.resolve(), mocks.findEngineProjects);

  const roots = await provider.getChildren();
  expect(roots.map(entry => entry.kind)).toEqual(['workspaceProject', 'iarDependencyGroup']);
  expect(roots[1]?.label).toBe('IAR Dependencies');
  expect(roots[1]?.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);

  const dependencies = await provider.getChildren(roots[1]);
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toMatchObject({
    label: 'shared-project',
    description: '2.1.0',
    kind: 'iarDependency',
    type: FileType.Directory
  });
  expect(dependencies[0]?.iconPath).toBeInstanceOf(ThemeIcon);
  expect((dependencies[0]?.iconPath as ThemeIcon).id).toBe('lock');
  expect(provider.getTreeItem(dependencies[0]!).contextValue).toBeUndefined();
});
