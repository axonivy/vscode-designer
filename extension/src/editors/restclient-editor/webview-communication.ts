import type { OpenApiGeneratorConfig, RestClientActionArgs } from '@axonivy/restclient-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as path from 'path';
import type { TextDocument, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
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
import { BuildSourcePathHelper } from './build-source-path-helper';
import { runMavenCommand } from './maven-runner';

const RestClientWebSocketMessage: NotificationType<unknown> = { method: 'restClientWebSocketMessage' };

export const setupCommunication = (websocketUrl: URL, messenger: Messenger, webviewPanel: WebviewPanel, document: TextDocument) => {
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
    readonly document: TextDocument
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

async function generateClient(payRaw: string, document: TextDocument) {
  const projectPath = path.dirname(path.dirname(document.uri.fsPath));
  const openapi = JSON.parse(payRaw) as OpenApiGeneratorConfig;
  const outputDir = `src_generated/rest/${openapi.clientName}`;

  const command = [
    'mvn com.axonivy.ivy.tool.rest:openapi-codegen:generate-openapi-client -ntp',
    `"-Divy.generate.openapi.client.spec=${openapi.spec}"`,
    `"-Divy.generate.openapi.client.output=${outputDir}"`,
    `"-Divy.generate.openapi.client.namespace=${openapi.namespace}"`,
    `"-Divy.generate.openapi.client.resolveFully=${openapi.resolveFully}"`
  ].join(' ');

  try {
    await runMavenCommand(projectPath, command);
    window.showInformationMessage(`${openapi.clientName} OpenAPI client generation succeeded`);

    const sourcePathAdded = await new BuildSourcePathHelper().ensureGeneratedSourcePath(projectPath, openapi.clientName);
    if (sourcePathAdded) {
      window.showInformationMessage(`Added ${openapi.clientName} client source path to pom.xml.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;
    window.showErrorMessage(`OpenAPI client generation failed: ${message}`);
  }
}
