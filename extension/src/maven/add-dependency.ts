import path from 'path';
import type { ExtensionContext } from 'vscode';
import { Uri, WorkspaceEdit, commands, l10n, window, workspace } from 'vscode';
import { registerCommand } from '../base/commands';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import { logErrorMessage } from '../base/logging-util';
import type { ProjectBean } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';
import { registerPomCodeLensProvider } from './pom-code-lens-provider';

type MavenTestDependency = {
  groupId: string;
  artifactId: string;
};

type MavenDependency = {
  groupId: string;
  artifactId: string;
  version: string;
  packaging: string;
};

export const registerAddDependencyHandler = (context: ExtensionContext) => {
  registerCommand('ivyProjects.addDependency', context, addDependencyHandler);
  registerPomCodeLensProvider(context);
};

const addDependencyHandler = async (uri: Uri) => {
  let targetProject: string | undefined;
  if (uri instanceof Uri) {
    targetProject = await treeUriToProjectPath(uri, IvyProjectManager.instance.getIvyProjects());
  }
  if (targetProject === undefined) {
    targetProject = await selectIvyProjectDialog(l10n.t('Select project to add dependency to')).then(uri => uri?.fsPath);
  }
  if (targetProject === undefined) {
    logErrorMessage(l10n.t('No project selected. Cannot add dependency.'));
    return;
  }
  const pomPath = Uri.joinPath(Uri.file(targetProject), 'pom.xml').fsPath;
  const projectBeans = await IvyEngineManager.instance.projects(true);
  const targetProjectBean = projectBeans?.find(p =>
    pomPath.startsWith(p.projectDirectory.endsWith(path.sep) ? p.projectDirectory : p.projectDirectory + path.sep)
  );
  if (!targetProjectBean) {
    logErrorMessage(l10n.t('No project bean found for selected project {0}. Cannot add dependency.', targetProject));
    return;
  }
  const possibleDeps = projectBeans
    ?.filter(p => p !== targetProjectBean)
    .filter(p => targetProjectBean.dependencies.find(d => d.id === p.id.id) === undefined)
    .filter(p => isNotCircular(targetProjectBean, projectBeans, p));
  const newDependency = await showDependencyPick(possibleDeps ?? []);
  if (!newDependency) {
    return;
  }
  await addMavenDependency(targetProject, {
    groupId: newDependency.groupId,
    artifactId: newDependency.artifactId,
    version: newDependency.version === targetProjectBean.version ? '${project.version}' : newDependency.version,
    packaging: 'iar'
  });
};

const isNotCircular = (targetProjectBean: ProjectBean, projectBeans: ProjectBean[], possibleDependency: ProjectBean) => {
  const dependencyProjectBeans = possibleDependency.dependencies
    .map(d => projectBeans?.find(p => p.id.id === d.id))
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
    label: project.id.name,
    project: project
  }));
  const selected = await window.showQuickPick(items, {
    placeHolder: projects.length > 0 ? l10n.t('Select an Ivy Project Dependency') : l10n.t('No Ivy Project Dependencies left to add')
  });
  return selected?.project;
};

const addMavenDependency = async (projectDirectory: string, dependency: MavenDependency) => {
  const pomPath = Uri.joinPath(Uri.file(projectDirectory), 'pom.xml').fsPath;
  await commands.executeCommand('maven.project.addDependency', { pomPath, ...dependency });
};

export const addMavenTestDependency = async (projectDirectory: string, dependency: MavenTestDependency) => {
  const pomUri = Uri.joinPath(Uri.file(projectDirectory), 'pom.xml');
  const document = await workspace.openTextDocument(pomUri);
  const pom = document.getText();

  const sections = Array.from(pom.matchAll(/<dependencies\b[^>]*>[\s\S]*?<\/dependencies>/g));
  const section = sections[0];

  if (sections.length !== 1 || !section || section.index === undefined) {
    throw new Error(`Expected one <dependencies> section in ${pomUri.fsPath}.`);
  }

  const getTagValue = (block: string, tag: string) => block.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`))?.[1]?.trim();

  const blocks = Array.from(section[0].matchAll(/<dependency\b[^>]*>[\s\S]*?<\/dependency>/g));
  const alreadyExists = blocks.some(
    ([block]) =>
      block !== undefined &&
      getTagValue(block, 'groupId') === dependency.groupId &&
      getTagValue(block, 'artifactId') === dependency.artifactId
  );

  if (alreadyExists) {
    throw new Error(`Dependency ${dependency.groupId}:${dependency.artifactId} already exists.`);
  }

  const dependencyXml = [
    '    <dependency>',
    `      <groupId>${dependency.groupId}</groupId>`,
    `      <artifactId>${dependency.artifactId}</artifactId>`,
    '      <scope>test</scope>',
    '    </dependency>'
  ].join('\n');

  const closeTagIndex = section.index + section[0].lastIndexOf('</dependencies>');
  const insertionLine = pom.lastIndexOf('\n', closeTagIndex) + 1;
  const edit = new WorkspaceEdit();
  edit.insert(pomUri, document.positionAt(insertionLine), `${dependencyXml}\n`);

  if (!(await workspace.applyEdit(edit))) {
    throw new Error(`Could not add ${dependency.groupId}:${dependency.artifactId} to ${pomUri.fsPath}.`);
  }
  if (!(await document.save())) {
    throw new Error(`Could not save ${pomUri.fsPath}.`);
  }
};

const addMavenProjectDependency = async (target: ProjectBean, dependency: ProjectBean) => {
  await addMavenDependency(target.projectDirectory, {
    groupId: dependency.groupId,
    artifactId: dependency.artifactId,
    version: dependency.version === target.version ? '${project.version}' : dependency.version,
    packaging: 'iar'
  });
};

export const addMavenProjectDependencyByPath = async (targetPath: string, dependencyPath: string) => {
  const deployedProjects = await IvyEngineManager.instance.projects(true);
  if (!deployedProjects || deployedProjects.length === 0) {
    throw new Error(l10n.t('No deployed projects found.'));
  }

  const targetProjectBean = deployedProjects.find(bean => path.resolve(bean.projectDirectory) === path.resolve(targetPath));
  if (!targetProjectBean) {
    throw new Error(l10n.t('Target project not found in deployed projects.'));
  }

  const newDependency = deployedProjects.find(project => path.resolve(project.projectDirectory) === path.resolve(dependencyPath));
  if (!newDependency) {
    throw new Error(l10n.t('New dependency project not found in deployed projects.'));
  }

  await addMavenProjectDependency(targetProjectBean, newDependency);
};
