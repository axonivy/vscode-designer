import type { FormActionArgs } from '@axonivy/form-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import type { TextDocument, WebviewPanel } from 'vscode';
import { commands, Uri } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyEngineManager } from '../../engine/engine-manager';
import { IvyBrowserViewProvider } from '../../views/browser/ivy-browser-view-provider';
import { updateTextDocumentContent } from '../content-writer';
import {
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  noUnknownAction,
  openUrlExternally,
  WebviewReadyNotification
} from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';

const FormWebSocketMessage: NotificationType<unknown> = { method: 'formWebSocketMessage' };

export const setupCommunication = (websocketUrl: URL, messenger: Messenger, webviewPanel: WebviewPanel, document: TextDocument) => {
  const messageParticipant = messenger.registerWebviewPanel(webviewPanel);
  const toDispose = new DisposableCollection(
    new FormEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: document.fileName }),
      { sender: messageParticipant }
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

class FormEditorWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: TextDocument
  ) {
    super(websocketUrl, 'ivy-form-lsp', messenger, messageParticipant, FormWebSocketMessage);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<FormActionArgs>(message)) {
      const file = this.document.uri.path;
      const path = file.substring(0, file.lastIndexOf('.f.json'));
      switch (message.params.actionId) {
        case 'openUrl':
          openUrlExternally(message.params.payload);
          break;
        case 'openPreview':
          IvyBrowserViewProvider.instance.open(message.params.payload);
          break;
        case 'openProcess':
          commands.executeCommand('vscode.open', Uri.parse(`${path}Process.p.json`));
          break;
        case 'openDataClass':
          commands.executeCommand('vscode.open', Uri.parse(`${path}Data.d.json`));
          break;
        case 'openComponent':
          openComponent(message.params);
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

const openComponent = async (action: FormActionArgs) => {
  IvyEngineManager.instance.engineApi?.getComponentForm(action.payload, action.context.app, action.context.pmv).then(form => {
    commands.executeCommand('vscode.open', Uri.parse(form.uri ?? ''));
  });
};
