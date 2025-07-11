import path from 'path';
import * as vscode from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { TreeSelection, treeSelectionToUri } from './tree-selection';
import { validateArtifactName, validateDotSeparatedName } from './util';

export const addNewProject = async (selection: TreeSelection) => {
  const selectedUri = await treeSelectionToUri(selection);
  const input = await collectNewProjectParams(selectedUri);
  if (input) {
    IvyEngineManager.instance.createProject(input);
  }
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
  const defaultNamespace = await vscode.window.showInputBox({
    title: 'Default Namespace',
    value: name === groupId && name === projectId ? name.replaceAll('-', '.') : `${groupId}.${projectId}`.replaceAll('-', '.'),
    validateInput: validateNamespace,
    ignoreFocusOut: true
  });
  if (!defaultNamespace) {
    return;
  }
  return { path: projectPath, name, groupId, projectId, defaultNamespace };
};

const validateNamespace = (value: string) => {
  const pattern = /^\w+(\.\w+)*$/;
  if (pattern.test(value)) {
    return;
  }
  return 'Invalid namespace.';
};
