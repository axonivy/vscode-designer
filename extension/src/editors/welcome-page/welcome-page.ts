import * as vscode from 'vscode';
import { createWebViewContent } from '../webview-helper';

let currentPanel: vscode.WebviewPanel | undefined;

export const showWelcomePage = (context: vscode.ExtensionContext) => {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel('ivy.welcomePage', 'Axon Ivy Pro Designer', vscode.ViewColumn.One, {
    enableScripts: true
  });

  panel.webview.html = createWebViewContent(context, panel.webview, 'welcome-page');
  currentPanel = panel;
};
