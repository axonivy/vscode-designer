import { workspace } from 'vscode';
import { animationSettings } from '../../base/configurations';
import { WebIdeClientJsonRpc } from '../api/jsonrpc';
import { createWebSocket, toSocketConnection } from '../ws-client';
import { openEditor } from './open-editor';
import { handleOpenProcessEditor } from './open-process-editor';
import { openXhtmlEditor } from './open-xhtml-editor';

let webIdeWebSocketState: WebSocket['readyState'] | undefined;
const webIdeWebSocketStateListeners: Array<() => void> = [];

export const getWebIdeWebSocketReadyState = () => webIdeWebSocketState;

export const onWebIdeWebSocketStateChange = (listener: () => void) => {
  webIdeWebSocketStateListeners.push(listener);
};

const notifyWebIdeWebSocketStateChange = () => {
  webIdeWebSocketStateListeners.forEach(listener => listener());
};

export const WebIdeWebSocketProvider = (webSocketUrl: URL) => {
  const socket = createWebSocket(new URL('ivy-web-ide-lsp', webSocketUrl));
  socket.onopen = () => {
    webIdeWebSocketState = socket.readyState;
    notifyWebIdeWebSocketStateChange();
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
    webIdeWebSocketState = socket.readyState;
    notifyWebIdeWebSocketStateChange();
  });
};
