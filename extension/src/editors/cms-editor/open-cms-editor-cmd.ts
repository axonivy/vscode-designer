import * as vscode from 'vscode';
import { messenger } from '../..';
import { registerCommand } from '../../base/commands';
import { logErrorMessage } from '../../base/logging-util';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { TreeSelection, treeSelectionToUri, treeUriToProjectPath } from '../../project-explorer/tree-selection';
import { createWebViewContent } from '../webview-helper';
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
    const webviewPanel = vscode.window.createWebviewPanel('cms-editor', 'CMS', vscode.ViewColumn.One, { enableScripts: true });
    setupCommunication(websocketUrl, messenger, webviewPanel, projectPath);
    webviewPanel.webview.html = createWebViewContent(context, webviewPanel.webview, 'cms-editor');
  });
};

const showError = (message: string) => {
  logErrorMessage(`Open CMS Editor: ${message}`);
};
