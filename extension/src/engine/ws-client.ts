import * as vscode from 'vscode';
import { WebSocketMessageReader, WebSocketMessageWriter, type IWebSocket } from 'vscode-ws-jsonrpc';
import { logErrorMessage } from '../base/logging-util';
import { animationSettings, handleOpenProcessEditor, openEditor } from './animation';
import { WebIdeClientJsonRpc } from './api/jsonrpc';

export const WebIdeWebSocketProvider = (webSocketUrl: URL) => {
  const webIdeWebSocket = createWebSocket(new URL('ivy-web-ide-lsp', webSocketUrl));
  webIdeWebSocket.onopen = () => {
    const connection = toSocketConnection(webIdeWebSocket);
    WebIdeClientJsonRpc.startClient(connection).then(client => {
      client.animationSettings(animationSettings());
      client.onOpenProcessEditor.set(process => handleOpenProcessEditor(process));
      client.onOpenFormEditor.set(form => openEditor(form));
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('axonivy.process.animation')) {
          client.animationSettings(animationSettings());
        }
      });
    });
  };
};

export const toSocketConnection = (webSocket: WebSocket) => {
  const socket = toSocket(webSocket);
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  return { reader, writer };
};

export const createWebSocket = (url: URL) => {
  const webSocket = new WebSocket(url);
  webSocket.onclose = event => {
    if (event.code !== 1000) {
      logErrorMessage(`WebSocket connection to ${url} closed abnormally (code: ${event.code}, reason: ${event.reason})`);
    }
  };
  return webSocket;
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
