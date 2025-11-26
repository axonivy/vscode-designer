import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { treeSelectionToProjectPath } from '../../project-explorer/tree-selection';
import { createWebViewContent } from '../webview-helper';

let currentPanel: vscode.WebviewPanel | undefined;

export const showWelcomePage = (context: vscode.ExtensionContext) => {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel('ivy.welcomePage', 'Axon Ivy Pro Designer', vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true
  });

  panel.webview.onDidReceiveMessage(
    message => {
      if (message?.type === 'open-external-link' && typeof message.url === 'string') {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      } else if (message?.type === 'execute-command' && typeof message.command === 'string') {
        executeCommand(message.command);
      }
    },
    undefined,
    context.subscriptions
  );

  panel.webview.html = createWebViewContent(context, panel.webview, 'welcome-page');
  currentPanel = panel;

  panel.webview.postMessage({ type: 'initialData', version: '13.2.0' });
  panel.onDidDispose(() => panel.dispose());
};

const executeCommand = async (command: string) => {
  /*
  const folders = vscode.workspace.workspaceFolders;

  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage('No folders are open in the workspace.');
    return;
  }

  const items = folders.map(f => ({
    label: f.name,
    description: f.uri.fsPath,
    uri: f.uri
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a workspace folder'
  });

  if (!selected) {
    return;
  }
    */

  const folder = vscode.workspace.workspaceFolders[0].uri;

  const selection = await treeSelectionToProjectPath(folder, IvyProjectExplorer.instance.getIvyProjects());
  vscode.commands.executeCommand(command, selection);
};
