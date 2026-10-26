import AdmZip from 'adm-zip';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { FileType, ThemeIcon, TreeItemCollapsibleState, Uri, type FileSystemProvider } from 'vscode';
import { IarContentFileSystemProvider, iarContentUri } from './iar-content-provider';
import { IvyProjectTreeDataProvider } from './ivy-project-tree-data-provider';

const mocks = vi.hoisted(() => ({
  findWorkspaceProjects: vi.fn(),
  findEngineProjects: vi.fn()
}));

vi.mock('vscode', () => {
  class EventEmitter {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  }
  class TreeItem {
    description?: string;
    tooltip?: string;
    iconPath?: unknown;
    resourceUri?: unknown;
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
  class Disposable {
    constructor(public dispose: () => void) {}
  }
  class FileSystemError extends Error {
    static FileNotFound = () => new FileSystemError('FileNotFound');
    static FileNotADirectory = () => new FileSystemError('FileNotADirectory');
    static FileIsADirectory = () => new FileSystemError('FileIsADirectory');
    static NoPermissions = () => new FileSystemError('NoPermissions');
  }
  const parseUri = (value: string) => {
    const parsed = new URL(value);
    const uriPath = decodeURIComponent(parsed.pathname);
    return { fsPath: uriPath, path: uriPath, query: parsed.search.slice(1) };
  };
  return {
    Diagnostic,
    DiagnosticSeverity: { Error: 0 },
    Disposable,
    EventEmitter,
    FileSystemError,
    FileType: { File: 1, Directory: 2 },
    Range,
    ThemeIcon,
    TreeItem,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    Uri: {
      file: (fsPath: string) => ({ fsPath }),
      parse: parseUri,
      joinPath: (uri: Uri, name: string) => ({ ...uri, path: path.posix.join(uri.path, name) })
    },
    l10n: {
      t: (message: string, ...args: unknown[]) =>
        args.reduce<string>((text, arg, index) => text.replace(`{${index}}`, String(arg)), message)
    }
  };
});

vi.mock('../engine/diagnostics', () => ({ IvyDiagnostics: { instance: { projectFileUrisToBeConverted: () => [] } } }));

let directory: string;
let archivePath: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ivy-iar-content-'));
  archivePath = path.join(directory, 'shared-project-2.1.0.iar');
  const archive = new AdmZip();
  archive.addFile('META-INF/ivy/process/hello.p.json', Buffer.from('{"name":"IAR process"}'));
  archive.addFile('META-INF/ivy/variables.yaml', Buffer.from('variables: {}'));
  archive.addFile('META-INF/services/service.txt', Buffer.from('service'));
  archive.writeZip(archivePath);
  mocks.findWorkspaceProjects.mockResolvedValue(['/workspace/local']);
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
      projectDirectory: archivePath
    }
  ]);
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

