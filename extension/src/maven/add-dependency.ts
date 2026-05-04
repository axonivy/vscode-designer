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

type ProjectId = Pick<ProjectBean, 'id'>['id'];
type AddDependencyFromGraphParams = {
  source: ProjectId;
  dependency: ProjectId;
};

export const registerAddDependencyHandler = (context: ExtensionContext) => {
  registerCommand('ivyProjects.addDependency', context, addDependencyHandler);
  registerCommand('ivyProjects.addDependencyFromGraph', context, addDependencyFromGraphHandler);
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
  await addDependency(targetProjectBean, newDependency);
};

const addDependencyFromGraphHandler = async (params: AddDependencyFromGraphParams) => {
  if (!params?.source || !params?.dependency) {
    logErrorMessage('Add dependency failed: source or dependency project missing.');
    return;
  }

  const projectBeans = await IvyEngineManager.instance.projects(true);
  if (!projectBeans) {
    logErrorMessage('Add dependency failed: no projects available.');
    return;
  }

  const targetProjectBean = projectBeans.find(p => p.id.app === params.source.app && p.id.pmv === params.source.pmv);
  const newDependency = projectBeans.find(p => p.id.app === params.dependency.app && p.id.pmv === params.dependency.pmv);
  if (!targetProjectBean || !newDependency) {
    logErrorMessage('Add dependency failed: could not resolve selected projects.');
    return;
  }
  if (targetProjectBean.id.app === newDependency.id.app && targetProjectBean.id.pmv === newDependency.id.pmv) {
    logErrorMessage('Cannot add a dependency from a project to itself.');
    return;
  }
  if (targetProjectBean.dependencies.find(d => d.app === newDependency.id.app && d.pmv === newDependency.id.pmv)) {
    return;
  }
  if (!isNotCircular(targetProjectBean, projectBeans, newDependency)) {
    logErrorMessage('Cannot add dependency because it would create a circular dependency.');
    return;
  }

  await addDependency(targetProjectBean, newDependency);
};

const addDependency = async (targetProjectBean: ProjectBean, newDependency: ProjectBean) => {
  const pomPath = Uri.joinPath(Uri.file(targetProjectBean.projectDirectory), 'pom.xml').fsPath;
  await commands.executeCommand('maven.project.addDependency', {
    pomPath,
    groupId: newDependency.groupId,
    artifactId: newDependency.artifactId,
    version: newDependency.version === targetProjectBean.version ? '${project.version}' : newDependency.version,
    packaging: 'iar'
  });
  await IvyEngineManager.instance.refreshProjectStatuses();
  await IvyProjectExplorer.instance.refreshProjectGraph();
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
