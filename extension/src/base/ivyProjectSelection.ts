import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';

export const getIvyProject = async (projectExplorer: IvyProjectExplorer) => {
  const projects = await projectExplorer.getIvyProjects();
  let uri: string;

  if (!projects || projects.length === 0) {
    vscode.window.showErrorMessage('No ivy-projects are open in the workspace.');
    return;
  } else if (projects.length === 1) {
    uri = projects[0] ?? '';
  } else {
    uri = (await showIvyProjectPick(projects)) ?? '';
  }

  return vscode.Uri.file(uri);
};

const showIvyProjectPick = async (projects: Array<string>) => {
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
  return selected.uri;
};
