import { AbstractMessageWriter, Message, MessageWriter } from 'vscode-jsonrpc';
import { HOST_EXTENSION, type NotificationType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';

export class WebviewMessageWriter extends AbstractMessageWriter implements MessageWriter {
  protected errorCount = 0;

  constructor(
    private readonly messenger: Messenger,
    private readonly notificationType: NotificationType<unknown>
  ) {
    super();
  }

  end(): void {}

  async write(msg: Message): Promise<void> {
    try {
      this.messenger.sendNotification(this.notificationType, HOST_EXTENSION, msg);
    } catch (e) {
      this.errorCount++;
      this.fireError(e, msg, this.errorCount);
    }
  }
}
