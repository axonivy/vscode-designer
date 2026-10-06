import path from 'path';
import { FileType, Uri, workspace } from 'vscode';
import { getDialogFormConversionPaths } from './dialog-form-conversion-paths';

export const convertDialogFormToJsf = async (projectDirectory: string, formUri: Uri) => {
  const paths = getDialogFormConversionPaths(projectDirectory, formUri.fsPath);
  if (!paths) {
    throw new Error(`Not a dialog form in the project's dialog directory: ${formUri.fsPath}`);
  }

  const sourceViewUri = Uri.file(paths.sourceView);
  const targetDirectoryUri = Uri.file(path.dirname(paths.targetView));
  const sourceDirectoryUri = Uri.file(path.dirname(paths.sourceView));
  const targetFiles = await workspace.fs.readDirectory(targetDirectoryUri);
  await workspace.fs.rename(Uri.file(paths.targetView), sourceViewUri, { overwrite: true });
  await Promise.all(
    targetFiles
      .filter(([name, type]) => type === FileType.File && name !== path.basename(paths.targetView))
      .map(([name]) =>
        workspace.fs.copy(
          Uri.file(path.join(targetDirectoryUri.fsPath, name)),
          Uri.file(path.join(sourceDirectoryUri.fsPath, name)),
          { overwrite: true }
        )
      )
  );
  await workspace.fs.delete(formUri, { useTrash: false });
  return sourceViewUri;
};
