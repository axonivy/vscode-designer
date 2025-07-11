import * as vscode from 'vscode';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { WebSocket } from 'ws';
import { animationSettings, handleOpenProcessEditor, openEditor } from './animation';
import { WebIdeClientJsonRpc } from './api/jsonrpc';

export const WebSocketClientProvider = (webSocketUrl: URL) => {
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
