import * as vscode from 'vscode';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export class WebServiceEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'ivy.webServiceClientEditor';

  private constructor(
    readonly context: vscode.ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    registerOpenConfigEditorCmd('ivyEditor.openWebServiceClientEditor', context, 'webservice-clients.yaml');
    const provider = new WebServiceEditorProvider(context, websocketUrl);
    const providerRegistration = vscode.window.registerCustomEditorProvider(WebServiceEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'webservice-editor');
  }
}
