import type { CustomTextEditorProvider, ExtensionContext, TextDocument, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { logErrorMessage } from '../../base/logging-util';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../../project-explorer/tree-selection';
import { registerOpenCmsEditorCmd, revealExistingPanel, setupWebviewPanel } from './open-cms-editor-cmd';

export class CmsEditorProvider implements CustomTextEditorProvider {
  static readonly viewType = 'ivy.cmsEditor';

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    registerOpenCmsEditorCmd(context, websocketUrl);
    const provider = new CmsEditorProvider(context, websocketUrl);
    return window.registerCustomEditorProvider(CmsEditorProvider.viewType, provider);
  }

  async resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
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
