import type { TextDocument } from 'vscode';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { WebSocketForwarder, type Endpoint } from './websocket-forwarder';

export class EditorWebSocketForwarder extends WebSocketForwarder {
  constructor(
    websocketUrl: URL,
    websocketEndpoint: Endpoint,
    messenger: Messenger,
    messageParticipant: MessageParticipant,
    notificationType: NotificationType<unknown>,
    readonly document: TextDocument
  ) {
    super(websocketUrl, websocketEndpoint, messenger, messageParticipant, notificationType);
  }

  override dispose(): void {
    this.webSocket.send(JSON.stringify({ method: 'refreshRdm', params: { app: '', project: '', file: this.document.fileName } }));
    super.dispose();
  }
}
