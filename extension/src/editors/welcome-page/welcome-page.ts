import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { NotificationType } from 'vscode-messenger-common';
import { extensionVersion } from '../../version/extension-version';
import { createWebViewContent } from '../webview-helper';

const messenger = new Messenger();
let currentPanel: vscode.WebviewPanel | undefined;

const openUrlType: NotificationType<string> = { method: 'openUrl' };
const commandType: NotificationType<string> = { method: 'executeCommand' };
const versionType: NotificationType<string> = { method: 'versionDelivered' };

export const conditionalWelcomePage = async (context: vscode.ExtensionContext) => {
  const hasShownWelcome = context.workspaceState.get<boolean>('welcomeShown');
  if (!hasShownWelcome) {
    showWelcomePage(context);
    await context.workspaceState.update('welcomeShown', true);
  }
};

export const showWelcomePage = async (context: vscode.ExtensionContext) => {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel('ivy.welcomePage', 'Axon Ivy Pro Designer', vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true
  });

  messenger.registerWebviewPanel(panel);
  messenger.onNotification(openUrlType, (url: string) => {
    vscode.env.openExternal(vscode.Uri.parse(url));
  });
  messenger.onNotification(commandType, command => {
    vscode.commands.executeCommand(command);
  });

  panel.webview.html = createWebViewContent(context, panel.webview, 'welcome-page');
  currentPanel = panel;
  const version = `${extensionVersion.major}.${extensionVersion.minor}.${extensionVersion.patch}`;
  messenger.sendNotification(versionType, { type: 'webview', webviewType: 'ivy.welcomePage' }, version);

  panel.onDidDispose(() => {
    panel.dispose();
    currentPanel = undefined;
  });
};
