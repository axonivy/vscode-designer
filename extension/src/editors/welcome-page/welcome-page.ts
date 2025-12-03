import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { NotificationType } from 'vscode-messenger-common';
import { Command } from '../../base/commands';
import { getIvyProject } from '../../base/ivyProjectSelection';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { addNewProject } from '../../project-explorer/new-project';
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
  messenger.onNotification(commandType, (command: Command) => executeCommand(command));

  panel.webview.html = createWebViewContent(context, panel.webview, 'welcome-page');
  currentPanel = panel;
  const version = `${extensionVersion.major}.${extensionVersion.minor}.${extensionVersion.patch}`;
  messenger.sendNotification(versionType, { type: 'webview', webviewType: 'ivy.welcomePage' }, version);

  panel.onDidDispose(() => {
    panel.dispose();
    currentPanel = undefined;
  });
};

const executeCommand = async (command: Command) => {
  switch (command) {
    case 'ivyProjects.addNewProject':
      executeAddProject();
      break;
    case 'ivyProjects.addBusinessProcess':
    case 'ivyProjects.addNewFormDialog':
    case 'ivyProjects.importBpmnProcess':
      addProjectEntity(command);
      break;
    default:
      vscode.commands.executeCommand(command);
  }
};

const executeAddProject = async () => {
  let folder;
  if (vscode.workspace.workspaceFolders?.length === 1) {
    folder = vscode.workspace.workspaceFolders[0];
  } else {
    folder = await vscode.window.showWorkspaceFolderPick();
  }

  if (!folder) {
    return;
  }
  addNewProject(folder.uri);
};

const addProjectEntity = async (command: Command) => {
  const projectExplorer = IvyProjectExplorer.instance;
  const project = await getIvyProject(projectExplorer);

  switch (command) {
    case 'ivyProjects.addBusinessProcess':
      projectExplorer.addProcess(project, 'Business Process');
      break;
    case 'ivyProjects.addNewFormDialog':
      projectExplorer.addUserDialog(project, 'Form');
      break;
    case 'ivyProjects.importBpmnProcess':
      projectExplorer.importBpmnProcess(project);
      break;
  }
};
