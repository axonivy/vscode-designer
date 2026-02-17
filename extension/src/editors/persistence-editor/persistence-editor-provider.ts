import * as vscode from 'vscode';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export class PersistenceEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'ivy.persistenceEditor';

  private constructor(
    readonly context: vscode.ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    registerOpenConfigEditorCmd('ivyEditor.openPersistenceEditor', context, 'persistence.xml');
    const provider = new PersistenceEditorProvider(context, websocketUrl);
    const providerRegistration = vscode.window.registerCustomEditorProvider(PersistenceEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'persistence-editor');
  }
}
