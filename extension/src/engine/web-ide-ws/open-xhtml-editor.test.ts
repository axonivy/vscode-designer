import { beforeEach, expect, test, vi } from 'vitest';
import type { TextDocument } from 'vscode';
import { window, workspace } from 'vscode';
import type { HdBean } from '../api/generated/client';
import { findXhtmlElementSelection, openXhtmlEditor } from './open-xhtml-editor';

vi.mock('vscode', () => {
  class Selection {
    anchor: { line: number; character: number };
    active: { line: number; character: number };

    constructor(anchor: { line: number; character: number }, active: { line: number; character: number }) {
      this.anchor = anchor;
      this.active = active;
    }
  }

  return {
    Selection,
    Uri: {
      parse: vi.fn((value: string) => ({ value, fsPath: value }))
    },
    workspace: {
      openTextDocument: vi.fn()
    },
    window: {
      createOutputChannel: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
      showTextDocument: vi.fn(),
      showWarningMessage: vi.fn()
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const xhtml = `<html>
  <h:body>
    <h:form id="form">
      <p:commandButton id="proceed" value="Proceed" />
    </h:form>
  </h:body>
</html>`;

test('finds an XHTML element selection by id', () => {
  const selection = findXhtmlElementSelection(createTextDocument(xhtml), 'form');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 2, character: 4 });
  expect(selection?.active).toEqual({ line: 2, character: 4 });
});

test('finds an XHTML element selection by JSF qualified id', () => {
  const selection = findXhtmlElementSelection(createTextDocument(xhtml), 'form:proceed');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 3, character: 6 });
  expect(selection?.active).toEqual({ line: 3, character: 6 });
});

const repeatedButtonXhtml = `<html>
  <h:body>
    <h:form id="otherForm">
      <p:commandButton id="proceed" value="Other" />
    </h:form>
    <h:form id="form">
      <p:commandButton id="proceed" value="Proceed" />
    </h:form>
  </h:body>
</html>`;

test('prefers the most plausible child match when intermediate JSF segments are missing in source', () => {
  const selection = findXhtmlElementSelection(createTextDocument(repeatedButtonXhtml), 'form:j_idt42:proceed');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 6, character: 6 });
  expect(selection?.active).toEqual({ line: 6, character: 6 });
});

test('falls back to the proceed button when the selected id has an extra trailing segment', () => {
  const selection = findXhtmlElementSelection(createTextDocument(xhtml), 'form:proceed:something');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 3, character: 6 });
  expect(selection?.active).toEqual({ line: 3, character: 6 });
});

const nestedButtonXhtml = `<html>
  <h:body>
    <h:form id="otherForm">
      <p:panelGrid id="grid">
        <p:commandButton id="proceed" value="Other" />
      </p:panelGrid>
    </h:form>
  </h:body>
</html>`;

test('matches nested JSF ids with more than two segments', () => {
  const selection = findXhtmlElementSelection(createTextDocument(nestedButtonXhtml), 'otherForm:grid:proceed');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 4, character: 8 });
  expect(selection?.active).toEqual({ line: 4, character: 8 });
});

test('falls back to the parent segment when the child segment cannot be found', () => {
  const selection = findXhtmlElementSelection(createTextDocument(xhtml), 'form:j_idt42');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 2, character: 4 });
  expect(selection?.active).toEqual({ line: 2, character: 4 });
});

const buttonWithoutIdXhtml = `<html>
  <h:body>
    <h:form id="form">
      <p:commandButton value="Proceed" />
    </h:form>
  </h:body>
</html>`;

test('falls back to the form when a button has no id and JSF generates a random child id', () => {
  const selection = findXhtmlElementSelection(createTextDocument(buttonWithoutIdXhtml), 'form:j_idt42');
  expect(selection).toBeDefined();
  expect(selection?.anchor).toEqual({ line: 2, character: 4 });
  expect(selection?.active).toEqual({ line: 2, character: 4 });
});

test('opens the xhtml editor and reveals the requested element', async () => {
  const document = createTextDocument(xhtml);
  vi.mocked(workspace.openTextDocument).mockResolvedValue(document);

  await expect(openXhtmlEditor({ bean: createHdBean('file:///dialogs/test.xhtml'), selection: 'form:proceed' })).resolves.toBe(true);

  expect(workspace.openTextDocument).toHaveBeenCalledWith({ value: 'file:///dialogs/test.xhtml', fsPath: 'file:///dialogs/test.xhtml' });
  expect(window.showTextDocument).toHaveBeenCalledOnce();
  expect(vi.mocked(window.showTextDocument).mock.calls[0]?.[1]).toEqual({
    selection: expect.objectContaining({
      anchor: { line: 3, character: 6 },
      active: { line: 3, character: 6 }
    })
  });
});

test('opens the xhtml editor without a selection if the id is unknown', async () => {
  const document = createTextDocument(xhtml);
  vi.mocked(workspace.openTextDocument).mockResolvedValue(document);

  await expect(openXhtmlEditor({ bean: createHdBean('file:///dialogs/test.xhtml'), selection: 'missing' })).resolves.toBe(true);

  expect(window.showTextDocument).toHaveBeenCalledWith(document, undefined);
  expect(window.showWarningMessage).toHaveBeenCalledWith("Could not resolve XHTML element 'missing' in 'file:///dialogs/test.xhtml'.");
});

test('returns false when no xhtml uri is provided', async () => {
  await expect(openXhtmlEditor({ bean: createHdBean(), selection: 'target' })).resolves.toBe(false);

  expect(workspace.openTextDocument).not.toHaveBeenCalled();
  expect(window.showTextDocument).not.toHaveBeenCalled();
});

const createTextDocument = (text: string) =>
  ({
    getText: () => text,
    positionAt: (offset: number) => {
      const contentBeforeOffset = text.slice(0, offset);
      const lines = contentBeforeOffset.split('\n');
      return {
        line: lines.length - 1,
        character: lines.at(-1)?.length ?? 0
      };
    }
  }) as TextDocument;

const createHdBean = (uri?: string): HdBean => ({
  identifier: {} as HdBean['identifier'],
  name: 'test',
  path: 'dialogs/test.xhtml',
  uri
});
