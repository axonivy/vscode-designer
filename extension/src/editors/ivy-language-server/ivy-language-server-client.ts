import { LanguageClient, RequestType, type ExecuteCommandParams, type StreamInfo } from 'vscode-languageclient/node';
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

  const languageClient = new LanguageClient('Axon Ivy Language Server', serverOptions, {});
  languageClient.start();

  languageClient.onRequest(ExecuteClientCommandRequest, params => onExecuteClientCommand(languageClient, params));
};
