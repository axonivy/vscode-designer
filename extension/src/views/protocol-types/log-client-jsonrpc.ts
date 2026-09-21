import { BaseRpcClient, createMessageConnection, Emitter, urlBuilder, type Connection, type MessageConnection } from '@axonivy/jsonrpc';
import type { Event, LogClient } from './log-client';
import type {LogOnNotificationTypes, LogRequestTypes} from './log-protocol';
import type { RuntimeLogEntry } from './log';

export class LogClientJsonRpc extends BaseRpcClient implements LogClient {
  protected onNewEntryEmitter = new Emitter<RuntimeLogEntry>();
  onNewEntry: Event<RuntimeLogEntry> = this.onNewEntryEmitter.event;
  protected override setupConnection(): void {
    super.setupConnection();
    this.toDispose.push(this.onNewEntryEmitter);

    this.onNotification('newEntry', data => {
      this.onNewEntryEmitter.fire(data);
    });
  }

  data(): Promise<RuntimeLogEntry[]> {
    return this.sendRequest('data');
  }

  clear(): void {
    this.sendRequest('clear');
  }

  onNotification<K extends keyof LogOnNotificationTypes>(kind: K, listener: (args: LogOnNotificationTypes[K]) => unknown) {
    return this.connection.onNotification(kind, listener);
  }

  sendRequest<K extends keyof LogRequestTypes>(command: K, args?: LogRequestTypes[K][0]): Promise<LogRequestTypes[K][1]> {
    return args === undefined ? this.connection.sendRequest(command) : this.connection.sendRequest(command, args);
  }

  public static webSocketUrl(url: string) {
    return urlBuilder(url, 'ivy-runtime-log-lsp');
  }

  public static async startClient(connection: Connection): Promise<LogClientJsonRpc> {
    return this.startMessageClient(createMessageConnection(connection.reader, connection.writer));
  }

  public static async startMessageClient(connection: MessageConnection): Promise<LogClientJsonRpc> {
    const client = new LogClientJsonRpc(connection);
    await client.start();
    return client;
  }
}
