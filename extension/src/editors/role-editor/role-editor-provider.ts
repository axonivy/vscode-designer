import * as vscode from 'vscode';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { setupCommunication } from './webview-communication';

export class RoleEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'ivy.roleEditor';

  private constructor(
    readonly context: vscode.ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    registerOpenConfigEditorCmd('ivyEditor.openRoleEditor', context, 'roles.yaml');
    const provider = new RoleEditorProvider(context, websocketUrl);
    const providerRegistration = vscode.window.registerCustomEditorProvider(RoleEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'role-editor');
  }
}
