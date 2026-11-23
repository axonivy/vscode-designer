import type { DataActionArgs, DataClassTypeSearchRequest } from '@axonivy/dataclass-editor-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import type { TextDocument, WebviewPanel } from 'vscode';
import { commands, FileSystemError, Uri, workspace } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { logErrorMessage } from '../../base/logging-util';
import { iarContentEngineFileUri } from '../../project-explorer/iar-content-provider';
import { updateTextDocumentContent } from '../content-writer';
import { EditorWebSocketForwarder } from '../editor-websocket-forwarder';
import { JavaProvider } from '../ivy-script/java-provider';
import {
  hasEditorFileContent,
  InitializeConnectionRequest,
  isAction,
  isAllTypesSearchRequest,
  isSearchResult,
  noUnknownAction,
  openUrlExternally,
  WebviewReadyNotification
} from '../notification-helper';

const DataClassWebSocketMessage: NotificationType<unknown> = { method: 'dataclassWebSocketMessage' };

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
    new DataClassEditorWebSocketForwarder(websocketUrl, messenger, messageParticipant, document, engineFileName, readOnly),
    messenger.onNotification(
      WebviewReadyNotification,
      () => messenger.sendNotification(InitializeConnectionRequest, messageParticipant, { file: engineFileName, readOnly }),
      { sender: messageParticipant }
    ),
    webviewPanel.onDidDispose(() => toDispose.dispose())
  );
};

class DataClassEditorWebSocketForwarder extends EditorWebSocketForwarder {
  currentTypeSearch: { type: string; id: number } | undefined;

  readonly javaCompletion: JavaProvider;

  constructor(
    websocketUrl: URL,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    document: TextDocument,
    engineFileName: string,
    private readonly readOnly: boolean
  ) {
    super(websocketUrl, 'ivy-data-class-lsp', messenger, messageParticipant, DataClassWebSocketMessage, document, engineFileName);
    this.javaCompletion = new JavaProvider(document.uri);
  }

  protected override handleClientMessage(message: unknown) {
    if (isAction<DataActionArgs>(message)) {
      const file = this.document.uri.path;
      const path = file.substring(0, file.lastIndexOf('Data.d.json'));
      switch (message.params.actionId) {
        case 'openUrl':
          openUrlExternally(message.params.payload);
          break;
        case 'openProcess': {
          const processUri = this.document.uri.with({ path: `${path}Process.p.json` });
          commands.executeCommand('vscode.open', this.readOnly ? iarContentEngineFileUri(processUri) : processUri);
          break;
        }
        case 'openForm':
          openDialog(this.document.uri);
          break;
        default:
          noUnknownAction(message.params.actionId);
      }
    } else if (isAllTypesSearchRequest<DataClassTypeSearchRequest>(message)) {
      this.currentTypeSearch = { type: message.params.type, id: message.id };
    }
    super.handleClientMessage(message);
  }

  protected override async handleServerMessage(message: string) {
    const obj = JSON.parse(message);
    if (hasEditorFileContent(obj) && !this.readOnly) {
      await updateTextDocumentContent(this.document, obj.result);
    } else if (this.currentTypeSearch?.type && isSearchResult(obj, this.currentTypeSearch.id)) {
      const javaTypes = await this.javaCompletion.javaTypes(this.currentTypeSearch.type);
      obj.result.push(...javaTypes);
      message = JSON.stringify(obj);
    }
    super.handleServerMessage(message);
  }
}

const openDialog = async (documentUri: Uri) => {
  try {
    const path = documentUri.path.substring(0, documentUri.path.lastIndexOf('Data.d.json'));
    let dialogUri = documentUri.with({ path: `${path}.f.json` });
    try {
      await workspace.fs.stat(dialogUri);
    } catch (error) {
      if (!(error instanceof FileSystemError) || error.code !== 'FileNotFound') {
        throw error;
      }
      dialogUri = documentUri.with({ path: `${path}.xhtml` });
    }
    await commands.executeCommand('vscode.open', dialogUri);
  } catch (error) {
    logErrorMessage(String(error));
  }
};
