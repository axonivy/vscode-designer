import type {
  FilePickRequest,
  OpenApiGeneratorConfig,
  OpenApiGeneratorResult,
  RestClientActionArgs
} from '@axonivy/restclient-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as path from 'path';
import type { TextDocument, WebviewPanel } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { logErrorMessage, logInformationMessage } from '../../base/logging-util';
import { updateTextDocumentContent } from '../content-writer';
import { pickFile } from '../file-picker';
import {
  createJsonRpcSuccessResponse,
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  isIntegrationRequest,
  noUnknownAction,
  noUnknownIntegrationMethod,
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
    if (isIntegrationRequest(message)) {
      switch (message.method) {
        case 'integration/generate':
          void generateClient(message.params as OpenApiGeneratorConfig, this.document).then(result => {
            const response = createJsonRpcSuccessResponse(message, result);
            super.handleServerMessage(response);
          });
          break;
        case 'integration/file/pick':
          void pickFile(message.params as FilePickRequest, this.document).then(result => {
            const response = createJsonRpcSuccessResponse(message, result);
            super.handleServerMessage(response);
          });
          break;
        default: {
          const response = noUnknownIntegrationMethod(message, message.method);
          super.handleServerMessage(response);
        }
      }
      return;
    }

    if (isAction<RestClientActionArgs>(message)) {
      switch (message.params.actionId) {
        case 'openUrl':
          openUrlExternally(message.params.payload as string);
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

async function generateClient(openapi: OpenApiGeneratorConfig, document: TextDocument): Promise<OpenApiGeneratorResult> {
  const projectPath = path.dirname(path.dirname(document.uri.fsPath));
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
    logInformationMessage(`${openapi.clientName} OpenAPI client generated successfully`);

    const sourcePathAdded = await new BuildSourcePathHelper().ensureGeneratedSourcePath(projectPath, outputDir);
    if (sourcePathAdded) {
      logInformationMessage(`Added ${openapi.clientName} client source path to pom.xml.`);
    }

    return {
      success: true,
      message: `${openapi.clientName} OpenAPI client generated successfully`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `${error}`;
    logErrorMessage(`OpenAPI client generation failed: ${errorMessage}`);
    return {
      success: false,
      message: `OpenAPI client generation failed: ${errorMessage}`
    };
  }
}
