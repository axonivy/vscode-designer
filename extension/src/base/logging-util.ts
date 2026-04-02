import { window } from 'vscode';

const outputChannel = window.createOutputChannel('Axon Ivy Extension', { log: true });

export const logErrorMessage = (message: string, ...items: Array<string>) => {
  outputChannel.error(message, ...items);
  return window.showErrorMessage(message, ...items);
};

export const logWarningMessage = (message: string, ...items: Array<string>) => {
  outputChannel.warn(message, ...items);
  return window.showWarningMessage(message, ...items);
};

export const logInformationMessage = (message: string, ...items: Array<string>) => {
  outputChannel.info(message, ...items);
  return window.showInformationMessage(message, ...items);
};
