import * as vscode from 'vscode';
import { ImportProcessBody, ProcessInit } from '../engine/api/generated/client';
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

export const importNewProcess = async (selectedUri: vscode.Uri, projectDir: string) => {
  const input = await collectImportBpmnProcessParams(selectedUri, projectDir);
  if (input) {
    await IvyEngineManager.instance.createProcessFromBpmn(input);
  }
};

const collectImportBpmnProcessParams = async (selectedUri: vscode.Uri, projectDir: string): Promise<ImportProcessBody> => {
  const bpmnXmlFile = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Select BPMN XML File to Import'
  });
  if (!bpmnXmlFile || bpmnXmlFile.length === 0 || !bpmnXmlFile[0]) {
    vscode.window.showErrorMessage('Cannot pick BPMN or XML file.');
    return Promise.reject(new Error('BPMN or XML file not selected'));
  }
  const fileData = await vscode.workspace.fs.readFile(bpmnXmlFile[0]);
  const regularArray = new Uint8Array(fileData);
  const fileBlob = new Blob([regularArray.buffer], { type: 'application/xml' });
  return { projectDir, file: fileBlob };
};
