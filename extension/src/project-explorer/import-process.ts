import path from 'path';
import { workspace, type ExtensionContext } from 'vscode';
import { showRememberedFileDialog } from '../base/remembered-file-dialog';
import type { ImportProcessBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';

export const importNewProcess = async (projectDir: string, context: Pick<ExtensionContext, 'globalState'>) => {
  const input = await collectImportBpmnProcessParams(projectDir, context);
  if (input) {
    await IvyEngineManager.instance.createProcessFromBpmn(input);
  }
};

const collectImportBpmnProcessParams = async (
  projectDir: string,
  context: Pick<ExtensionContext, 'globalState'>
): Promise<ImportProcessBody | undefined> => {
  const bpmnXmlFile = await showRememberedFileDialog(context, 'importBpmnProcess', {
    canSelectMany: false,
    title: 'Select BPMN .bpmn or .xml file to import',
    openLabel: 'Import BPMN Process',
    filters: {
      'BPMN Files': ['bpmn', 'xml']
    }
  });
  if (!bpmnXmlFile || bpmnXmlFile.length === 0 || !bpmnXmlFile[0]) {
    return undefined;
  }
  const fileData = await workspace.fs.readFile(bpmnXmlFile[0]);
  const regularArray = new Uint8Array(fileData);
  const fileName = bpmnXmlFile[0].fsPath.split(path.sep).pop();
  const fileObj = new File([regularArray.buffer], fileName ? fileName : 'bpmn.xml', { type: 'application/xml' });
  return { projectDir, file: fileObj };
};
