import {
  EnableToolPaletteAction,
  GLSPActionDispatcher,
  IDiagramStartup,
  RequestTypeHintsAction,
  ShowGridAction,
  TYPES
} from '@eclipse-glsp/client';
import { ContainerModule, inject, injectable } from 'inversify';

import { EnableInscriptionAction } from '@axonivy/process-editor-inscription';
import { MonacoUtil } from '@axonivy/process-editor-inscription-view';
import { EnableHistoryAction, EnableViewportAction, UpdatePaletteItems } from '@axonivy/process-editor-protocol';
import { toConnection } from '@axonivy/vscode-webview-common';
import { HOST_EXTENSION, type NotificationType, type RequestType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import './index.css';
import { setupCutShortcutHandler, setupPasteShortcutHandler, setupSaveShortcutHandler } from './monaco-fix';
import { setupSelectAllShortcutHandler } from './select-all-shortcut';

const WebviewConnectionReadyNotification: NotificationType<void> = { method: 'connectionReady' };
const InitializeConnectionRequest: RequestType<void, void> = { method: 'initializeConnection' };
const SaveDocumentNotification: NotificationType<void> = { method: 'document/save' };
const DefinitionModifierStateNotification: NotificationType<boolean> = { method: 'definitionModifierState' };
const DefinitionLinkActivationNotification: NotificationType<{
  uri: string;
  position: { line: number; character: number };
}> = { method: 'definitionLinkActivation' };

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
    this.actionDispatcher.dispatch(EnableHistoryAction.create());

    this.setupDefinitionModifierState();

    // Setup clipboard handler for Monaco editors in webview
    setupPasteShortcutHandler();
    setupCutShortcutHandler();
    setupSelectAllShortcutHandler(this.actionDispatcher);

    // Setup save shortcut handler for Monaco editors
    setupSaveShortcutHandler(() => this.messenger.sendNotification(SaveDocumentNotification, HOST_EXTENSION));
  }

  private setupDefinitionModifierState() {
    let definitionModifierActive = false;
    const updateDefinitionModifierState = (active: boolean) => {
      if (definitionModifierActive === active) {
        return;
      }
      definitionModifierActive = active;
      this.messenger.sendNotification(DefinitionModifierStateNotification, HOST_EXTENSION, active);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'Control' || event.metaKey || event.ctrlKey) {
        updateDefinitionModifierState(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        updateDefinitionModifierState(event.ctrlKey);
      } else if (event.key === 'Control') {
        updateDefinitionModifierState(event.metaKey);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      void MonacoUtil.monaco().then(monaco => {
        const editor = monaco.editor.getEditors().find(candidate => candidate.getDomNode()?.contains(target));
        const model = editor?.getModel();
        const position = editor?.getPosition();
        if (!model || !position) {
          return;
        }
        this.messenger.sendNotification(DefinitionLinkActivationNotification, HOST_EXTENSION, {
          uri: model.uri.toString(true),
          position: { line: position.lineNumber - 1, character: position.column - 1 }
        });
      });
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('blur', () => updateDefinitionModifierState(false));
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
