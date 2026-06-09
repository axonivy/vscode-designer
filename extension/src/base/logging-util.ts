import { window } from 'vscode';
import { extensionLogOutputChannel } from './extension-output-channel';

export const logErrorMessage = (message: string, ...items: Array<string>) => {
  extensionLogOutputChannel.error(message, ...items);
  return window.showErrorMessage(message, ...items);
};

export const logErrorMessageWithActions = async (message: string, actions: Record<string, () => Promise<void> | Promise<unknown>>) => {
  extensionLogOutputChannel.error(message);
  const selected = await window.showErrorMessage(message, ...Object.keys(actions));

  if (selected && actions[selected]) {
    await actions[selected]();
  }
};

export const logWarningMessage = (message: string, ...items: Array<string>) => {
  extensionLogOutputChannel.warn(message, ...items);
  return window.showWarningMessage(message, ...items);
};

export const logInformationMessage = (message: string, ...items: Array<string>) => {
  extensionLogOutputChannel.info(message, ...items);
  return window.showInformationMessage(message, ...items);
};
