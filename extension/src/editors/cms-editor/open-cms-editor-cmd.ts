import * as vscode from 'vscode';
import { messenger } from '../..';
import { registerCommand } from '../../base/commands';
import { logErrorMessage } from '../../base/logging-util';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { TreeSelection, treeSelectionToUri, treeUriToProjectPath } from '../../project-explorer/tree-selection';
import { createWebViewContent } from '../webview-helper';
import { CmsEditorRegistry } from './cms-editor-registry';
import { setupCommunication } from './webview-communication';

export const registerOpenCmsEditorCmd = (context: vscode.ExtensionContext, websocketUrl: URL) => {
  registerCommand('ivyBrowserView.openCmsEditor', context, async (selection: TreeSelection) => {
    let projectPath: string | undefined;
    try {
      const uri = await treeSelectionToUri(selection);
      projectPath = await treeUriToProjectPath(uri, IvyProjectExplorer.instance.getIvyProjects());
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!projectPath) {
      showError('No valid Axon Ivy Project selected.');
      return;
    }

    if (revealExistingPanel(projectPath)) {
      return;
    }
    const webviewPanel = vscode.window.createWebviewPanel('cms-editor', `CMS`, vscode.ViewColumn.One);
    setupWebviewPanel(context, websocketUrl, projectPath, webviewPanel);
  });
};

export const revealExistingPanel = (projectPath: string) => {
  const existingPanel = CmsEditorRegistry.find(projectPath);
  if (!existingPanel) {
    return false;
  }
  existingPanel.reveal();
  return true;
};

export const setupWebviewPanel = (
  context: vscode.ExtensionContext,
  websocketUrl: URL,
  projectPath: string,
  webviewPanel: vscode.WebviewPanel
) => {
  CmsEditorRegistry.register(projectPath, webviewPanel);

  const projectName = projectPath.split('/').pop();
  webviewPanel.title = `CMS - ${projectName}`;

  setupCommunication(websocketUrl, messenger, webviewPanel, projectPath);
  webviewPanel.webview.options = { enableScripts: true };
  webviewPanel.webview.html = createWebViewContent(context, webviewPanel.webview, 'cms-editor');
};

const showError = (message: string) => {
  logErrorMessage(`Open CMS Editor: ${message}`);
};
