import { StatusBarAlignment, window } from 'vscode';
import { executeCommand } from './commands';

export const setStatusBarMessage = (text: string) => {
  window.setStatusBarMessage(text, 5_000);
};

export const setStatusBarIcon = () => {
  const item = window.createStatusBarItem(StatusBarAlignment.Left);
  item.text = '$(type-hierarchy) Axon Ivy';
  item.command = 'ivy.showStatusBarQuickPick';
  item.show();
};

export const showStatusBarQuickPick = () => {
  window.showQuickPick(['Deactivate Animation', 'Activate Animation'], { ignoreFocusOut: true }).then(selection => {
    if (selection === 'Deactivate Animation') {
      executeCommand('engine.deactivateAnimation');
    } else if (selection === 'Activate Animation') {
      executeCommand('engine.activateAnimation');
    }
  });
};
