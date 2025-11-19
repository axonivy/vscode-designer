import * as vscode from 'vscode';
import { ProcessInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { resolveNamespaceFromPath } from './util';

export type ProcessKind = 'Business Process' | 'Callable Sub Process' | 'Web Service Process' | '';

export type NewProcessParams = ProcessInit;

const prompt =
  'Enter the new process name e.g. "myProcess". You can also specify its directory name in the form "parentDirectory/subDirectory/myProcess".';

export const addNewProcess = async (selectedUri: vscode.Uri, projectDir: string, kind: ProcessKind, pid?: string) => {
  const input = await collectNewProcessParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createProcess({ pid, kind, ...input });
  }
};

const collectNewProcessParams = async (selectedUri: vscode.Uri, projectDir: string) => {
  const resolvedNamespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'processes');
  const placeHolder = 'newProcessName';
  const nameWithNamespace = await vscode.window.showInputBox({
    title: 'Process Name',
    prompt,
    placeHolder,
    value: resolvedNamespace ? resolvedNamespace + placeHolder : undefined,
    valueSelection: resolvedNamespace ? [resolvedNamespace.length, -1] : undefined,
    validateInput: validateNameWithNamespace,
    ignoreFocusOut: true
  });
  if (!nameWithNamespace) {
    return;
  }
  const nameStartIndex = nameWithNamespace.lastIndexOf('/') + 1;
  const name = nameWithNamespace.substring(nameStartIndex, nameWithNamespace.length);
  const namespace = nameWithNamespace.substring(0, nameStartIndex - 1);
  return { name, path: projectDir, namespace };
};

const validateNameWithNamespace = (value: string) => {
  const pattern = /^\w+(\/\w+)*$/;
  if (pattern.test(value)) {
    return;
  }
  return `Alphanumeric name expected. ${prompt}`;
};
