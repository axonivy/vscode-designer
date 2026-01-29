import { DatabaseActionArgs } from '@axonivy/database-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import {
  InitializeConnectionRequest,
  isAction,
  noUnknownAction,
  openUrlExternally,
  WebviewReadyNotification
} from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const ConfigWebSocketMessage: NotificationType<unknown> = { method: 'databaseWebSocketMessage' };

export const setupCommunication = (websocketUrl: URL, messenger: Messenger, webviewPanel: vscode.WebviewPanel, file: string) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new DatabaseEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class DatabaseEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant) {
    super(websocketUrl, 'ivy-database-lsp', messenger, messageParticipant, ConfigWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<DatabaseActionArgs>(message)) {
      switch (message.params.actionId) {
        case 'openUrl':
          openUrlExternally(message.params.payload);
          break;
        default:
          noUnknownAction(message.params.actionId);
      }
    }
    super.handleClientMessage(message);
  }
}
