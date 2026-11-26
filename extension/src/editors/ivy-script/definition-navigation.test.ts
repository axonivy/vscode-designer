import { beforeEach, expect, test, vi } from 'vitest';
import { registerDefinitionNavigation } from './definition-navigation';

const mocks = vi.hoisted(() => ({ definition: vi.fn(), executeCommand: vi.fn(), openTextDocument: vi.fn() }));
vi.mock('vscode', () => ({
  commands: { executeCommand: mocks.executeCommand },
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
  Uri: { parse: (uri: string) => uri },
  workspace: { openTextDocument: mocks.openTextDocument }
}));
vi.mock('@eclipse-glsp/vscode-integration', () => ({
  DisposableCollection: class {
    dispose() {}
  }
}));
vi.mock('./java-provider', () => ({
  JavaProvider: class {
    definition = mocks.definition;
  }
}));

const range = { start: { line: 4, character: 2 }, end: { line: 4, character: 8 } };
const uri = { toString: () => 'jdt://contents/Ivy.java' };
const script = 'import java.lang.String;\nivy.task.customFields()';
let resolve: (request: { code: string; position: { line: number; character: number }; languageId?: string }) => Promise<unknown>;
let open: (target: { uri: string; range?: unknown }) => Promise<void>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.definition.mockResolvedValue([{ uri, range }]);
  mocks.openTextDocument.mockResolvedValue({ getText: () => 'Java source preview' });
  registerDefinitionNavigation(
    {
      onRequest: vi.fn((type: { method: string }, handler: never) => {
        if (type.method === 'definition/resolve') {
          resolve = handler;
        }
        if (type.method === 'definition/open') {
          open = handler;
        }
        return { dispose: vi.fn() };
      })
    } as never,
    {} as never,
    {} as never
  );
});
const request = () => resolve({ code: script, position: { line: 1, character: 6 } });
const target = () => ({ uri: uri.toString(), range, selectionRange: range, text: 'Java source preview' });

test('opens external definitions only on activation, with the target selection', async () => {
  await request();
  expect(mocks.executeCommand).not.toHaveBeenCalled();
  await open({ uri: uri.toString(), range });
  expect(mocks.executeCommand).toHaveBeenCalledWith('vscode.open', uri.toString(), { selection: range });
});

test('resolves the complete script and includes target source for native hover previews', async () => {
  expect(await request()).toEqual([target()]);
  expect(mocks.definition).toHaveBeenCalledWith('\nivy.task.customFields()', { line: 1, character: 6 }, ['import java.lang.String;']);
  expect(mocks.openTextDocument).toHaveBeenCalledWith(uri);
});

test('converts location links without leaking synthetic origin ranges', async () => {
  mocks.definition.mockResolvedValue([{ targetUri: uri, targetRange: range, originSelectionRange: range }]);
  expect(await request()).toEqual([target()]);
});

test('preserves the narrower target selection range', async () => {
  const selectionRange = { start: { line: 4, character: 4 }, end: { line: 4, character: 7 } };
  mocks.definition.mockResolvedValue([{ targetUri: uri, targetRange: range, targetSelectionRange: selectionRange }]);
  expect(await request()).toEqual([{ ...target(), selectionRange }]);
});

test('keeps concurrent requests independent', async () => {
  mocks.definition.mockResolvedValueOnce([{ uri, range }]).mockResolvedValueOnce([]);
  expect(await Promise.all([request(), request()])).toEqual([[target()], []]);
});

test('returns no targets when JDT is unavailable', async () => {
  mocks.definition.mockRejectedValue(new Error('Java unavailable'));
  expect(await request()).toEqual([]);
});

test('retains navigation targets when preview source cannot be read', async () => {
  mocks.openTextDocument.mockRejectedValue(new Error('Source unavailable'));
  expect(await request()).toEqual([{ ...target(), text: undefined }]);
});

test('resolves only the macro expression under the cursor', async () => {
  const macro = 'Task: <%= ivy.task.name %> Case: <%= ivy.case.customFields() %>';
  expect(
    await resolve({ code: macro, languageId: 'ivyMacro', position: { line: 0, character: macro.indexOf('customFields') + 2 } })
  ).toEqual([target()]);
  expect(mocks.definition).toHaveBeenCalledWith(' ivy.case.customFields() ', { line: 0, character: ' ivy.case.cu'.length }, []);
});

test('does not query Java or navigate for plain macro text', async () => {
  expect(await resolve({ code: 'Case: <%= ivy.case.name %>', languageId: 'ivyMacro', position: { line: 0, character: 2 } })).toEqual([]);
  expect(mocks.definition).not.toHaveBeenCalled();
  expect(mocks.executeCommand).not.toHaveBeenCalled();
});

test('resolves a type in an import statement', async () => {
  await resolve({ code: script, position: { line: 0, character: 19 } });
  expect(mocks.definition).toHaveBeenCalledWith('java.lang.String;', { line: 0, character: 12 }, ['import java.lang.String;']);
});
