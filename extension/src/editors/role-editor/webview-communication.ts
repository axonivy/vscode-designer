import type { RoleActionArgs } from '@axonivy/role-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import type { TextDocument, WebviewPanel } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { updateTextDocumentContent } from '../content-writer';
import { EditorWebSocketForwarder } from '../editor-websocket-forwarder';
import {
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  noUnknownAction,
  openUrlExternally,
  WebviewReadyNotification
} from '../notification-helper';

const RoleWebSocketMessage: NotificationType<unknown> = { method: 'roleWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: WebviewPanel,
  document: TextDocument,
  engineFileName: string,
  readOnly: boolean
) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new RoleEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document, engineFileName, readOnly),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: engineFileName, readOnly }),
      { sender: messageParticipant }
    ),
    webviewPanel.onDidDispose(() => toDispose.dispose())
  );
};

class RoleEditorWebSocketForwarder extends EditorWebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    document: TextDocument,
    engineFileName: string,
    private readonly readOnly: boolean
  ) {
    super(websocketUrl, 'ivy-role-lsp', messenger, messageParticipant, RoleWebSocketMessage, document, engineFileName);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<RoleActionArgs>(message)) {
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

  protected override handleServerMessage(message: string) {
    const obj = JSON.parse(message);
    if (hasEditorFileContent(obj) && !this.readOnly) {
      updateTextDocumentContent(this.document, obj.result).then(() => super.handleServerMessage(message));
    } else {
      super.handleServerMessage(message);
    }
  }
}
