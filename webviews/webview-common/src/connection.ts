import { HOST_EXTENSION, type NotificationType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import { WebviewMessageReader } from './message-reader';
import { WebviewMessageWriter } from './message-writer';

export type InitializeConnection = { file: string };
const WebviewReadyNotification: NotificationType<void> = { method: 'ready' };
const InitializeConnectionNotification: NotificationType<InitializeConnection> = { method: 'initializeConnection' };

export const initMessenger = (messenger: Messenger, start: (init: InitializeConnection) => Promise<void>) => {
  messenger.onNotification(InitializeConnectionNotification, start);
  messenger.start();
  messenger.sendNotification(WebviewReadyNotification, HOST_EXTENSION);
};

type Method =
  | 'configWebSocketMessage'
  | 'cmsWebSocketMessage'
  | 'databaseWebSocketMessage'
  | 'dataclassWebSocketMessage'
  | 'formWebSocketMessage'
  | 'inscriptionWebSocketMessage'
  | 'ivyScriptWebSocketMessage';

export const toConnection = (messenger: Messenger, method: Method) => {
  const WebSocketMessage: NotificationType<unknown> = { method };
  return {
    reader: new WebviewMessageReader(messenger, WebSocketMessage),
    writer: new WebviewMessageWriter(messenger, WebSocketMessage)
  };
};
