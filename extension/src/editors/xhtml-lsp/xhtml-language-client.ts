import * as vscode from 'vscode';
import { LanguageClient, type LanguageClientOptions, type StreamInfo } from 'vscode-languageclient/node';
import { WebSocket } from 'ws';
import { toSocketConnection } from '../../engine/ws-client';

export const XhtmlLanguageClientProvider = async (webSocketUrl: URL) => {
  const serverOptions = (): Promise<StreamInfo> => {
    const webSocket = new WebSocket(new URL('ivy-xhtml-lsp', webSocketUrl));
    return new Promise((resolve, reject) => {
      webSocket.onopen = () => {
        const connection = toSocketConnection(webSocket);
        resolve(connection as unknown as StreamInfo);
      };
      webSocket.onerror = reject;
    });
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'html', scheme: 'file', pattern: '**/*.xhtml' }],

    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.xhtml')
    }
  };

  const languageClient = new LanguageClient('xhtml server', serverOptions, clientOptions);

  languageClient.start();
  return languageClient;
};
