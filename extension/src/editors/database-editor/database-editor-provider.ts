import * as vscode from 'vscode';
import { messenger } from '../..';
import { createWebViewContent } from '../webview-helper';
import { registerOpenDatabaseEditorCmd } from './open-database-editor-cmd';
import { setupCommunication } from './webview-communication';

export class DatabaseEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'ivy.databaseEditor';

  private constructor(
    readonly context: vscode.ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    registerOpenDatabaseEditorCmd(context, websocketUrl);
    const provider = new DatabaseEditorProvider(context, websocketUrl);
    return vscode.window.registerCustomEditorProvider(DatabaseEditorProvider.viewType, provider);
  }

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document.fileName);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'database-editor');
  }
}
