import * as vscode from 'vscode';

export type LogType = 'info' | 'warning' | 'error';

export const logMessage = (type: LogType, message: string, ...items: Array<string>) => {
  switch (type) {
    case 'info':
      return vscode.window.showInformationMessage(message, ...items);
    case 'warning':
      return vscode.window.showWarningMessage(message, ...items);
    case 'error':
      return vscode.window.showErrorMessage('error', message, ...items);
  }
};
