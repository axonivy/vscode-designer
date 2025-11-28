import * as vscode from 'vscode';

export const reloadWindow = async (message: string) => {
  const selection = await vscode.window.showInformationMessage(message, 'Reload Window', 'Cancel');
  if (selection === 'Reload Window') {
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
};
