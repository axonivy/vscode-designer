import { LogClientJsonRpc } from '@axonivy/log-view-core';
import { RuntimeLogEntry } from '@axonivy/log-view-protocol';
import * as vscode from 'vscode';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { WebSocket } from 'ws';
import { animationSettings, handleOpenProcessEditor, openEditor } from './animation';
import { WebIdeClientJsonRpc } from './api/jsonrpc';

const outputChannel: vscode.LogOutputChannel = vscode.window.createOutputChannel('Axon Ivy Runtime Log', { log: true });

export const WebSocketClientProvider = (webSocketUrl: URL) => {
  const runtimeLogWebSocket = new WebSocket(new URL('ivy-runtime-log-lsp', webSocketUrl));
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

  const webSocket = new WebSocket(new URL('ivy-web-ide-lsp', webSocketUrl));
  webSocket.onopen = () => {
    const connection = toSocketConnection(webSocket);
    WebIdeClientJsonRpc.startClient(connection).then(client => {
      client.animationSettings(animationSettings());
      client.onOpenProcessEditor.set(process => handleOpenProcessEditor(process));
      client.onOpenFormEditor.set(form => openEditor(form));
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('process.animation')) {
          client.animationSettings(animationSettings());
        }
      });
    });
  };
};

const logMessage = (entry: RuntimeLogEntry) => {
  const logMessage = `[${entry.project}] ${entry.message}`;
  return entry.stacktrace ? `${logMessage} ${entry.stacktrace}` : logMessage;
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
const toSocketConnection = (webSocket: WebSocket) => {
  const socket = toSocket(webSocket);
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  return { reader, writer };
};

const toSocket = (webSocket: WebSocket): IWebSocket => {
  return {
    send: content => webSocket.send(content),
    onMessage: cb => {
      webSocket.onmessage = event => cb(event.data);
    },
    onError: cb => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webSocket.onerror = (event: any) => {
        if (Object.hasOwn(event, 'message')) {
          cb(event.message);
        }
      };
    },
    onClose: cb => {
      webSocket.onclose = event => cb(event.code, event.reason);
    },
    dispose: () => webSocket.close()
  };
};
