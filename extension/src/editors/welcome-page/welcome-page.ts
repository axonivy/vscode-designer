import * as vscode from 'vscode';
import { Command } from '../../base/commands';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';
import { addNewProject } from '../../project-explorer/new-project';
import { createWebViewContent } from '../webview-helper';

let currentPanel: vscode.WebviewPanel | undefined;

export const showWelcomePage = async (context: vscode.ExtensionContext) => {
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
  const folder = await getProjectFolder();
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

const getProjectFolder = async () => {
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
  return selected;
};

const getIvyProject = async (projectExplorer: IvyProjectExplorer) => {
  const projects = await projectExplorer.getIvyProjects();
  if (!projects || projects.length === 0) {
    vscode.window.showErrorMessage('No ivy-projects are open in the workspace.');
    return;
  }

  const items = projects.map(project => ({
    label: project.substring(project.lastIndexOf('/') + 1),
    description: project,
    uri: project
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an ivy-project'
  });

  if (!selected) {
    return;
  }

  return vscode.Uri.file(selected.uri);
};
