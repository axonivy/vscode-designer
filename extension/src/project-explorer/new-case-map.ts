import { Uri, window } from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { resolveNamespaceFromPath, validateNamespace, validateProjectArtifactName } from './utils/util';

export const addNewCaseMap = async (selectedUri: Uri, projectDir: string) => {
  const input = await collectNewCaseMapParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createCaseMap(input);
  }
};

const collectNewCaseMapParams = async (selectedUri: Uri, projectDir: string) => {
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
  return window.showInputBox({
    title: 'Case Map Name',
    placeHolder: 'Enter a name',
    ignoreFocusOut: true,
    validateInput: validateProjectArtifactName
  });
};

const collectNamespace = async (selectedUri: Uri, projectDir: string) => {
  const namespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'processes');
  return window.showInputBox({
    title: 'Case Map Namespace',
    value: namespace,
    prompt: 'Enter Namespace separated by "/"',
    valueSelection: [namespace.length, -1],
    ignoreFocusOut: true,
    validateInput: validateNamespace
  });
};
