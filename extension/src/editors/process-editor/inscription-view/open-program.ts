import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { type SymbolInformation, type Uri } from 'vscode';
import { executeCommand } from '../../../base/commands';
import { logWarningMessage } from '../../../base/logging-util';
import type { ProjectBean } from '../../../engine/api/generated/client';
import { IvyEngineManager } from '../../../engine/engine-manager';

export const handleOpenProgram = async (args: InscriptionActionArgs) => {
  const fullyQualifiedName = args.payload;
  const symbols = await executeCommand<Array<SymbolInformation>>('vscode.executeWorkspaceSymbolProvider', fullyQualifiedName);
  if (!symbols) {
    logWarningMessage(`Failed to open Java file. No symbols found for fully qualified name: ${fullyQualifiedName}`);
    return;
  }
  const match = await findMatch(symbols, fullyQualifiedName, args.context.project);
  if (!match) {
    logWarningMessage(`Failed to open Java file. No match found for fully qualified name: ${fullyQualifiedName}`);
    return;
  }
  await executeCommand('vscode.open', match);
};

const findMatch = async (symbols: Array<SymbolInformation>, fullyQualifiedName: string, projectName: string) => {
  const javaMatches = symbols.filter(symbol => isJavaMatch(symbol, fullyQualifiedName));
  if (!javaMatches) {
    return;
  }
  const allProjectsWithDependencies = await IvyEngineManager.instance.projects(true);
  const project = allProjectsWithDependencies?.find(project => project.id.name === projectName);
  if (!project || !allProjectsWithDependencies) {
    return;
  }
  return javaMatches.find(symbol => belongsToProject(symbol.location.uri, project, allProjectsWithDependencies))?.location.uri;
};

const isJavaMatch = (symbol: SymbolInformation, fullyQualifiedName: string) =>
  symbol.name === fullyQualifiedName && isJavaUri(symbol.location.uri);

const isJavaUri = (uri: Uri) => uri.scheme === 'jdt' || (uri.scheme === 'file' && uri.path.endsWith('.java'));

const belongsToProject = (uri: Uri, project: ProjectBean, allProjectsWithDependencies: Array<ProjectBean>) => {
  let uriMatcher;
  if (uri.scheme === 'file') {
    uriMatcher = () => uri.path.startsWith(project.projectDirectory);
  } else {
    uriMatcher = () => uri.query.startsWith(`=${project.id.name}/`);
  }
  return uriBelongsToProject(uri, project, allProjectsWithDependencies, uriMatcher);
};

const uriBelongsToProject = (
  uri: Uri,
  project: ProjectBean,
  allProjectsWithDependencies: Array<ProjectBean>,
  uriMatcher: (uri: Uri, project: ProjectBean) => boolean
): boolean => {
  return uriMatcher(uri, project) || uriBelongsToRequiredProject(uri, project, allProjectsWithDependencies, uriMatcher);
};

const uriBelongsToRequiredProject = (
  uri: Uri,
  project: ProjectBean,
  allProjectsWithDependencies: Array<ProjectBean>,
  uriMatcher: (uri: Uri, project: ProjectBean) => boolean
): boolean => {
  return project.dependencies.some(dependency => {
    const requiredProject = allProjectsWithDependencies.find(p => p.id.name === dependency.name);
    if (!requiredProject) {
      return false;
    }
    return uriBelongsToProject(uri, requiredProject, allProjectsWithDependencies, uriMatcher);
  });
};
