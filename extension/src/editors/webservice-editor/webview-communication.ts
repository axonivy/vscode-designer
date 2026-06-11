import type {
  FilePickRequest,
  WebServiceActionArgs,
  WsGeneratorConfig,
  WsGeneratorResult,
  WsInfo
} from '@axonivy/webservice-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import { promises } from 'fs';
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
import { BuildSourcePathHelper } from '../restclient-editor/build-source-path-helper';
import { runMavenCommand } from '../restclient-editor/maven-runner';
import { WebSocketForwarder } from '../websocket-forwarder';

const WebServiceClientWebSocketMessage: NotificationType<unknown> = { method: 'webServiceClientWebSocketMessage' };

export const setupCommunication = (websocketUrl: URL, messenger: Messenger, webviewPanel: WebviewPanel, document: TextDocument) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new WebServiceClientWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: document.fileName }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class WebServiceClientWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: TextDocument
  ) {
    super(websocketUrl, 'ivy-webservice-lsp', messenger, messageParticipant, WebServiceClientWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isIntegrationRequest(message)) {
      switch (message.method) {
        case 'integration/generate':
          void generateClient(message.params as WsGeneratorConfig, this.document).then(result => {
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

    if (isAction<WebServiceActionArgs>(message)) {
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

async function generateClient(codegen: WsGeneratorConfig, document: TextDocument): Promise<WsGeneratorResult> {
  const projectPath = path.dirname(path.dirname(document.uri.fsPath));

  try {
    const outputDir = `src_generated/ws/${codegen.clientName}`;

    const commandParts = [
      'mvn com.axonivy.ivy.tool.soap:cxf-client-codegen:generate-cxf-client -ntp',
      `"-Divy.generate.webservice.client.wsdl=${codegen.wsdlUrl}"`,
      `"-Divy.generate.webservice.client.output=${outputDir}"`,
      `"-Divy.generate.webservice.client.underscoreNames=${codegen.underscoreNames}"`,
      `"-Divy.generate.webservice.client.writeServiceInfo=true"`
    ];
    if (codegen.namespace?.trim()) {
      commandParts.push(`"-Divy.generate.webservice.client.namespace=${codegen.namespace}"`);
    }
    const command = commandParts.join(' ');

    await runMavenCommand(projectPath, command);

    const sourcePathAdded = await new BuildSourcePathHelper().ensureGeneratedSourcePath(projectPath, outputDir);
    if (sourcePathAdded) {
      logInformationMessage(`Added ${codegen.clientName} client source path to pom.xml.`);
    }

    const serviceJson = path.join(projectPath, outputDir, 'service.json');
    const serviceContent = await promises.readFile(serviceJson, 'utf-8');
    const wsInfo = JSON.parse(serviceContent) as WsInfo;
    await promises.unlink(serviceJson).catch(error => {
      logErrorMessage(`Could not delete generated service info file ${serviceJson}: ${error}`);
    });

    logInformationMessage(`${codegen.clientName} web service client generated successfully`);
    return {
      success: true,
      message: `${codegen.clientName} web service client generated successfully`,
      ...wsInfo
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `${error}`;
    logErrorMessage(`Web service client generation failed: ${errorMessage}`);
    return {
      success: false,
      message: `Web service client generation failed: ${errorMessage}`
    } as WsGeneratorResult;
  }
}
