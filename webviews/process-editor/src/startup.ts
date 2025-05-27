import { EnableToolPaletteAction, GLSPActionDispatcher, IDiagramStartup, TYPES } from '@eclipse-glsp/client';
import { ContainerModule, inject, injectable } from 'inversify';

import { EnableInscriptionAction } from '@axonivy/process-editor-inscription';
import { EnableViewportAction, UpdatePaletteItems } from '@axonivy/process-editor-protocol';
import { RequestTypeHintsAction } from '@eclipse-glsp/vscode-integration';
import { HOST_EXTENSION, NotificationType, RequestType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import './index.css';
import { toConnection } from '@axonivy/vscode-webview-common';

const WebviewConnectionReadyNotification: NotificationType<void> = { method: 'connectionReady' };
const InitializeConnectionRequest: RequestType<void, void> = { method: 'initializeConnection' };

@injectable()
export class StandaloneDiagramStartup implements IDiagramStartup {
  @inject(Messenger) protected messenger: Messenger;
  @inject(GLSPActionDispatcher) protected actionDispatcher: GLSPActionDispatcher;

  async preRequestModel(): Promise<void> {
    this.actionDispatcher.dispatch(RequestTypeHintsAction.create());
    this.actionDispatcher.dispatch(EnableToolPaletteAction.create());
    this.actionDispatcher.dispatch(EnableViewportAction.create());
  }

  async postRequestModel(): Promise<void> {
    this.actionDispatcher.dispatch(UpdatePaletteItems.create());
    this.messenger.onRequest(InitializeConnectionRequest, () => this.initConnection());
    this.messenger.sendNotification(WebviewConnectionReadyNotification, HOST_EXTENSION);
  }

  private initConnection() {
    this.actionDispatcher.onceModelInitialized().finally(() => {
      const ivyScript = toConnection(this.messenger, 'ivyScriptWebSocketMessage');
      const inscription = toConnection(this.messenger, 'inscriptionWebSocketMessage');
      this.actionDispatcher.dispatch(EnableInscriptionAction.create({ connection: { ivyScript, inscription } }));
    });
  }
}

export const ivyStartupDiagramModule = new ContainerModule(bind => {
  bind(TYPES.IDiagramStartup).to(StandaloneDiagramStartup).inSingletonScope();
});
