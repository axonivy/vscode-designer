import { DataActionArgs, DataClassTypeSearchRequest, JavaType } from '@axonivy/dataclass-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { updateTextDocumentContent } from '../content-writer';
import { JavaCompletion } from '../java-completion';
import {
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  noUnknownAction,
  WebviewReadyNotification
} from '../notification-helper';
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
  lastSearch: { search: string; id: number } | undefined;

  readonly javaCompletion: JavaCompletion;

  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    readonly document: vscode.TextDocument
  ) {
    super(websocketUrl, 'ivy-data-class-lsp', messenger, messageParticipant, DataClassWebSocketMessage);
    this.javaCompletion = new JavaCompletion(document.uri, 'data-class');
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<DataActionArgs>(message)) {
      const file = this.document.uri.path;
      const path = file.substring(0, file.lastIndexOf('Data.d.json'));
      switch (message.params.actionId) {
        case 'openUrl':
          IvyBrowserViewProvider.instance.open(message.params.payload);
          break;
        case 'openProcess':
          vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`${path}Process.p.json`));
          break;
        case 'openForm':
          vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`${path}.f.json`));
          break;
        default:
          noUnknownAction(message.params.actionId);
      }
    }
    if (this.isAllTypesSearchRequest(message)) {
      this.lastSearch = { search: message.params.type, id: message.id };
    }
    super.handleClientMessage(message);
  }

  protected override async handleServerMessage(message: string) {
    const obj = JSON.parse(message);
    if (hasEditorFileContent(obj)) {
      updateTextDocumentContent(this.document, obj.result).then(() => super.handleServerMessage(message));
      return;
    }
    if (this.isSearchResult(obj)) {
      const searchString = this.lastSearch?.search ?? '';
      const completions = await this.javaCompletion.types(searchString);
      console.log(completions.length);
      const javaTypes = completions.map(item => this.toJavaType(item));
      obj.result.push(...javaTypes);
      message = JSON.stringify(obj);
    }
    super.handleServerMessage(message);
  }

  isAllTypesSearchRequest = (obj: unknown): obj is { method: string; params: DataClassTypeSearchRequest; id: number } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'method' in obj &&
      obj.method === 'meta/scripting/allTypes' &&
      'params' in obj &&
      typeof obj.params === 'object' &&
      obj.params !== null &&
      'id' in obj &&
      typeof obj.id === 'number'
    );
  };

  isSearchResult = (obj: unknown): obj is { result: JavaType[]; id: number } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'result' in obj &&
      typeof obj.result === 'object' &&
      obj.result !== null &&
      'id' in obj &&
      obj.id === this.lastSearch?.id
    );
  };

  toJavaType = (item: vscode.CompletionItem): JavaType => {
    const simpleName = typeof item.label === 'string' ? item.label : (item.label.label ?? '');
    const packageName = typeof item.label === 'string' ? '' : (item.label.description ?? '');
    const fullQualifiedName = item.detail ?? '';
    return { simpleName, packageName, fullQualifiedName };
  };
}
