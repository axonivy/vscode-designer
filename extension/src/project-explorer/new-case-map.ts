import * as vscode from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { validateNamespace } from './new-process';
import { resolveNamespaceFromPath, validateArtifactName } from './util';

export const addNewCaseMap = async (selectedUri: vscode.Uri, projectDir: string) => {
  const input = await collectNewCaseMapParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createCaseMap(input);
  }
};

const collectNewCaseMapParams = async (selectedUri: vscode.Uri, projectDir: string) => {
  const name = await collectName();
  if (!name) {
    return;
  }
  const namespace = await collectNamespace(selectedUri, projectDir);
  if (namespace === undefined) {
    return;
  }
  return { name, projectDir, namespace };
};

const collectName = async () => {
  return vscode.window.showInputBox({
    title: 'Case Map Name',
    placeHolder: 'Enter a name',
    ignoreFocusOut: true,
    validateInput: validateArtifactName
  });
};

const collectNamespace = async (selectedUri: vscode.Uri, projectDir: string) => {
  const namespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'processes');
  return vscode.window.showInputBox({
    title: 'Case Map Namespace',
    value: namespace,
    prompt: 'Enter Namespace separated by "/"',
    valueSelection: [namespace.length, -1],
    ignoreFocusOut: true,
    validateInput: validateNamespace
  });
};