test('lists IAR projects in a separate read-only section', async () => {
  const provider = new IvyProjectTreeDataProvider(mocks.findWorkspaceProjects, mocks.findEngineProjects);

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

test('shows only the META-INF/ivy tree and opens files as read-only documents', async () => {
  const provider = new IvyProjectTreeDataProvider(mocks.findWorkspaceProjects, mocks.findEngineProjects);
  const [workspaceProject, iarGroup] = await provider.getChildren();
  const [iarDependency] = await provider.getChildren(iarGroup);
  const rootEntries = await provider.getChildren(iarDependency);

  expect(rootEntries.map(entry => entry.label)).toEqual(['process', 'variables.yaml']);
  expect(rootEntries[0]?.kind).toBe('iarContentDirectory');
  expect(rootEntries[1]?.type).toBe(FileType.File);

  const [processFile] = await provider.getChildren(rootEntries[0]);
  expect(processFile?.label).toBe('hello.p.json');
  expect(processFile?.command?.command).toBe('vscode.openWith');
  expect(processFile?.command?.arguments).toContain('default');
  expect(provider.getTreeItem(processFile!).resourceUri).toBe(processFile?.uri);
  const fsProvider: FileSystemProvider = new IarContentFileSystemProvider();
  const fileUri = processFile!.command!.arguments![0] as import('vscode').Uri;
  expect(fileUri.path).toBe('/shared-project-2.1.0.iar/process/hello.p.json');
  expect(Buffer.from((await fsProvider.readFile(fileUri)) as Uint8Array).toString('utf8')).toBe('{"name":"IAR process"}');
  expect(fsProvider.readDirectory(iarDependency!.uri)).toEqual([
    ['process', FileType.Directory],
    ['variables.yaml', FileType.File]
  ]);
  expect(() => fsProvider.writeFile(fileUri, new Uint8Array(), { create: true, overwrite: true })).toThrow();
  expect(workspaceProject?.kind).toBe('workspaceProject');
});

test('supports implicit archive directories and reports uncompressed file sizes', () => {
  const provider = new IarContentFileSystemProvider();
  const uri = iarContentUri(archivePath, 'META-INF/ivy/process');
  expect(provider.stat(uri).type).toBe(FileType.Directory);
  expect(provider.readDirectory(uri)).toEqual([['hello.p.json', FileType.File]]);
  expect(provider.stat(iarContentUri(archivePath, 'META-INF/ivy/process/hello.p.json'))).toMatchObject({
    type: FileType.File,
    size: Buffer.byteLength('{"name":"IAR process"}')
  });
  expect(() => provider.readFile(uri)).toThrow('FileIsADirectory');
});

test('supports empty explicit archive directories', () => {
  const archive = new AdmZip(archivePath);
  archive.addFile('META-INF/ivy/empty/', Buffer.alloc(0));
  archive.writeZip(archivePath);
  const provider = new IarContentFileSystemProvider();
  const uri = iarContentUri(archivePath, 'META-INF/ivy/empty');
  expect(provider.stat(uri).type).toBe(FileType.Directory);
  expect(provider.readDirectory(uri)).toEqual([]);
  expect(() => provider.readFile(uri)).toThrow('FileIsADirectory');
});

test('reads exploded IAR directories and preserves special characters in URIs', () => {
  const contentDirectory = path.join(directory, 'META-INF/ivy/config');
  fs.mkdirSync(contentDirectory, { recursive: true });
  const name = 'a #?% ü.txt';
  fs.writeFileSync(path.join(contentDirectory, name), 'exploded content');
  const provider = new IarContentFileSystemProvider();
  const uri = iarContentUri(directory, `META-INF/ivy/config/${name}`);
  expect(uri.path).toBe(`/${path.basename(directory)}/config/${name}`);
  expect(new URLSearchParams(uri.query).get('archive')).toBe(directory);
  expect(provider.stat(uri)).toMatchObject({ type: FileType.File, size: 16 });
  expect(Buffer.from(provider.readFile(uri)).toString()).toBe('exploded content');
  expect(provider.readDirectory(iarContentUri(directory, 'META-INF/ivy/config'))).toEqual([[name, FileType.File]]);
});

test('reloads modified archives instead of serving cached content', () => {
  const provider = new IarContentFileSystemProvider();
  const uri = iarContentUri(archivePath, 'META-INF/ivy/process/hello.p.json');
  provider.readFile(uri);
  const archive = new AdmZip(archivePath);
  archive.updateFile('META-INF/ivy/process/hello.p.json', Buffer.from('updated process content'));
  archive.writeZip(archivePath);
  expect(Buffer.from(provider.readFile(uri)).toString()).toBe('updated process content');
});

test('reports filesystem errors for missing files, directories, and invalid archives', () => {
  const provider = new IarContentFileSystemProvider();
  const fileUri = iarContentUri(archivePath, 'META-INF/ivy/variables.yaml');
  expect(() => provider.readDirectory(fileUri)).toThrow('FileNotADirectory');
  const missingUri = iarContentUri(archivePath, 'META-INF/ivy/missing');
  expect(() => provider.stat(missingUri)).toThrow('FileNotFound');
  expect(() => provider.readFile(missingUri)).toThrow('FileNotFound');
  fs.writeFileSync(archivePath, 'invalid zip');
  expect(() => provider.stat(fileUri)).toThrow('FileNotFound');
  fs.unlinkSync(archivePath);
  expect(() => provider.readFile(fileUri)).toThrow('FileNotFound');
});

test('rejects every mutation and paths escaping the Ivy content root', () => {
  const provider: FileSystemProvider = new IarContentFileSystemProvider();
  const uri = iarContentUri(directory, 'META-INF/ivy');
  expect(() => provider.createDirectory(uri)).toThrow('NoPermissions');
  expect(() => provider.writeFile(uri, new Uint8Array(), { create: true, overwrite: true })).toThrow('NoPermissions');
  expect(() => provider.delete(uri, { recursive: true })).toThrow('NoPermissions');
  expect(() => provider.rename(uri, uri, { overwrite: true })).toThrow('NoPermissions');
  const escapedUri = { ...uri, path: `${uri.path}/../services/service.txt` } as Uri;
  expect(() => provider.readFile(escapedUri)).toThrow('NoPermissions');
});

test('rejects symlinks escaping an exploded IAR content root', () => {
  const contentDirectory = path.join(directory, 'META-INF/ivy');
  fs.mkdirSync(contentDirectory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'outside.txt'), 'outside content');
  fs.symlinkSync(path.join(directory, 'outside.txt'), path.join(contentDirectory, 'link.txt'));
  const provider = new IarContentFileSystemProvider();
  expect(provider.readDirectory(iarContentUri(directory, 'META-INF/ivy'))).toEqual([]);
  expect(() => provider.readFile(iarContentUri(directory, 'META-INF/ivy/link.txt'))).toThrow('NoPermissions');
});
