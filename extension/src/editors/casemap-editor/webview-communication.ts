import type { CaseMapActionArgs } from '@axonivy/case-map-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { updateTextDocumentContent } from '../content-writer';
import {
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  noUnknownAction,
  WebviewReadyNotification
} from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const CaseMapWebSocketMessage: NotificationType<unknown> = { method: 'caseMapWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: vscode.WebviewPanel,
  document: vscode.TextDocument
) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new CaseMapEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: document.fileName }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class CaseMapEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: vscode.TextDocument
  ) {
    super(websocketUrl, 'ivy-case-map-lsp', messenger, messageParticipant, CaseMapWebSocketMessage);
  }
  
  protected override handleClientMessage(message: unknown) {
    if (isAction<CaseMapActionArgs>(message)) {
      switch (message.params.actionId) {
        case 'openUrl':
          IvyBrowserViewProvider.instance.open(message.params.payload);
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
