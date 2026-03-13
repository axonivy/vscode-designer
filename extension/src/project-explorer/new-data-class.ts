import * as vscode from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { resolveNamespaceFromPath, validateArtifactName, validateDotSeparatedName } from './util';

export const addNewDataClass = async (selectedUri: vscode.Uri, projectDir: string) => {
  const input = await collectNewDataClassParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createDataClass(input);
  }
};

export const addNewEntityClass = async (selectedUri: vscode.Uri, projectDir: string) => {
  const input = await collectNewDataClassParams(selectedUri, projectDir, 'Entity Class');
  if (input) {
    await IvyEngineManager.instance.createEntityClass(input);
  }
};

const collectNewDataClassParams = async (
  selectedUri: vscode.Uri,
  projectDir: string,
  type: 'Data Class' | 'Entity Class' = 'Data Class'
) => {
  const name = await vscode.window.showInputBox({
    title: `${type} Name`,
    placeHolder: 'Enter a name',
    ignoreFocusOut: true,
    validateInput: validateArtifactName
  });
  if (!name) {
    return;
  }
  const namespace = await collectNamespace(selectedUri, projectDir, type);
  if (!namespace) {
    return;
  }
  return { name: `${namespace}.${name}`, projectDir };
};

const collectNamespace = async (selectedUri: vscode.Uri, projectDir: string, type: 'Data Class' | 'Entity Class') => {
  const namespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'dataclasses');
  return vscode.window.showInputBox({
    title: `${type} Namespace`,
    value: namespace,
    valueSelection: [namespace.length, -1],
    ignoreFocusOut: true,
    validateInput: validateDotSeparatedName
  });
};
