import { TypeSearchRequest } from '@axonivy/process-editor-inscription-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType, RequestType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { JavaCompletion } from '../java-completion';
import { isAllTypesSearchRequest, isSearchResult } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';
import { SendInscriptionNotification, handleActionLocal } from './inscription-view/action-handlers';

const ColorThemeChangedNotification: NotificationType<'dark' | 'light'> = { method: 'colorThemeChanged' };
const WebviewConnectionReadyNotification: NotificationType<void> = { method: 'connectionReady' };
const InitializeConnectionRequest: RequestType<void, void> = { method: 'initializeConnection' };
const StartProcessRequest: RequestType<string, Promise<void>> = { method: 'startProcess' };

const InscriptionWebSocketMessage: NotificationType<unknown> = { method: 'inscriptionWebSocketMessage' };
const IvyScriptWebSocketMessage: NotificationType<unknown> = { method: 'ivyScriptWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: vscode.WebviewPanel,
  document: vscode.CustomDocument,
  messageParticipant?: MessageParticipant
) => {
  if (messageParticipant === undefined) {
    return;
  }
  const toDispose = new DisposableCollection(
    new InscriptionWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    new WebSocketForwarder(websocketUrl, 'ivy-script-lsp', messenger, messageParticipant, IvyScriptWebSocketMessage),
    messenger.onNotification(WebviewConnectionReadyNotification, () => handleWebviewReadyNotification(messenger, messageParticipant), {
      sender: messageParticipant
    }),
    messenger.onRequest<string, Promise<void>>(
      StartProcessRequest,
      startUri => IvyBrowserViewProvider.instance.openEngineRelativeUrl(startUri),
      {
        sender: messageParticipant
      }
    ),
    vscode.window.onDidChangeActiveColorTheme(theme =>
      messenger.sendNotification(ColorThemeChangedNotification, messageParticipant, vsCodeThemeToMonacoTheme(theme))
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

const handleWebviewReadyNotification = async (messenger: Messenger, messageParticipant: MessageParticipant) => {
  await messenger.sendRequest(InitializeConnectionRequest, messageParticipant);
  messenger.sendNotification(ColorThemeChangedNotification, messageParticipant, vsCodeThemeToMonacoTheme(vscode.window.activeColorTheme));
};

const vsCodeThemeToMonacoTheme = (theme: vscode.ColorTheme) => {
  return theme.kind === vscode.ColorThemeKind.Dark || theme.kind === vscode.ColorThemeKind.HighContrast ? 'dark' : 'light';
};

class InscriptionWebSocketForwarder extends WebSocketForwarder {
  private readonly sendInscriptionNotification: SendInscriptionNotification;

  currentTypeSearch: { type: string; id: number } | undefined;

  readonly javaCompletion: JavaCompletion;

  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant, document: vscode.CustomDocument) {
    super(websocketUrl, 'ivy-inscription-lsp', messenger, messageParticipant, InscriptionWebSocketMessage);
    this.sendInscriptionNotification = (type: string) =>
      this.messenger.sendNotification(this.notificationType, this.messageParticipant, JSON.stringify({ method: type }));
    this.javaCompletion = new JavaCompletion(document.uri, 'inscription');
  }

  protected override handleClientMessage(message: unknown) {
    const handled = handleActionLocal(message, this.sendInscriptionNotification);
    if (handled) {
      return;
    }
    if (isAllTypesSearchRequest<TypeSearchRequest>(message)) {
      this.currentTypeSearch = { type: message.params.type, id: message.id };
    }
    super.handleClientMessage(message);
  }

  protected override async handleServerMessage(message: string) {
    const obj = JSON.parse(message);
    if (this.currentTypeSearch?.type && isSearchResult(obj, this.currentTypeSearch.id)) {
      const javaTypes = await this.javaCompletion.types(this.currentTypeSearch.type);
      obj.result.push(...javaTypes);
      message = JSON.stringify(obj);
    }
    super.handleServerMessage(message);
  }
}
