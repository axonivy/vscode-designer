import { BaseRpcClient, Connection, createMessageConnection, Disposable } from '@axonivy/jsonrpc';
import { ProcessBean, type HdBean } from './generated/client';
import { Callback, WebIdeClient } from './jsonrpc-protocol';

export interface WebIdeOnRequestTypes {
  openProcessEditor: [ProcessBean, Promise<boolean>];
  openFormEditor: [HdBean, Promise<boolean>];
}

export type AnimationSettings = {
  animate: boolean;
  speed: number;
  mode: string;
};

export interface WebIdeNotificationTypes {
  animationSettings: [AnimationSettings];
}

export class WebIdeClientJsonRpc extends BaseRpcClient implements WebIdeClient {
  onOpenProcessEditor = new Callback<ProcessBean, Promise<boolean>>();
  onOpenFormEditor = new Callback<HdBean, Promise<boolean>>();
  protected override setupConnection(): void {
    super.setupConnection();
    this.toDispose.push(this.onOpenProcessEditor);
    this.toDispose.push(this.onOpenFormEditor);
    this.onRequest('openProcessEditor', data => this.onOpenProcessEditor.call(data) ?? new Promise(() => false));
    this.onRequest('openFormEditor', data => this.onOpenFormEditor.call(data) ?? new Promise(() => false));
  }

  animationSettings(settings: AnimationSettings) {
    return this.sendNotification('animationSettings', settings);
  }

  sendNotification<K extends keyof WebIdeNotificationTypes>(command: K, args: WebIdeNotificationTypes[K][0]) {
    return args === undefined ? this.connection.sendNotification(command) : this.connection.sendNotification(command, args);
  }

  onRequest<K extends keyof WebIdeOnRequestTypes>(
    kind: K,
    listener: (args: WebIdeOnRequestTypes[K][0]) => WebIdeOnRequestTypes[K][1]
  ): Disposable {
    return this.connection.onRequest(kind, listener);
  }

  public static async startClient(connection: Connection): Promise<WebIdeClient> {
    const messageConnection = createMessageConnection(connection.reader, connection.writer);
    const client = new WebIdeClientJsonRpc(messageConnection);
    client.start();
    connection.reader.onClose(() => client.stop());
    return client;
  }
}
