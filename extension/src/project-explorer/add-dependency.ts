import * as vscode from 'vscode';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import { logErrorMessage } from '../base/logging-util';
import { ProjectBean } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectExplorer } from './ivy-project-explorer';
import { TreeSelection, treeUriToProjectPath } from './tree-selection';

export const addDependencyHandler = async (uri: TreeSelection) => {
  let targetProject: string | undefined;
  if (uri instanceof vscode.Uri) {
    targetProject = await treeUriToProjectPath(uri, IvyProjectExplorer.instance.getIvyProjects());
  }
  if (targetProject === undefined) {
    targetProject = await selectIvyProjectDialog('Select project to add dependency to').then(uri => uri?.fsPath);
  }
  if (targetProject === undefined) {
    logErrorMessage('No project selected. Cannot add dependency.');
    return;
  }
  const pomPath = vscode.Uri.joinPath(vscode.Uri.file(targetProject), 'pom.xml').fsPath;
  const projectBeans = await IvyEngineManager.instance.projects(true);
  const targetProjectBean = projectBeans?.find(p => pomPath.startsWith(p.projectDirectory));
  if (!targetProjectBean) {
    logErrorMessage(`No project bean found for selected project ${targetProject}. Cannot add dependency.`);
    return;
  }
  const possibleDeps = projectBeans
    ?.filter(p => p !== targetProjectBean)
    .filter(p => targetProjectBean.dependencies.find(d => d.app === p.id.app && d.pmv === p.id.pmv) === undefined);
  if (possibleDeps === undefined || possibleDeps.length === 0) {
    logErrorMessage('No other projects found to add as dependency.');
    return;
  }
  const newDependency = await showDependencyPick(possibleDeps);
  if (!newDependency) {
    return;
  }
  vscode.commands.executeCommand('maven.project.addDependency', {
    pomPath,
    groupId: newDependency.groupId,
    artifactId: newDependency.artifactId,
    version: newDependency.version === targetProjectBean.version ? '${project.version}' : newDependency.version,
    packaging: 'iar'
  });
};

const showDependencyPick = async (projects: ProjectBean[]) => {
  const items = projects.map(project => ({
    label: project.id.pmv,
    project: project
  }));
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an Ivy Dependency'
  });
  return selected?.project;
};
