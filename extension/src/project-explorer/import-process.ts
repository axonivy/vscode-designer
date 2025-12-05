import * as vscode from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { ImportProcessBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';

export const importNewProcess = async (projectDir: string) => {
  const input = await collectImportBpmnProcessParams(projectDir);
  if (input) {
    await IvyEngineManager.instance.createProcessFromBpmn(input);
  }
};

const collectImportBpmnProcessParams = async (projectDir: string): Promise<ImportProcessBody> => {
  const bpmnXmlFile = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Select BPMN XML File to Import'
  });
  if (!bpmnXmlFile || bpmnXmlFile.length === 0 || !bpmnXmlFile[0]) {
    logErrorMessage('Cannot pick BPMN or XML file.');
    return Promise.reject(new Error('BPMN or XML file not selected'));
  }
  const fileData = await vscode.workspace.fs.readFile(bpmnXmlFile[0]);
  const regularArray = new Uint8Array(fileData);
  const fileName = bpmnXmlFile[0].fsPath.split('/').pop();
  const fileObj = new File([regularArray.buffer], fileName ? fileName : 'bpmn.xml', { type: 'application/xml' });
  return { projectDir, file: fileObj };
};
