import { Uri, workspace } from 'vscode';
import { getWorkspaceFolder } from '../project-explorer/utils/util';

export async function addDevContainer(extensionUri: Uri) {
  const workspaceFolder = await getWorkspaceFolder();
  if (!workspaceFolder) {
    throw new Error('No workspace folder found - open a folder before adding .devcontainer config');
  }
  await workspace.fs.copy(Uri.joinPath(extensionUri, 'assets', '.devcontainer'), Uri.joinPath(workspaceFolder, '.devcontainer'), {
    overwrite: false
  });
}
