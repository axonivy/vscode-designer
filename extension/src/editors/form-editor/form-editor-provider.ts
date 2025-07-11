import * as vscode from 'vscode';
import { messenger } from '../..';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export default class FormEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'ivy.formEditor';

  private constructor(
    readonly context: vscode.ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    const provider = new FormEditorProvider(context, websocketUrl);
    return vscode.window.registerCustomEditorProvider(FormEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    });
  }

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'form-editor');
  }
}
