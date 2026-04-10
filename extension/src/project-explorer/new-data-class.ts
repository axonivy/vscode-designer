import { Uri, window } from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { resolveNamespaceFromPath, validateDotSeparatedName, validateProjectArtifactName } from './utils/util';

export const addNewDataClass = async (selectedUri: Uri, projectDir: string) => {
  const input = await collectNewDataClassParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createDataClass(input);
  }
};

export const addNewEntityClass = async (selectedUri: Uri, projectDir: string) => {
  const input = await collectNewDataClassParams(selectedUri, projectDir, 'Entity Class');
  if (input) {
    await IvyEngineManager.instance.createEntityClass(input);
  }
};

const collectNewDataClassParams = async (selectedUri: Uri, projectDir: string, type: 'Data Class' | 'Entity Class' = 'Data Class') => {
  const name = await window.showInputBox({
    title: `${type} Name`,
    placeHolder: 'Enter a name',
    ignoreFocusOut: true,
    validateInput: validateProjectArtifactName
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

const collectNamespace = async (selectedUri: Uri, projectDir: string, type: 'Data Class' | 'Entity Class') => {
  const namespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'dataclasses');
  return window.showInputBox({
    title: `${type} Namespace`,
    value: namespace,
    valueSelection: [namespace.length, -1],
    ignoreFocusOut: true,
    validateInput: validateDotSeparatedName
  });
};
