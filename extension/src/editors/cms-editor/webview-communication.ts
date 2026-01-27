import type { CmsActionArgs } from '@axonivy/cms-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { InitializeConnectionRequest, isAction, noUnknownAction, WebviewReadyNotification } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const CmsWebSocketMessage: NotificationType<unknown> = { method: 'cmsWebSocketMessage' };

export const setupCommunication = (websocketUrl: URL, messenger: Messenger, webviewPanel: vscode.WebviewPanel, projectPath: string) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new CmsEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, projectPath),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: projectPath }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class CmsEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly projectPath: string
  ) {
    super(websocketUrl, 'ivy-cms-lsp', messenger, messageParticipant, CmsWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<CmsActionArgs>(message)) {
      const actionId = message.params.actionId;
      switch (actionId) {
        case 'openUrl':
          IvyBrowserViewProvider.instance.open(message.params.url);
          break;
        case 'openFile':
          openCmsFile(this.projectPath, message.params.url, message.params.co);
          break;
        default:
          noUnknownAction(actionId);
      }
    }
    super.handleClientMessage(message);
  }
}

const openCmsFile = async (projectPath: string, url: string, co: string) => {
  const coUri = url.substring(url.lastIndexOf(co));
  const fileUri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), 'cms', coUri);
  vscode.commands.executeCommand('vscode.open', fileUri);
};
