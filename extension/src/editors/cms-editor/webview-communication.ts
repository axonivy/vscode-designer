import type { CmsActionArgs } from '@axonivy/cms-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { InitializeConnectionRequest, isAction, WebviewReadyNotification } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const ConfigWebSocketMessage: NotificationType<unknown> = { method: 'cmsWebSocketMessage' };

export const setupCommunication = (websocketUrl: URL, messenger: Messenger, webviewPanel: vscode.WebviewPanel, file: string) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new CmsEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class CmsEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant) {
    super(websocketUrl, 'ivy-cms-lsp', messenger, messageParticipant, ConfigWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<CmsActionArgs>(message) && message.params.actionId === 'openUrl') {
      IvyBrowserViewProvider.instance.openEngineRelativeUrl(message.params.payload);
    }
    super.handleClientMessage(message);
  }
}
