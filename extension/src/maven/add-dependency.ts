import path from 'path';
import type { ExtensionContext } from 'vscode';
import { Uri, commands, window } from 'vscode';
import { registerCommand } from '../base/commands';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import { logErrorMessage } from '../base/logging-util';
import type { ProjectBean } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';
import { registerPomCodeLensProvider } from './pom-code-lens-provider';

export const registerAddDependencyHandler = (context: ExtensionContext) => {
  registerCommand('ivyProjects.addDependency', context, addDependencyHandler);
  registerPomCodeLensProvider(context);
};

const addDependencyHandler = async (uri: Uri) => {
  let targetProject: string | undefined;
  if (uri instanceof Uri) {
    targetProject = await treeUriToProjectPath(uri, IvyProjectExplorer.instance.getIvyProjects());
  }
  if (targetProject === undefined) {
    targetProject = await selectIvyProjectDialog('Select project to add dependency to').then(uri => uri?.fsPath);
  }
  if (targetProject === undefined) {
    logErrorMessage('No project selected. Cannot add dependency.');
    return;
  }
  const pomPath = Uri.joinPath(Uri.file(targetProject), 'pom.xml').fsPath;
  const projectBeans = await IvyEngineManager.instance.projects(true);
  const targetProjectBean = projectBeans?.find(p =>
    pomPath.startsWith(p.projectDirectory.endsWith(path.sep) ? p.projectDirectory : p.projectDirectory + path.sep)
  );
  if (!targetProjectBean) {
    logErrorMessage(`No project bean found for selected project ${targetProject}. Cannot add dependency.`);
    return;
  }
  const possibleDeps = projectBeans
    ?.filter(p => p !== targetProjectBean)
    .filter(p => targetProjectBean.dependencies.find(d => d.app === p.id.app && d.pmv === p.id.pmv) === undefined)
    .filter(p => isNotCircular(targetProjectBean, projectBeans, p));
  const newDependency = await showDependencyPick(possibleDeps ?? []);
  if (!newDependency) {
    return;
  }
  commands.executeCommand('maven.project.addDependency', {
    pomPath,
    groupId: newDependency.groupId,
    artifactId: newDependency.artifactId,
    version: newDependency.version === targetProjectBean.version ? '${project.version}' : newDependency.version,
    packaging: 'iar'
  });
};

const isNotCircular = (targetProjectBean: ProjectBean, projectBeans: ProjectBean[], possibleDependency: ProjectBean) => {
  const dependencyProjectBeans = possibleDependency.dependencies
    .map(d => projectBeans?.find(p => p.id.app === d.app && p.id.pmv === d.pmv))
    .filter(p => p !== undefined);
  if (dependencyProjectBeans.includes(targetProjectBean)) {
    return false;
  }
  for (const b of dependencyProjectBeans) {
    if (!isNotCircular(targetProjectBean, projectBeans, b)) {
      return false;
    }
  }
  return true;
};

const showDependencyPick = async (projects: ProjectBean[]) => {
  const items = projects.map(project => ({
    label: project.id.pmv,
    project: project
  }));
  const selected = await window.showQuickPick(items, {
    placeHolder: projects.length > 0 ? 'Select an Ivy Project Dependency' : 'No Ivy Project Dependencies left to add'
  });
  return selected?.project;
};
