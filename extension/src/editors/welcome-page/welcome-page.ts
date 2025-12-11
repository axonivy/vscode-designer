import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { NotificationType, RequestType } from 'vscode-messenger-common';
import { extensionVersion } from '../../version/extension-version';
import { createWebViewContent } from '../webview-helper';

let messenger: Messenger | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

const openUrlType: NotificationType<string> = { method: 'openUrl' };
const commandType: NotificationType<string> = { method: 'executeCommand' };
const versionType: NotificationType<string> = { method: 'versionDelivered' };
const showWelcomePageType: NotificationType<boolean> = { method: 'showWelcomePage' };
const toggleShowWelcomePageType: RequestType<boolean, boolean> = { method: 'toggleShowWelcomePage' };

export const showWelcomePageKey = 'showWelcomePage';

export const conditionalWelcomePage = async (context: vscode.ExtensionContext) => {
  if (showWelcomePageState(context)) {
    showWelcomePage(context);
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

  const messenger = initializeMessenger(context);
  messenger.registerWebviewPanel(panel);

  panel.webview.html = createWebViewContent(context, panel.webview, 'welcome-page');
  currentPanel = panel;

  const version = `${extensionVersion.major}.${extensionVersion.minor}.${extensionVersion.patch}`;
  messenger.sendNotification(versionType, { type: 'webview', webviewType: 'ivy.welcomePage' }, version);
  messenger.sendNotification(showWelcomePageType, { type: 'webview', webviewType: 'ivy.welcomePage' }, showWelcomePageState(context));

  panel.onDidDispose(() => {
    panel.dispose();
    currentPanel = undefined;
  });
};

const showWelcomePageState = (context: vscode.ExtensionContext) => {
  return context.workspaceState.get<boolean>(showWelcomePageKey, true);
};

const initializeMessenger = (context: vscode.ExtensionContext) => {
  if (messenger) {
    return messenger;
  }
  messenger = new Messenger();
  messenger.onNotification(openUrlType, (url: string) => {
    vscode.env.openExternal(vscode.Uri.parse(url));
  });
  messenger.onNotification(commandType, command => {
    vscode.commands.executeCommand(command);
  });
  messenger.onRequest(toggleShowWelcomePageType, () => {
    const newShowWelcomePageState = !showWelcomePageState(context);
    context.workspaceState.update(showWelcomePageKey, newShowWelcomePageState);
    return newShowWelcomePageState;
  });
  return messenger;
};
