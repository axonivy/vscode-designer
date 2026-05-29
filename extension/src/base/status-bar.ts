import { StatusBarAlignment, ThemeColor, window, type StatusBarItem } from 'vscode';
import { executeCommand } from './commands';

const DEFAULT_ICON: StatusBarIcon = '$(ivy-logo)';
const DEFAULT_PREFIX = 'Axon Ivy';
const DEFAULT_PRIORITY = 1;
const DEFAULT_SUCCESS_MESSAGE_DURATION = 3_000;
const DEFAULT_FAILURE_MESSAGE_DURATION = 10_000;

type StatusBarIcon = '$(ivy-logo)' | '$(loading~spin)' | '$(error)' | '$(check)';

interface StatusBarProgressOptions {
  textDuring: string;
  textSuccess: string;
  textFailure: string;
  prefix?: string;
  successMsgDuration?: number;
  failureMsgDuration?: number;
}

let statusBarItem: StatusBarItem | undefined;
let temporaryTimeout: ReturnType<typeof setTimeout> | undefined;

const getStatusBarItem = () => {
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, DEFAULT_PRIORITY);
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

export const withStatusBarProgress = async <R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R> => {
  const { textDuring, textSuccess, textFailure, prefix, successMsgDuration, failureMsgDuration } = options;
  const item = getStatusBarItem();
  const previousText = item.text;
  const previousBackground = item.backgroundColor;

  if (temporaryTimeout) {
    clearTimeout(temporaryTimeout);
    temporaryTimeout = undefined;
  }

  setStatusBarItem(textDuring, '$(loading~spin)', prefix);

  try {
    const result = await action();
    setStatusBarItem(textSuccess, '$(check)', prefix);
    temporaryTimeout = setTimeout(() => {
      item.text = previousText;
      item.backgroundColor = previousBackground;
      temporaryTimeout = undefined;
    }, successMsgDuration ?? DEFAULT_SUCCESS_MESSAGE_DURATION);
    return result;
  } catch (error) {
    setStatusBarItem(textFailure, '$(error)', prefix, true);
    temporaryTimeout = setTimeout(() => {
      item.text = previousText;
      item.backgroundColor = previousBackground;
      temporaryTimeout = undefined;
    }, failureMsgDuration ?? DEFAULT_FAILURE_MESSAGE_DURATION);
    throw error;
  }
};
