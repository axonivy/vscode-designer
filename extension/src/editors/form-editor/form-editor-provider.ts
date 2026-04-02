import type { CustomTextEditorProvider, ExtensionContext, TextDocument, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { messenger } from '../..';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export default class FormEditorProvider implements CustomTextEditorProvider {
  private static readonly viewType = 'ivy.formEditor';

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    const provider = new FormEditorProvider(context, websocketUrl);
    return window.registerCustomEditorProvider(FormEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    });
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'form-editor');
  }
}
