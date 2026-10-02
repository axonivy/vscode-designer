import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import path from 'path';
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
  const matches = await findMatches(symbols, fullyQualifiedName, args.context.project);
  if (matches.length !== 1) {
    logWarningMessage(
      `Failed to open Java file. Could not uniquely resolve fully qualified name '${fullyQualifiedName}'. Found matches: ${matches.map(match => match.toString()).join(', ')}`
    );
    return;
  }
  await executeCommand('vscode.open', matches[0]);
};

const findMatches = async (symbols: Array<SymbolInformation>, fullyQualifiedName: string, projectName: string) => {
  const project = await IvyEngineManager.instance.projects().then(projects => projects?.find(project => project.id.name === projectName));
  if (!project) {
    return [];
  }
  const javaMatches = symbols.filter(symbol => isJavaMatch(symbol, fullyQualifiedName));
  if (!javaMatches) {
    return [];
  }
  return javaMatches.filter(symbol => belongsToProject(symbol.location.uri, project)).map(symbol => symbol.location.uri);
};

const isJavaMatch = (symbol: SymbolInformation, fullyQualifiedName: string) =>
  symbol.name === fullyQualifiedName && isJavaUri(symbol.location.uri);

const isJavaUri = (uri: Uri) => uri.scheme === 'jdt' || (uri.scheme === 'file' && uri.path.endsWith('.java'));

const belongsToProject = (uri: Uri, project: ProjectBean) => {
  if (uri.scheme === 'file') {
    const relativePath = path.relative(project.projectDirectory, uri.fsPath);
    return relativePath === '' || (!path.isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`));
  }

  if (uri.scheme === 'jdt') {
    const query = decodeUriQuery(uri.query);
    return query.match(/^=([^/]+)\//)?.[1] === project.id.name;
  }

  return false;
};

const decodeUriQuery = (query: string) => {
  try {
    return decodeURIComponent(query).replace(/\\\//g, '/');
  } catch {
    return query;
  }
};
