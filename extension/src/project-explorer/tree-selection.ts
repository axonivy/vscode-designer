import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { executeCommand } from '../base/commands';
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
  if (!selection) {
    return selectionFromExplorer();
  }
  if (selection instanceof vscode.Uri) {
    return selection;
  }
  return selection.uri;
}

// no api available yet, see https://github.com/microsoft/vscode/issues/3553
async function selectionFromExplorer(): Promise<vscode.Uri | undefined> {
  const originalClipboard = await vscode.env.clipboard.readText();
  await executeCommand('copyFilePath');
  const selectedFile = vscode.Uri.file(await vscode.env.clipboard.readText());
  await vscode.env.clipboard.writeText(originalClipboard);
  const wsRoot = vscode.workspace.workspaceFolders?.at(0)?.name ?? '';
  if (!selectedFile.path.includes(wsRoot) || !fs.existsSync(selectedFile.fsPath)) {
    return undefined;
  }
  return selectedFile;
}

async function findMatchingProject(ivyProjects: Promise<string[]>, selectedUri: vscode.Uri): Promise<string | undefined> {
  return ivyProjects.then(projects =>
    projects.find(project => selectedUri.fsPath === project || selectedUri.fsPath.startsWith(project + path.sep))
  );
}
