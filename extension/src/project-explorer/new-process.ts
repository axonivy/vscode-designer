import * as vscode from 'vscode';
import { ProcessInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { resolveNamespaceFromPath, validateArtifactName } from './util';

export type ProcessKind = 'Business Process' | 'Callable Sub Process' | 'Web Service Process' | '';

export type NewProcessParams = ProcessInit;

export const addNewProcess = async (selectedUri: vscode.Uri, projectDir: string, kind: ProcessKind, pid?: string) => {
  const input = await collectNewProcessParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createProcess({ pid, kind, ...input });
  }
};

const collectNewProcessParams = async (selectedUri: vscode.Uri, projectDir: string) => {
  const name = await collectName();
  if (!name) {
    return;
  }
  const namespace = await collectNamespace(selectedUri, projectDir);
  if (!namespace) {
    return;
  }
  return { name, path: projectDir, namespace };
};

const collectName = async () => {
  return vscode.window.showInputBox({
    title: 'Process Name',
    placeHolder: 'Enter a name',
    ignoreFocusOut: true,
    validateInput: validateArtifactName
  });
};

const collectNamespace = async (selectedUri: vscode.Uri, projectDir: string) => {
  const namespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'processes');
  return vscode.window.showInputBox({
    title: 'Process Namespace',
    value: namespace,
    prompt: 'Enter Namespace separated by "/"',
    valueSelection: [namespace.length, -1],
    ignoreFocusOut: true,
    validateInput: validateNamespace
  });
};

export const validateNamespace = (value: string, errorMessage = 'Invalid namespace.') => {
  const pattern = /^\w+(\/\w+)*(-\w+)*$/;
  if (pattern.test(value)) {
    return;
  }
  return errorMessage;
};
