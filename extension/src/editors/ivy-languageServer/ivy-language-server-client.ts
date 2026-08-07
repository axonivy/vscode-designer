import { workspace } from 'vscode';
import { LanguageClient, RequestType, type ExecuteCommandParams, type LanguageClientOptions, type StreamInfo } from 'vscode-languageclient/node';
import { createWebSocket, toSocketConnection } from '../../engine/ws-client';
import { onExecuteClientCommand } from '../xhtml-lsp/client-commands';

const ExecuteClientCommandRequest: RequestType<ExecuteCommandParams, unknown, void> = new RequestType('xml/executeClientCommand');

export const IvyLanguageServerClientProvider = async (webSocketUrl: URL) => {
  const serverOptions = (): Promise<StreamInfo> => {
    const webSocket = createWebSocket(new URL('ivy-language-server', webSocketUrl));
    return new Promise((resolve, reject) => {
      webSocket.onopen = () => {
        const connection = toSocketConnection(webSocket);
        resolve(connection as unknown as StreamInfo);
      };
      webSocket.onerror = reject;
    });
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', pattern: '**/*.d.json' }],

    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.d.json')
    }
  };

  const languageClient = new LanguageClient('ivy language server', serverOptions, clientOptions);
  languageClient.start();

  languageClient.onRequest(ExecuteClientCommandRequest, params => onExecuteClientCommand(languageClient, params));

  return languageClient;
};
