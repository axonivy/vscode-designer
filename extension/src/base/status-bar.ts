import { StatusBarAlignment, ThemeColor, window, type StatusBarItem } from 'vscode';
import { executeCommand } from './commands';

const DEFAULT_ICON: StatusBarIcon = '$(type-hierarchy)';
const DEFAULT_PREFIX = 'Axon Ivy';

type StatusBarIcon = '$(type-hierarchy)' | '$(loading~spin)' | '$(error)';

let statusBarItem: StatusBarItem | undefined;

const getStatusBarItem = () => {
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    statusBarItem.command = 'ivy.showStatusBarQuickPick';
  }
  return statusBarItem;
};

export const setStatusBarMessage = (text: string) => {
  window.setStatusBarMessage(text, 5_000);
};

export const setStatusBarItem = (text: string, icon?: StatusBarIcon, prefix?: string, isError: boolean = false) => {
  const item = getStatusBarItem();
  item.text = `${icon ?? DEFAULT_ICON} ${prefix ?? DEFAULT_PREFIX}: ${text}`;
  item.backgroundColor = isError ? new ThemeColor('statusBarItem.errorBackground') : undefined;
  item.show();
  return item;
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
