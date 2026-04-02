import type { ExtensionContext, WebviewPanel } from 'vscode';
import { ViewColumn, window } from 'vscode';
import { messenger } from '../..';
import { registerCommand } from '../../base/commands';
import { logErrorMessage } from '../../base/logging-util';
import type { TreeSelection } from '../../project-explorer/tree-selection';
import { openEditorCmdProjectPath } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { CmsEditorRegistry } from './cms-editor-registry';
import { setupCommunication } from './webview-communication';

export const registerOpenCmsEditorCmd = (context: ExtensionContext, websocketUrl: URL) => {
  const command = 'ivyEditor.openCmsEditor';
  registerCommand('ivyEditor.openCmsEditor', context, async (selection: TreeSelection) => {
    const projectPath = await openEditorCmdProjectPath(command, selection);
    if (!projectPath) {
      logErrorMessage(`${command}: No valid Axon Ivy Project selected.`);
      return;
    }
    if (revealExistingPanel(projectPath)) {
      return;
    }
    const webviewPanel = window.createWebviewPanel('cms-editor', `CMS`, ViewColumn.One);
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

export const setupWebviewPanel = (context: ExtensionContext, websocketUrl: URL, projectPath: string, webviewPanel: WebviewPanel) => {
  CmsEditorRegistry.register(projectPath, webviewPanel);

  const projectName = projectPath.split('/').pop();
  webviewPanel.title = `CMS - ${projectName}`;

  setupCommunication(websocketUrl, messenger, webviewPanel, projectPath);
  webviewPanel.webview.options = { enableScripts: true };
  webviewPanel.webview.html = createWebViewContent(context, webviewPanel.webview, 'cms-editor');
};
