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

  panel.webview.onDidReceiveMessage(
    message => {
      if (message?.type === 'open-external-link' && typeof message.url === 'string') {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      }
    },
    undefined,
    context.subscriptions
  );

  panel.webview.html = createWebViewContent(context, panel.webview, 'welcome-page');
  currentPanel = panel;
};
