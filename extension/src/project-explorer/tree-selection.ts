import path from 'path';
import { Uri } from 'vscode';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import type { Entry } from './ivy-project-tree-data-provider';

export type TreeSelection = Entry | Uri | undefined;

export async function treeSelectionToProjectUri(selection: TreeSelection, ivyProjects: Promise<string[]>): Promise<Uri | undefined> {
  const selectionUri = await treeSelectionToUri(selection);
  const selectionProject = await treeUriToProjectPath(selectionUri, ivyProjects);
  if (selection === undefined || !selectionProject) {
    return await selectIvyProjectDialog();
  }
  return selectionUri;
}

export async function treeUriToProjectPath(uri: Uri | undefined, ivyProjects: Promise<string[]>): Promise<string | undefined> {
  if (!uri) {
    return;
  }
  return findMatchingProject(ivyProjects, uri);
}

export async function treeSelectionToUri(selection: TreeSelection): Promise<Uri | undefined> {
  if (selection instanceof Uri) {
    return selection;
  }
  return selection?.uri;
}

async function findMatchingProject(ivyProjects: Promise<string[]>, selectedUri: Uri): Promise<string | undefined> {
  return ivyProjects.then(projects =>
    projects.find(project => selectedUri.fsPath === project || selectedUri.fsPath.startsWith(project + path.sep))
  );
}
