import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Axon Ivy Extension', { log: true });

export const logErrorMessage = (message: string, ...items: Array<string>) => {
  outputChannel.error(message, ...items);
  return vscode.window.showErrorMessage(message, ...items);
};

export const logWarningMessage = (message: string, ...items: Array<string>) => {
  outputChannel.warn(message, ...items);
  return vscode.window.showWarningMessage(message, ...items);
};

export const logInformationMessage = (message: string, ...items: Array<string>) => {
  outputChannel.info(message, ...items);
  return vscode.window.showInformationMessage(message, ...items);
};
