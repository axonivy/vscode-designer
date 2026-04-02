import { Uri, window, workspace } from 'vscode';

export async function addDevContainer(extensionUri: Uri) {
  const ws = await window.showWorkspaceFolderPick();
  if (!ws) {
    return;
  }
  await workspace.fs.copy(
    Uri.joinPath(extensionUri, 'assets', '.devcontainer'),
    Uri.joinPath(ws.uri, '.devcontainer'),
    { overwrite: false }
  );
}
