import { Uri, window } from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { logErrorMessage } from './logging-util';

export const selectIvyProjectDialog = async (dialogTitle?: string) => {
  const projects = await IvyProjectExplorer.instance.getIvyProjects();
  let uri: string | undefined;

  if (!projects || projects.length === 0) {
    logErrorMessage('No ivy-projects are open in the workspace.');
    return;
  } else if (projects.length === 1) {
    uri = projects[0];
  } else {
    uri = await showIvyProjectPick(projects, dialogTitle);
  }

  return uri ? Uri.file(uri) : undefined;
};

const showIvyProjectPick = async (projects: Array<string>, dialogTitle?: string) => {
  const items = projects.map(project => ({
    label: project.substring(project.lastIndexOf('/') + 1),
    description: project,
    uri: project
  }));

  const selected = await window.showQuickPick(items, {
    title: dialogTitle,
    placeHolder: 'Select an Ivy Project'
  });

  if (!selected) {
    return;
  }
  return selected.uri;
};
