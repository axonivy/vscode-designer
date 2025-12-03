import * as vscode from 'vscode';

export const askToReloadWindow = async (reason: string) => {
  const selection = await vscode.window.showQuickPick(
    [{ label: 'Reload Window', detail: 'Unsaved changes will be lost' }, { label: 'Cancel' }],
    {
      ignoreFocusOut: true,
      title: `${reason} - reload window to apply new settings and restart the engine`
    }
  );
  if (selection?.label === 'Reload Window') {
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
};
