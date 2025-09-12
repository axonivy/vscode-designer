import * as vscode from 'vscode';

export function setStatusBarMessage(text: string) {
  vscode.window.setStatusBarMessage(text, 5_000);
}

export function setStatusBarIcon() {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  item.text = '$(type-hierarchy) Axon Ivy';
  if (vscode.workspace.workspaceFolders) {
    item.command = {
      command: 'ivyProjects.addNewProject',
      arguments: vscode.workspace.workspaceFolders[0] !== undefined ? [vscode.workspace.workspaceFolders[0].uri] : [],
      title: 'Add new Project'
    };
  }
  item.show();
}
