import path from 'path';
import { beforeEach, expect, test, vi } from 'vitest';
import { FileType, Uri, workspace } from 'vscode';
import { convertDialogFormToJsf } from './convert-dialog-form';

vi.mock('vscode', () => ({
  FileType: { File: 1, Directory: 2 },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  workspace: {
    fs: {
      copy: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      rename: vi.fn()
    }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('moves the form XHTML and copies sibling files from the generated target directory', async () => {
  const projectDirectory = path.join(path.sep, 'workspace', 'project');
  const formUri = Uri.file(path.join(projectDirectory, 'dialog', 'ch', 'form', 'test', 'testForm', 'testForm.f.json'));
  const sourceView = path.join(projectDirectory, 'dialog', 'ch', 'form', 'test', 'testForm', 'testForm.xhtml');
  const targetView = path.join(projectDirectory, 'target', 'dialog', 'ch', 'form', 'test', 'testForm', 'testForm.xhtml');
  const targetDirectory = path.dirname(targetView);
  const sourceDirectory = path.dirname(sourceView);
  vi.mocked(workspace.fs.readDirectory).mockResolvedValue([
    ['dialog4.xhtml', FileType.File],
    ['testForm.xhtml', FileType.File],
    ['classes', FileType.Directory]
  ]);

  await expect(convertDialogFormToJsf(projectDirectory, formUri)).resolves.toEqual(Uri.file(sourceView));

  expect(workspace.fs.rename).toHaveBeenCalledWith(Uri.file(targetView), Uri.file(sourceView), { overwrite: true });
  expect(workspace.fs.copy).toHaveBeenCalledExactlyOnceWith(
    Uri.file(path.join(targetDirectory, 'dialog4.xhtml')),
    Uri.file(path.join(sourceDirectory, 'dialog4.xhtml')),
    { overwrite: true }
  );
  expect(workspace.fs.delete).toHaveBeenCalledWith(formUri, { useTrash: false });
});
