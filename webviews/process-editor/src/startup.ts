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
import { MonacoUtil, type MonacoApi } from '@axonivy/process-editor-inscription-view';
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

    this.setupDefinitionNavigation();

    // Setup clipboard handler for Monaco editors in webview
    setupPasteShortcutHandler();
    setupCutShortcutHandler();
    setupSelectAllShortcutHandler(this.actionDispatcher);

    // Setup save shortcut handler for Monaco editors
    setupSaveShortcutHandler(() => this.messenger.sendNotification(SaveDocumentNotification, HOST_EXTENSION));
  }

  private setupDefinitionNavigation() {
    type DefinitionEditor = ReturnType<MonacoApi['editor']['getEditors']>[number];
    let lastFocusedEditor: DefinitionEditor | undefined;
    void MonacoUtil.monaco().then(monaco => {
      const enableDefinitionLinksForMacroEditors = (editor: DefinitionEditor) => {
        const updateMacroOptions = () => {
          if (editor.getModel()?.getLanguageId() === 'ivyMacro') {
            editor.updateOptions({ contextmenu: true, links: true });
          }
        };
        updateMacroOptions();
        editor.onDidChangeModel(updateMacroOptions);
      };
      monaco.editor.getEditors().forEach(enableDefinitionLinksForMacroEditors);
      monaco.editor.onDidCreateEditor(enableDefinitionLinksForMacroEditors);
    });
    const sendDefinitionActivation = (
      target: EventTarget | null,
      useLastFocusedEditor = false,
      clientPoint?: { x: number; y: number }
    ) => {
      void MonacoUtil.monaco().then(monaco => {
        const targetNode = target instanceof Node ? target : undefined;
        const editor =
          monaco.editor.getEditors().find(candidate => targetNode && candidate.getDomNode()?.contains(targetNode)) ??
          monaco.editor.getEditors().find(candidate => candidate.hasTextFocus()) ??
          (useLastFocusedEditor ? lastFocusedEditor : undefined);
        const model = editor?.getModel();
        const mouseTarget = clientPoint && editor ? editor.getTargetAtClientPoint(clientPoint.x, clientPoint.y) : undefined;
        const position = mouseTarget?.position ?? editor?.getPosition();
        if (!model || !position) {
          return;
        }
        lastFocusedEditor = editor;
        this.messenger.sendNotification(DefinitionLinkActivationNotification, HOST_EXTENSION, {
          uri: model.uri.toString(true),
          position: { line: position.lineNumber - 1, character: position.column - 1 }
        });
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        sendDefinitionActivation(event.target);
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const actionLabel = target instanceof Element ? target.closest('.action-item')?.textContent?.trim() : undefined;
      const isGoToDefinitionAction = actionLabel?.startsWith('Go to Definition') ?? false;
      const isModifierClick = event.metaKey || event.ctrlKey;
      if (isModifierClick || isGoToDefinitionAction) {
        sendDefinitionActivation(
          target,
          isGoToDefinitionAction,
          isModifierClick ? { x: event.clientX, y: event.clientY } : undefined
        );
      }
    };
    const rememberFocusedEditor = (target: EventTarget | null) => {
      if (!(target instanceof Node)) {
        return;
      }
      void MonacoUtil.monaco().then(monaco => {
        lastFocusedEditor = monaco.editor.getEditors().find(candidate => candidate.getDomNode()?.contains(target)) ?? lastFocusedEditor;
      });
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('focusin', event => rememberFocusedEditor(event.target), true);
    document.addEventListener('contextmenu', event => rememberFocusedEditor(event.target), true);
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
