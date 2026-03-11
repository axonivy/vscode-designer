import * as vscode from 'vscode';

export async function addDevContainer(extensionUri: vscode.Uri) {
  const ws = await vscode.window.showWorkspaceFolderPick();
  if (!ws) {
    return;
  }
  await vscode.workspace.fs.copy(
    vscode.Uri.joinPath(extensionUri, 'assets', '.devcontainer'),
    vscode.Uri.joinPath(ws.uri, '.devcontainer'),
    { overwrite: false }
  );
}
