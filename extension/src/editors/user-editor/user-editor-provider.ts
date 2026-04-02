import type { CustomTextEditorProvider, ExtensionContext, TextDocument, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export class UserEditorProvider implements CustomTextEditorProvider {
  static readonly viewType = 'ivy.userEditor';

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    registerOpenConfigEditorCmd('ivyEditor.openUserEditor', context, 'users.yaml');
    const provider = new UserEditorProvider(context, websocketUrl);
    const providerRegistration = window.registerCustomEditorProvider(UserEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'user-editor');
  }
}
