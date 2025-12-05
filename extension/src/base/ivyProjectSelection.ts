import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { logErrorMessage } from './logging-util';

export const getIvyProject = async (projectExplorer: IvyProjectExplorer) => {
  const projects = await projectExplorer.getIvyProjects();
  let uri: string | undefined;

  if (!projects || projects.length === 0) {
    logErrorMessage('No ivy-projects are open in the workspace.');
    return;
  } else if (projects.length === 1) {
    uri = projects[0];
  } else {
    uri = await showIvyProjectPick(projects);
  }

  return uri ? vscode.Uri.file(uri) : undefined;
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
