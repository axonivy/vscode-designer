import * as vscode from 'vscode';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { LogClientJsonRpc } from '@axonivy/log-view-core';
import { RuntimeLogEntry } from '@axonivy/log-view-protocol';
import { WebSocket } from 'ws';
import { animationSettings, handleOpenProcessEditor, openEditor } from './animation';
import { WebIdeClientJsonRpc } from './api/jsonrpc';

const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Axon Ivy Runtime Log');

export const WebSocketClientProvider = (webSocketUrl: URL) => {
  const runtimeLogWebSocket = new WebSocket(new URL('ivy-runtime-log-lsp', webSocketUrl));
  runtimeLogWebSocket.onopen = () => {
    const connection = toSocketConnection(runtimeLogWebSocket);

    LogClientJsonRpc.startClient(connection).then(client => {
      client.data().then(data =>
        data.forEach(entry => {
          outputChannel.appendLine(logMessage(entry));
        })
      );
      client.onNotification('newEntry', entry => {
        outputChannel.appendLine(logMessage(entry));
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
  const logMessage = `[${entry.timestamp}][${entry.level}][${entry.project}] ${entry.message}`;
  return entry.stacktrace ? `${logMessage} ${entry.stacktrace}` : logMessage;
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
