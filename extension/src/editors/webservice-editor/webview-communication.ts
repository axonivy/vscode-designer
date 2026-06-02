import type { WebServiceActionArgs, WsGeneratorConfig } from '@axonivy/webservice-editor-protocol';
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
    if (isAction<WebServiceActionArgs>(message)) {
      switch (message.params.actionId) {
        case 'openUrl':
          openUrlExternally(message.params.payload as string);
          break;
        case 'generateCxfClient':
          generateClient(message.params.payload, this.document);
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

async function generateClient(payload: string | WsGeneratorConfig, document: TextDocument) {
  const projectPath = path.dirname(path.dirname(document.uri.fsPath));

  try {
    const codegen = JSON.parse(payload as string) as WsGeneratorConfig;
    const outputDir = `src_generated/soap/${codegen.clientName}`;

    const commandParts = [
      'mvn com.axonivy.ivy.tool.soap:cxf-client-codegen:generate-cxf-client -ntp',
      `"-Divy.generate.webservice.client.wsdl=${codegen.wsdlUrl}"`,
      `"-Divy.generate.webservice.client.output=${outputDir}"`,
      `"-Divy.generate.webservice.client.underscoreNames=${codegen.underscoreNames}"`
    ];
    if (codegen.namespace?.trim()) {
      commandParts.push(`"-Divy.generate.webservice.client.namespace=${codegen.namespace}"`);
    }
    const command = commandParts.join(' ');

    await runMavenCommand(projectPath, command);
    window.showInformationMessage(`${codegen.clientName} web service client generation succeeded`);

    const sourcePathAdded = await new BuildSourcePathHelper().ensureGeneratedSourcePath(projectPath, outputDir);
    if (sourcePathAdded) {
      window.showInformationMessage(`Added ${codegen.clientName} client source path to pom.xml.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;
    window.showErrorMessage(`Web service client generation failed: ${message}`);
  }
}
