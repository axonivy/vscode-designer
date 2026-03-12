import * as vscode from 'vscode';
import { ExecuteCommandParams, LanguageClient, RequestType, type LanguageClientOptions, type StreamInfo } from 'vscode-languageclient/node';
import { createWebSocket, toSocketConnection } from '../../engine/ws-client';

const ExecuteClientCommandRequest: RequestType<ExecuteCommandParams, unknown, void> = new RequestType('xml/executeClientCommand');

class JsonDocumentSymbol extends vscode.DocumentSymbol {
  toJSON() {
    return {
      name: this.name,
      kind: this.kind,
      range: this.range,
      selectionRange: this.selectionRange,
      tags: this.tags,
      detail: this.detail,
      children: this.children
    };
  }

  static fixPrototype(symbol: vscode.DocumentSymbol): void {
    Object.setPrototypeOf(symbol, JsonDocumentSymbol.prototype);
    symbol.children.forEach(child => JsonDocumentSymbol.fixPrototype(child));
  }
}

export const XhtmlLanguageClientProvider = async (webSocketUrl: URL) => {
  const serverOptions = (): Promise<StreamInfo> => {
    const webSocket = createWebSocket(new URL('ivy-xhtml-lsp', webSocketUrl));
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

  languageClient.onRequest(ExecuteClientCommandRequest, async (params: ExecuteCommandParams) => {
    const args = params.arguments ?? [];
    if (params.command === 'vscode.executeDocumentSymbolProvider') {
      args[0] = vscode.Uri.parse(args[0]);
      const msg = await vscode.commands.executeCommand(params.command, ...args);
      if (Array.isArray(msg) && msg.length > 0) {
        (msg as vscode.DocumentSymbol[]).forEach(element => JsonDocumentSymbol.fixPrototype(element));
      }
      return msg;
    }

    return await vscode.commands.executeCommand(params.command, ...args);
  });

  return languageClient;
};
