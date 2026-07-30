import { window } from 'vscode';
import { executeCommand } from './commands';

export const askToReloadWindow = async (reason: string) => {
  const selection = await window.showQuickPick([{ label: 'Reload Window', detail: 'Unsaved changes will be lost' }, { label: 'Cancel' }], {
    ignoreFocusOut: true,
    title: `${reason} - reload window to apply new settings and restart the engine`
  });
  if (selection?.label === 'Reload Window') {
    await executeCommand('workbench.action.reloadWindow');
  }
};
