import { Uri, workspace } from 'vscode';
import { getDialogFormConversionPaths } from './dialog-form-conversion-paths';

export const convertDialogFormToJsf = async (projectDirectory: string, formUri: Uri) => {
  const paths = getDialogFormConversionPaths(projectDirectory, formUri.fsPath);
  if (!paths) {
    throw new Error(`Not a dialog form in the project's dialog directory: ${formUri.fsPath}`);
  }

  const sourceViewUri = Uri.file(paths.sourceView);
  await workspace.fs.rename(Uri.file(paths.targetView), sourceViewUri, { overwrite: true });
  await workspace.fs.delete(formUri, { useTrash: false });
  return sourceViewUri;
};
