import path from 'path';
import * as vscode from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { Entry } from './ivy-project-tree-data-provider';

export type TreeSelection = Entry | vscode.Uri | undefined;

export async function treeUriToProjectPath(uri: vscode.Uri | undefined, ivyProjects: Promise<string[]>): Promise<string | undefined> {
  if (!uri) {
    logErrorMessage('No valid directory selected');
    return;
  }
  return findMatchingProject(ivyProjects, uri);
}

export async function treeSelectionToUri(selection: TreeSelection): Promise<vscode.Uri | undefined> {
  if (selection instanceof vscode.Uri) {
    return selection;
  }
  return selection?.uri;
}

async function findMatchingProject(ivyProjects: Promise<string[]>, selectedUri: vscode.Uri): Promise<string | undefined> {
  return ivyProjects.then(projects =>
    projects.find(project => selectedUri.fsPath === project || selectedUri.fsPath.startsWith(project + path.sep))
  );
}
