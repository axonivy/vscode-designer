import type {
  FilePickRequest,
  OpenApiGeneratorConfig,
  OpenApiGeneratorResult,
  RestClientActionArgs
} from '@axonivy/restclient-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as path from 'path';
import { l10n, type TextDocument, type WebviewPanel } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { runJavaProjectConfigurationUpdate } from '../../base/java-extension-api';
import { logErrorMessage, logInformationMessage } from '../../base/logging-util';
import { updateTextDocumentContent } from '../content-writer';
import { EditorWebSocketForwarder } from '../editor-websocket-forwarder';
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
    ),
    webviewPanel.onDidDispose(() => toDispose.dispose())
  );
};

class RestClientWebSocketForwarder extends EditorWebSocketForwarder {
  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant, document: TextDocument) {
    super(websocketUrl, 'ivy-restclient-lsp', messenger, messageParticipant, RestClientWebSocketMessage, document);
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
    const successMessage = l10n.t('{0} OpenAPI client generated successfully', openapi.clientName);
    logInformationMessage(successMessage);

    await runJavaProjectConfigurationUpdate(document.uri);

    return {
      success: true,
      message: successMessage
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `${error}`;
    const failureMessage = l10n.t('OpenAPI client generation failed: {0}', errorMessage);
    logErrorMessage(failureMessage);
    return {
      success: false,
      message: failureMessage
    };
  }
}
