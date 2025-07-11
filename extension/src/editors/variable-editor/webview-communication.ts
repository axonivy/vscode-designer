import type { VariablesActionArgs } from '@axonivy/variable-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { updateTextDocumentContent } from '../content-writer';
import { hasEditorFileContent, InitializeConnectionRequest, isAction, WebviewReadyNotification } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const ConfigWebSocketMessage: NotificationType<unknown> = { method: 'configWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: vscode.WebviewPanel,
  document: vscode.TextDocument
) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new VariableEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: document.fileName }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class VariableEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: vscode.TextDocument
  ) {
    super(websocketUrl, 'ivy-variables-lsp', messenger, messageParticipant, ConfigWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<VariablesActionArgs>(message) && message.params.actionId === 'openUrl') {
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
