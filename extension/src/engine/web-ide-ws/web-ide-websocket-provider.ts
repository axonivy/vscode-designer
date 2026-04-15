import { workspace } from 'vscode';
import { animationSettings } from '../../base/configurations';
import { WebIdeClientJsonRpc } from '../api/jsonrpc';
import { createWebSocket, toSocketConnection } from '../ws-client';
import { openEditor } from './open-editor';
import { handleOpenProcessEditor } from './open-process-editor';
import { openXhtmlEditor } from './open-xhtml-editor';

export const WebIdeWebSocketProvider = (webSocketUrl: URL) => {
  const webIdeWebSocket = createWebSocket(new URL('ivy-web-ide-lsp', webSocketUrl));
  webIdeWebSocket.onopen = () => {
    const connection = toSocketConnection(webIdeWebSocket);
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
};
