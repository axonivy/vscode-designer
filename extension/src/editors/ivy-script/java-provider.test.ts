import { beforeEach, describe, expect, test, vi } from 'vitest';
import { JavaProvider } from './java-provider';

const mocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  executeCommand: vi.fn(),
  openTextDocument: vi.fn(),
  applyEdit: vi.fn(),
  replace: vi.fn(),
  save: vi.fn()
}));
vi.mock('vscode', () => ({
  CompletionItem: vi.fn(),
  CompletionItemKind: {},
  CompletionList: vi.fn(),
  Hover: vi.fn(),
  Location: vi.fn(),
  MarkdownString: vi.fn(),
  Position: class {
    constructor(
      readonly line: number,
      readonly character: number
    ) {}
  },
  Range: class {
    constructor(
      readonly start: unknown,
      readonly end: unknown
    ) {}
  },
  WorkspaceEdit: class {
    replace = mocks.replace;
  },
  Uri: {
    file: (path: string) => ({ path }),
    joinPath: (base: { path: string }, ...parts: string[]) => {
      const path = [base.path, ...parts].join('/');
      return { path, toString: () => `file://${path}` };
    }
  },
  workspace: { textDocuments: [], fs: { writeFile: mocks.writeFile }, openTextDocument: mocks.openTextDocument, applyEdit: mocks.applyEdit }
}));
vi.mock('../../base/commands', () => ({ executeCommand: mocks.executeCommand }));
vi.mock('../../base/logging-util', () => ({ logWarningMessage: vi.fn() }));
vi.mock('../../project-explorer/ivy-project-manager', () => ({ IvyProjectManager: { instance: { getIvyProjects: () => [] } } }));
vi.mock('../../project-explorer/tree-selection', () => ({ treeUriToProjectPath: () => Promise.resolve('/project') }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.executeCommand.mockResolvedValue([]);
  mocks.openTextDocument.mockImplementation(async () => ({
    getText: () => mocks.writeFile.mock.calls.at(-1)?.[1].toString()
  }));
  mocks.applyEdit.mockResolvedValue(true);
  mocks.save.mockResolvedValue(true);
});

describe('Java definitions', () => {
  test.each([
    ['ivy.task.customFields()', 'task', 'Ivy.wfTask().customFields()', 'Ivy.wfT'],
    ['ivy.case.customFields()', 'case', 'Ivy.wfCase().customFields()', 'Ivy.wfC'],
    ['ivy.session.getId()', 'session', 'Ivy.session().getId()', 'Ivy.s'],
    ['ivy.casemap.find()', 'casemap', 'Ivy.get(ICaseMapService.class).find()', 'Ivy.get(I'],
    ['ISecurityContext.current()', 'current', 'ISecurityContext.current()', 'ISecurityContext.c']
  ])('resolves %s with translated cursor and imports', async (code, word, translated, prefix) => {
    const provider = new JavaProvider({} as never);
    const imports = ['import ch.ivyteam.ivy.security.ISecurityContext;'];
    const target = { uri: { toString: () => 'jdt://contents/Target.class' }, range: {} };
    mocks.executeCommand.mockResolvedValue([target]);
    expect(await provider.definition(code, { line: 0, character: code.indexOf(word) + 1 } as never, imports)).toEqual([target]);
    const written = mocks.writeFile.mock.calls[0]![1].toString();
    expect(written).toContain(`${JavaProvider.DUMMY_HOVER_CONTENT}${translated}; } }`);
    expect(written).toContain(imports[0]);
    const importCount = word === 'casemap' ? 3 : word === 'current' ? 1 : 2;
    expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.executeDefinitionProvider', await provider.dummyDefinitionJavaFile, {
      line: importCount,
      character: JavaProvider.DUMMY_HOVER_CONTENT.length + prefix.length
    });
  });

  test('retains declarations and translates positions on subsequent lines', async () => {
    const provider = new JavaProvider({} as never);
    const code = 'String value = "test";\nvalue.substring(0);';
    await provider.definition(code, { line: 1, character: 8 } as never);
    expect(mocks.writeFile.mock.calls[0]?.[1].toString()).toContain(code);
    expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.executeDefinitionProvider', await provider.dummyDefinitionJavaFile, {
      line: 1,
      character: 8
    });
  });

  test('synchronizes a cached document before resolving a changed multiline script', async () => {
    const provider = new JavaProvider({} as never);
    await provider.definition('ivy.task', { line: 0, character: 5 } as never);
    let cachedText = mocks.writeFile.mock.calls.at(-1)?.[1].toString();
    mocks.openTextDocument.mockResolvedValue({
      getText: () => cachedText,
      positionAt: (offset: number) => ({ offset }),
      save: mocks.save
    });
    mocks.applyEdit.mockImplementation(async () => {
      cachedText = mocks.replace.mock.calls.at(-1)?.[2];
      return true;
    });
    mocks.executeCommand.mockImplementation(async () => {
      expect(cachedText).toBe(mocks.writeFile.mock.calls.at(-1)?.[1].toString());
      // Saving first would let Java format-on-save invalidate the translated cursor.
      expect(mocks.save).not.toHaveBeenCalled();
      return [];
    });
    await provider.definition('\nISecurityContext.current();\n\nivy.task.customFields();', { line: 3, character: 14 } as never, [
      'import ch.ivyteam.ivy.security.ISecurityContext;'
    ]);
    expect(mocks.replace).toHaveBeenCalledWith(await provider.dummyDefinitionJavaFile, expect.anything(), cachedText);
    expect(cachedText).toContain('Ivy.wfTask().customFields();');
    expect(mocks.save).toHaveBeenCalled();
    expect(mocks.executeCommand).toHaveBeenLastCalledWith('vscode.executeDefinitionProvider', await provider.dummyDefinitionJavaFile, {
      line: 5,
      character: 18
    });
  });

  test('does not query JDT if the cached document cannot be synchronized', async () => {
    mocks.openTextDocument.mockResolvedValue({ getText: () => '', positionAt: (offset: number) => ({ offset }) });
    mocks.applyEdit.mockResolvedValue(false);
    await expect(new JavaProvider({} as never).definition('ivy.task', { line: 0, character: 5 } as never)).rejects.toThrow('synchronize');
    expect(mocks.executeCommand).not.toHaveBeenCalled();
  });

  test('ignores definitions in its synthetic document', async () => {
    const provider = new JavaProvider({} as never);
    const uri = await provider.dummyDefinitionJavaFile;
    mocks.executeCommand.mockResolvedValue([{ uri }, { targetUri: uri }]);
    expect(await provider.definition('String value', { line: 0, character: 8 } as never)).toEqual([]);
  });

  test('handles a missing definition result', async () => {
    mocks.executeCommand.mockResolvedValue(undefined);
    expect(await new JavaProvider({} as never).definition('unknown', { line: 0, character: 2 } as never)).toEqual([]);
  });
});
