import { EnableToolPaletteAction, GLSPActionDispatcher, IDiagramStartup, ShowGridAction, TYPES } from '@eclipse-glsp/client';
import { ContainerModule, inject, injectable } from 'inversify';

import { EnableInscriptionAction } from '@axonivy/process-editor-inscription';
import { EnableViewportAction, UpdatePaletteItems } from '@axonivy/process-editor-protocol';
import { toConnection } from '@axonivy/vscode-webview-common';
import { RequestTypeHintsAction } from '@eclipse-glsp/vscode-integration';
import { HOST_EXTENSION, type NotificationType, type RequestType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import './index.css';
import { setupCutShortcutHandler, setupPasteShortcutHandler, setupSaveShortcutHandler } from './monaco-fix';

const WebviewConnectionReadyNotification: NotificationType<void> = { method: 'connectionReady' };
const InitializeConnectionRequest: RequestType<void, void> = { method: 'initializeConnection' };
const SaveDocumentNotification: NotificationType<void> = { method: 'document/save' };

@injectable()
export class StandaloneDiagramStartup implements IDiagramStartup {
  @inject(Messenger) protected messenger!: Messenger;
  @inject(GLSPActionDispatcher) protected actionDispatcher!: GLSPActionDispatcher;

  async preRequestModel(): Promise<void> {
    this.actionDispatcher.dispatch(RequestTypeHintsAction.create());
    this.actionDispatcher.dispatch(EnableToolPaletteAction.create());
    this.actionDispatcher.dispatch(EnableViewportAction.create());
  }

  async postRequestModel(): Promise<void> {
    this.actionDispatcher.dispatch(UpdatePaletteItems.create());
    this.actionDispatcher.dispatch(ShowGridAction.create({ show: true }));
    this.messenger.onRequest(InitializeConnectionRequest, () => this.initConnection());
    this.messenger.sendNotification(WebviewConnectionReadyNotification, HOST_EXTENSION);

    // Setup clipboard handler for Monaco editors in webview
    setupPasteShortcutHandler();
    setupCutShortcutHandler();

    // Setup save shortcut handler for Monaco editors
    setupSaveShortcutHandler(() => this.messenger.sendNotification(SaveDocumentNotification, HOST_EXTENSION));
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
