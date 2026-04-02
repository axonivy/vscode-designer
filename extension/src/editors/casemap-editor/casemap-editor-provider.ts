import type { CustomTextEditorProvider, ExtensionContext, TextDocument, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { messenger } from '../..';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export class CaseMapEditorProvider implements CustomTextEditorProvider {
  static readonly viewType = 'ivy.casemapEditor';

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    const provider = new CaseMapEditorProvider(context, websocketUrl);
    const providerRegistration = window.registerCustomEditorProvider(CaseMapEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'casemap-editor');
  }
}
