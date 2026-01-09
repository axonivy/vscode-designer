import path from 'path';
import * as vscode from 'vscode';
import { logInformationMessage } from '../base/logging-util';
import { IvyEngineManager } from '../engine/engine-manager';
import { TreeSelection, treeSelectionToUri } from './tree-selection';
import { validateArtifactName, validateDotSeparatedName } from './util';

export const addNewProject = async (selection: TreeSelection) => {
  const treeSelectionUri = await treeSelectionToUri(selection);
  const selectedUri = (await isDirectory(treeSelectionUri)) ? treeSelectionUri : vscode.workspace.workspaceFolders?.at(0)?.uri;
  if (!selectedUri) {
    logInformationMessage('No valid directory selected');
    return;
  }

  const input = await collectNewProjectParams(selectedUri);
  if (input) {
    await IvyEngineManager.instance.createProject(input);
  }
};

const isDirectory = async (uri?: vscode.Uri) => {
  if (!uri) {
    return false;
  }
  return (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
};

const collectNewProjectParams = async (selectedUri: vscode.Uri) => {
  const prompt = `Project Location: ${selectedUri.path}`;
  const name = await vscode.window.showInputBox({
    title: 'Project Name',
    validateInput: validateArtifactName,
    prompt,
    ignoreFocusOut: true
  });
  if (!name) {
    return;
  }
  const projectPath = path.join(selectedUri.fsPath, name);
  const groupId = await vscode.window.showInputBox({
    title: 'Group Id',
    value: name,
    validateInput: value => validateDotSeparatedName(value, 'Invalid id.'),
    ignoreFocusOut: true
  });
  if (!groupId) {
    return;
  }
  const projectId = await vscode.window.showInputBox({
    title: 'Project Id',
    value: name,
    validateInput: value => validateDotSeparatedName(value, 'Invalid id.'),
    ignoreFocusOut: true
  });
  if (!projectId) {
    return;
  }
  return { path: projectPath, name, groupId, projectId };
};
