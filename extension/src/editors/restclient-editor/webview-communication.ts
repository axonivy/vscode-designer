import type { OpenApiGeneratorConfig, RestClientActionArgs } from '@axonivy/restclient-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as path from 'path';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { updateTextDocumentContent } from '../content-writer';
import {
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  noUnknownAction,
  openUrlExternally,
  WebviewReadyNotification
} from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const RestClientWebSocketMessage: NotificationType<unknown> = { method: 'restClientWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: vscode.WebviewPanel,
  document: vscode.TextDocument
) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new RestClientWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: document.fileName }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class RestClientWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: vscode.TextDocument
  ) {
    super(websocketUrl, 'ivy-restclient-lsp', messenger, messageParticipant, RestClientWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<RestClientActionArgs>(message)) {
      switch (message.params.actionId) {
        case 'openUrl':
          openUrlExternally(message.params.payload as string);
          break;
        case 'generateOpenApiClient':
          generateClient(message.params.payload as string, this.document);
          break;
        default:
          noUnknownAction(message.params.actionId);
      }
    }
    super.handleClientMessage(message);
  }

  protected override handleServerMessage(message: string) {
    const obj = JSON.parse(message);
    if (hasEditorFileContent(obj)) {
      updateTextDocumentContent(this.document, obj.result).then(() => super.handleServerMessage(message));
    } else {
      super.handleServerMessage(message);
    }
  }
}

function generateClient(payRaw: string, document: vscode.TextDocument) {
  const projectPath = path.dirname(path.dirname(document.uri.fsPath));
  const openapi = JSON.parse(payRaw) as OpenApiGeneratorConfig;
  const outputDir = `src_generated/rest/${openapi.clientName}`;
  const terminal = vscode.window.createTerminal({ name: 'Generate OpenAPI Client', cwd: projectPath });

  const command = [
    'mvn com.axonivy.ivy.tool.rest:openapi-codegen:generate-openapi-client',
    `-Divy.generate.openapi.client.spec=${shellQuote(openapi.spec)}`,
    `-Divy.generate.openapi.client.output=${shellQuote(outputDir)}`,
    `-Divy.generate.openapi.client.namespace=${shellQuote(openapi.namespace)}`,
    `-Divy.generate.openapi.client.resolveFully=${openapi.resolveFully}`
  ].join('\\\n ');

  terminal.show();
  terminal.sendText(command);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
