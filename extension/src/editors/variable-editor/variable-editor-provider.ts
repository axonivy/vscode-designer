import type { CustomTextEditorProvider, ExtensionContext, TextDocument, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { IAR_CONTENT_SCHEME, iarContentEngineFileName } from '../../project-explorer/iar-content-provider';
import { setupCommunication } from './webview-communication';

export class VariableEditorProvider implements CustomTextEditorProvider {
  static readonly viewType = 'ivy.variableEditor';

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    registerOpenConfigEditorCmd('ivyEditor.openVariableEditor', context, 'variables.yaml');
    const provider = new VariableEditorProvider(context, websocketUrl);
    const providerRegistration = window.registerCustomEditorProvider(VariableEditorProvider.viewType, provider);
    return providerRegistration;
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
    const readOnly = document.uri.scheme === IAR_CONTENT_SCHEME;
    const engineFileName = readOnly ? iarContentEngineFileName(document.uri) : document.fileName;
    setupCommunication(this.websocketUrl, messenger, webviewPanel, document, engineFileName, readOnly);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'variable-editor');
  }
}
