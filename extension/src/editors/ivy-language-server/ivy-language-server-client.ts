import { workspace, type LogOutputChannel } from 'vscode';
import {
  LanguageClient,
  RequestType,
  type ExecuteCommandParams,
  type LanguageClientOptions,
  type StreamInfo
} from 'vscode-languageclient/node';
import { createWebSocket, toSocketConnection } from '../../engine/ws-client';
import { onExecuteClientCommand } from '../xhtml-lsp/client-commands';

const ExecuteClientCommandRequest: RequestType<ExecuteCommandParams, unknown, void> = new RequestType('xml/executeClientCommand');

export const IvyLanguageServerClientProvider = (webSocketUrl: URL, outputChannel: LogOutputChannel) => {
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
    outputChannel,
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.{f,d,p}.json'),
        workspace.createFileSystemWatcher('**/config/*.yaml'),
        workspace.createFileSystemWatcher('**/jandex.idx')
      ]
    }
  };

  const languageClient = new LanguageClient('Axon Ivy Language Server', serverOptions, clientOptions);
  languageClient.onRequest(ExecuteClientCommandRequest, params => onExecuteClientCommand(languageClient, params));
  return languageClient;
};
