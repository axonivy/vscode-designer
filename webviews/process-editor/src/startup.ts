import { EnableToolPaletteAction, GLSPActionDispatcher, IDiagramStartup, ShowGridAction, TYPES } from '@eclipse-glsp/client';
import { ContainerModule, inject, injectable } from 'inversify';

import { EnableInscriptionAction } from '@axonivy/process-editor-inscription';
import { EnableViewportAction, UpdatePaletteItems } from '@axonivy/process-editor-protocol';
import { toConnection } from '@axonivy/vscode-webview-common';
import { RequestTypeHintsAction } from '@eclipse-glsp/vscode-integration';
import { HOST_EXTENSION, type NotificationType, type RequestType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import './index.css';

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

    // Setup clipboard bridge for Monaco editors in webview
    this.setupPasteShortcutHandler();

    // Setup save shortcut handler for Monaco editors
    this.setupSaveShortcutHandler();
  }

  private initConnection() {
    this.actionDispatcher.onceModelInitialized().finally(() => {
      const ivyScript = toConnection(this.messenger, 'ivyScriptWebSocketMessage');
      const inscription = toConnection(this.messenger, 'inscriptionWebSocketMessage');
      this.actionDispatcher.dispatch(EnableInscriptionAction.create({ connection: { ivyScript, inscription } }));
    });
  }

  /**
   * Sets up a paste shortcut handler for Monaco editors.
   */
  private setupPasteShortcutHandler() {
    // Intercept keyboard paste shortcut before Monaco handles it
    document.addEventListener(
      'keydown',
      async (event: KeyboardEvent) => {
        // Check for Cmd+V (Mac) or Ctrl+V (Windows/Linux)
        const isPasteShortcut = (event.metaKey || event.ctrlKey) && event.key === 'v';
        if (!isPasteShortcut) {
          return;
        }

        // Check if we're in a Monaco editor
        const target = event.target as HTMLElement;
        if (!isMonacoEditor(target)) {
          return;
        }

        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            // Create a synthetic paste event with the clipboard text
            const clipboardData = new DataTransfer();
            clipboardData.setData('text/plain', text);

            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: clipboardData
            });

            event.preventDefault();
            event.stopPropagation();

            target.dispatchEvent(pasteEvent);
          }
        } catch (error) {
          console.error('Clipboard paste failed, falling back to native paste:', error);
        }
      },
      true
    );
  }

  /**
   * Sets up a save shortcut handler for Monaco editors.
   * Monaco captures Cmd+S/Ctrl+S, so we need to intercept it and forward to VS Code.
   */
  private setupSaveShortcutHandler() {
    document.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
        const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key === 's';
        if (!isSaveShortcut) {
          return;
        }

        // Check if we're in a Monaco editor
        const target = event.target as HTMLElement;
        if (!isMonacoEditor(target)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.messenger.sendNotification(SaveDocumentNotification, HOST_EXTENSION);
      },
      true
    );
  }
}

export const ivyStartupDiagramModule = new ContainerModule(bind => {
  bind(TYPES.IDiagramStartup).to(StandaloneDiagramStartup).inSingletonScope();
});

const isMonacoEditor = (element: HTMLElement) =>
  element.closest('.monaco-editor') !== null ||
  element.classList.contains('inputarea') ||
  element.classList.contains('monaco-mouse-cursor-text');
