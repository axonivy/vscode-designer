import { AbstractMessageReader, type DataCallback, Disposable, MessageReader } from 'vscode-jsonrpc';
import type { NotificationType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';

export class WebviewMessageReader extends AbstractMessageReader implements MessageReader {
  protected state: 'initial' | 'listening' | 'closed' = 'initial';
  protected callback: DataCallback | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly events: { message?: any; error?: any }[] = [];

  constructor(messenger: Messenger, notificationType: NotificationType<string>) {
    super();
    messenger.onNotification(notificationType, message => this.readMessage(message));
  }

  listen(callback: DataCallback): Disposable {
    if (this.state === 'initial') {
      this.state = 'listening';
      this.callback = callback;
      while (this.events.length !== 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const event = this.events.pop()!;
        if (event.message) {
          this.readMessage(event.message);
        } else if (event.error) {
          this.fireError(event.error);
        } else {
          this.fireClose();
        }
      }
    }
    return {
      dispose: () => {
        if (this.callback === callback) {
          this.callback = undefined;
        }
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readMessage(message: any): void {
    if (this.state === 'initial') {
      this.events.splice(0, 0, { message });
    } else if (this.state === 'listening') {
      try {
        const data = JSON.parse(message);
        this.callback?.(data);
      } catch (err) {
        const error: Error = {
          name: '' + 400,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: `Error during message parsing, reason = ${typeof err === 'object' ? (err as any).message : 'unknown'}`
        };
        this.fireError(error);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected override fireError(error: any): void {
    if (this.state === 'initial') {
      this.events.splice(0, 0, { error });
    } else if (this.state === 'listening') {
      super.fireError(error);
    }
  }

  protected override fireClose(): void {
    if (this.state === 'initial') {
      this.events.splice(0, 0, {});
    } else if (this.state === 'listening') {
      super.fireClose();
    }
    this.state = 'closed';
  }
}
