import { StartProcessAction } from '@axonivy/process-editor-protocol';
import { IActionHandler } from '@eclipse-glsp/client';
import { inject, injectable } from 'inversify';
import { HOST_EXTENSION, RequestType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';

const StartProcessRequest: RequestType<string, void> = { method: 'startProcess' };

@injectable()
export class StartProcessActionHandler implements IActionHandler {
  constructor(@inject(Messenger) private messenger: Messenger) {}

  handle(action: StartProcessAction) {
    this.messenger.sendRequest(StartProcessRequest, HOST_EXTENSION, action.processStartUri);
  }
}
