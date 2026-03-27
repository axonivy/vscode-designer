import { LogClientJsonRpc } from '@axonivy/log-view-core';
import { RuntimeLogEntry } from '@axonivy/log-view-protocol';
import * as vscode from 'vscode';
import { createWebSocket, toSocketConnection } from '../engine/ws-client';

const outputChannel: vscode.LogOutputChannel = vscode.window.createOutputChannel('Axon Ivy Runtime Log', { log: true });

export const RuntimeLogViewProvider = (webSocketUrl: URL) => {
  const runtimeLogWebSocket = createWebSocket(new URL('ivy-runtime-log-lsp', webSocketUrl));
  runtimeLogWebSocket.onopen = () => {
    const connection = toSocketConnection(runtimeLogWebSocket);

    LogClientJsonRpc.startClient(connection).then(client => {
      client.data().then(data =>
        data.forEach(entry => {
          logByLevel(entry);
        })
      );
      client.onNotification('newEntry', entry => {
        logByLevel(entry);
      });
    });
  };
};

const logMessage = (entry: RuntimeLogEntry) => {
  let logMessage = `[${entry.project}] [${entry.category}]`;
  if (entry.processElement) {
    logMessage += ` [${entry.processElement}]`;
  }
  if (entry.userDialogId) {
    logMessage += ` [${entry.userDialogId}]`;
  }
  logMessage += ` ${entry.message}`;
  if (entry.throwableInformationMsg && entry.throwableInformationMsg !== '<StackTrace is not available>') {
    logMessage += `
    ${entry.throwableInformationMsg}`;
  }
  return logMessage;
};

const logByLevel = (entry: RuntimeLogEntry): void => {
  const message = logMessage(entry);
  switch (entry.level) {
    case 'DEBUG':
      outputChannel.debug(message);
      break;
    case 'INFO':
      outputChannel.info(message);
      break;
    case 'WARN':
      outputChannel.warn(message);
      break;
    case 'ERROR':
      outputChannel.error(message);
      break;
    default:
      outputChannel.appendLine(message);
  }
};

export const showRuntimeLog = () => {
  outputChannel.show();
};
