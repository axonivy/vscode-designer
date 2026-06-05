import { workspace } from 'vscode';
import { animationSettings } from '../../base/configurations';
import { WebIdeClientJsonRpc } from '../api/jsonrpc';
import { createWebSocket, toSocketConnection } from '../ws-client';
import { openEditor } from './open-editor';
import { handleOpenProcessEditor } from './open-process-editor';
import { openXhtmlEditor } from './open-xhtml-editor';

export type WebSocketReadyState = WebSocket['readyState'] | undefined;
const webIdeWebSocketStateListeners: Array<(readyState: WebSocketReadyState) => void> = [];

export const onWebIdeWebSocketStateChange = (listener: (readyState: WebSocketReadyState) => void) => {
  webIdeWebSocketStateListeners.push(listener);
};

const notifyWebIdeWebSocketStateChange = (readyState: WebSocketReadyState) => {
  webIdeWebSocketStateListeners.forEach(listener => listener(readyState));
};

export const WebIdeWebSocketProvider = (webSocketUrl: URL) => {
  const socket = createWebSocket(new URL('ivy-web-ide-lsp', webSocketUrl));
  socket.onopen = () => {
    notifyWebIdeWebSocketStateChange(socket.readyState);
    const connection = toSocketConnection(socket);
    WebIdeClientJsonRpc.startClient(connection).then(client => {
      client.animationSettings(animationSettings());
      client.onOpenProcessEditor.set(process => handleOpenProcessEditor(process));
      client.onOpenFormEditor.set(form => openEditor(form));
      client.onOpenXhtmlEditor.set(xhtml => openXhtmlEditor(xhtml));
      workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('axonivy.process.animation')) {
          client.animationSettings(animationSettings());
        }
      });
    });
  };

  socket.addEventListener('close', () => {
    notifyWebIdeWebSocketStateChange(socket.readyState);
  });
};
