import { l10n, window } from 'vscode';
import { executeCommand } from './commands';

export const askToReloadWindow = async (reason: string) => {
  const reloadLabel = l10n.t('Reload Window');
  const selection = await window.showQuickPick(
    [{ label: reloadLabel, detail: l10n.t('Unsaved changes will be lost') }, { label: l10n.t('Cancel') }],
    {
      ignoreFocusOut: true,
      title: l10n.t('{0} - reload window to apply new settings and restart the engine', reason)
    }
  );
  if (selection?.label === reloadLabel) {
    await executeCommand('workbench.action.reloadWindow');
  }
};
