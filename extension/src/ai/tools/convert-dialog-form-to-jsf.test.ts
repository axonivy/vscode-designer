import path from 'path';
import { afterEach, expect, test, vi } from 'vitest';

const { convertFormToJsf, executeCommand } = vi.hoisted(() => ({
  convertFormToJsf: vi.fn(),
  executeCommand: vi.fn()
}));

vi.mock('../../editors/form-editor/convert-dialog-form', () => ({
  convertDialogFormToJsf: convertFormToJsf
}));

vi.mock('../../base/commands', () => ({ executeCommand }));

vi.mock('../../project-explorer/ivy-project-manager', () => ({
  IvyProjectManager: {
    get instance() {
      return { getIvyProjects: async () => [projectPath] };
    }
  }
}));

vi.mock('../../base/ivyProjectSelection', () => ({}));

vi.mock('vscode', () => ({
  l10n: {
    t: (message: string, ...args: unknown[]) =>
      args.reduce<string>((result, arg, index) => result.replace(`{${index}}`, String(arg)), message)
  },
  Uri: { file: (fsPath: string) => ({ fsPath }) }
}));

import { convertDialogFormToJsf } from './convert-dialog-form-to-jsf';

const projectPath = path.join(path.sep, 'workspace', 'purchase');
const formPath = path.join(projectPath, 'dialog', 'order', 'Order', 'Order.f.json');
const viewUri = { fsPath: path.join(projectPath, 'dialog', 'order', 'Order', 'Order.xhtml') };

afterEach(() => {
  vi.resetAllMocks();
});

test('converts the existing Form, opens the view and returns the affected paths', async () => {
  convertFormToJsf.mockResolvedValue(viewUri);

  const result = await convertDialogFormToJsf({ formPath: ` ${formPath} ` });

  expect(convertFormToJsf).toHaveBeenCalledExactlyOnceWith(projectPath, { fsPath: formPath });
  expect(executeCommand).toHaveBeenCalledExactlyOnceWith('vscode.open', viewUri);
  expect(result).toContain(viewUri.fsPath);
  expect(result).toContain(formPath);
});
