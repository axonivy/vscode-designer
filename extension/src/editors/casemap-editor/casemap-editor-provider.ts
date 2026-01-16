import * as vscode from 'vscode';
import { messenger } from '../..';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export class CaseMapEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'ivy.casemapEditor';

  private constructor(readonly context: vscode.ExtensionContext, readonly websocketUrl: URL) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    const provider = new CaseMapEditorProvider(context, websocketUrl);
    const providerRegistration = vscode.window.registerCustomEditorProvider(CaseMapEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'casemap-editor');
  }
}
