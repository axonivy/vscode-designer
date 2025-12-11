import * as vscode from 'vscode';
import { logErrorMessage } from '../../base/logging-util';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../../project-explorer/tree-selection';
import { registerOpenCmsEditorCmd, revealExistingPanel, setupWebviewPanel } from './open-cms-editor-cmd';

export class CmsEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'ivy.cmsEditor';

  private constructor(
    readonly context: vscode.ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    registerOpenCmsEditorCmd(context, websocketUrl);
    const provider = new CmsEditorProvider(context, websocketUrl);
    return vscode.window.registerCustomEditorProvider(CmsEditorProvider.viewType, provider);
  }

  async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    const projectPath = await treeUriToProjectPath(document.uri, IvyProjectExplorer.instance.getIvyProjects());
    if (!projectPath) {
      logErrorMessage('Failed to find project associated with the document.');
      return;
    }
    if (revealExistingPanel(projectPath)) {
      webviewPanel.dispose();
      return;
    }
    setupWebviewPanel(this.context, this.websocketUrl, projectPath, webviewPanel);
  }
}
