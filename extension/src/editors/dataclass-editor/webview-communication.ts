import { DataActionArgs } from '@axonivy/dataclass-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { Message, MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { updateTextDocumentContent } from '../content-writer';
import { hasEditorFileContent, InitializeConnectionRequest, isAction, WebviewReadyNotification } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const DataClassWebSocketMessage: NotificationType<unknown> = { method: 'dataclassWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: vscode.WebviewPanel,
  document: vscode.TextDocument
) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new DataClassEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: document.fileName }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class DataClassEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: vscode.TextDocument
  ) {
    super(websocketUrl, 'ivy-data-class-lsp', messenger, messageParticipant, DataClassWebSocketMessage);
  }

  protected override handleClientMessage(message: Message) {
    if (isAction<DataActionArgs>(message) && message.params.actionId === 'openUrl') {
      IvyBrowserViewProvider.instance.open(message.params.payload);
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
