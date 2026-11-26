import type { FormActionArgs } from '@axonivy/form-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import type { TextDocument, WebviewPanel } from 'vscode';
import { commands, Uri } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyEngineManager } from '../../engine/engine-manager';
import { iarContentEngineFileUri, iarContentUriFromEngineUri } from '../../project-explorer/iar-content-provider';
import { IvyBrowserViewProvider } from '../../views/browser/ivy-browser-view-provider';
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

const FormWebSocketMessage: NotificationType<unknown> = { method: 'formWebSocketMessage' };

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
    new FormEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document, engineFileName, readOnly),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: engineFileName, readOnly }),
      { sender: messageParticipant }
    ),
    webviewPanel.onDidDispose(() => toDispose.dispose())
  );
};

class FormEditorWebSocketForwarder extends EditorWebSocketForwarder {
  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    document: TextDocument,
    engineFileName: string,
    private readonly readOnly: boolean
  ) {
    super(websocketUrl, 'ivy-form-lsp', messenger, messageParticipant, FormWebSocketMessage, document, engineFileName);
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
          IvyBrowserViewProvider.instance.openInBrowser(message.params.payload);
          break;
        case 'openProcess': {
          const processUri = this.document.uri.with({ path: `${path}Process.p.json` });
          commands.executeCommand('vscode.open', this.readOnly ? iarContentEngineFileUri(processUri) : processUri);
          break;
        }
        case 'openDataClass':
          commands.executeCommand(
            'vscode.open',
            this.readOnly ? this.document.uri.with({ path: `${path}Data.d.json` }) : Uri.parse(`${path}Data.d.json`)
          );
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
    if (hasEditorFileContent(obj) && !this.readOnly) {
      updateTextDocumentContent(this.document, obj.result).then(() => super.handleServerMessage(message));
    } else {
      super.handleServerMessage(message);
    }
  }
}

const openComponent = async (action: FormActionArgs) => {
  const form = await IvyEngineManager.instance.engineApi?.getComponentForm({
    componentId: action.payload,
    project: action.context.project
  });
  if (form?.uri) {
    const formUri = Uri.parse(form.uri.startsWith('jar:') ? form.uri.slice('jar:'.length) : form.uri);
    commands.executeCommand('vscode.open', iarContentUriFromEngineUri(formUri) ?? formUri);
  }
};
