import * as vscode from 'vscode';
import { executeCommand } from './commands';

export const setStatusBarMessage = (text: string) => {
  vscode.window.setStatusBarMessage(text, 5_000);
};

export const setStatusBarIcon = () => {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  item.text = '$(type-hierarchy) Axon Ivy';
  item.command = 'ivy.showStatusBarQuickPick';
  item.show();
};

export const showStatusBarQuickPick = () => {
  vscode.window.showQuickPick(['Deactivate Animation', 'Activate Animation'], { ignoreFocusOut: true }).then(selection => {
    if (selection === 'Deactivate Animation') {
      executeCommand('engine.deactivateAnimation');
    } else if (selection === 'Activate Animation') {
      executeCommand('engine.activateAnimation');
    }
  });
};
