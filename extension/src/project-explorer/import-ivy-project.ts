import path from 'path';
import { Uri, window, workspace } from 'vscode';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';

export interface ImportIvyProjectCollectedInput {
  importProjectsInput: ImportProjectsBody;
  filename: string;
}

export const importIvyProject = async (workspaceUri: Uri) => {
  const workspaceId = path.basename(workspaceUri.fsPath);
  const collectedInput = await collectImportIvyProjectParams();
  if (collectedInput) {
    await IvyEngineManager.instance.importIvyProject(workspaceId, collectedInput.importProjectsInput, collectedInput.filename);
  }
};

const collectImportIvyProjectParams = async (): Promise<ImportIvyProjectCollectedInput | undefined> => {
  const ivyProjectFile = await window.showOpenDialog({
    canSelectMany: false,
    title: 'Select Ivy Project Archive .iar or .zip to import',
    openLabel: 'Import Ivy Project Archive',
    filters: {
      'Ivy Project Files': ['iar', 'zip']
    },
    // TODO: Remove
    defaultUri: Uri.file('/home/dominik/Desktop/testIarImport/generatedIars')
  });
  if (!ivyProjectFile || ivyProjectFile.length === 0 || !ivyProjectFile[0]) {
    return undefined;
  }
  const fileUri = ivyProjectFile[0];
  const fileFsPath = fileUri.fsPath;
  const fileData = await workspace.fs.readFile(fileUri);
  const regularArray = new Uint8Array(fileData);
  const fileName = fileFsPath.includes(path.sep) ? (fileFsPath.split(path.sep).pop() ?? fileFsPath) : fileFsPath;
  const fileObj = new File([regularArray.buffer], fileName, { type: 'application/zip' });
  return {
    importProjectsInput: {
      file: fileObj
    },
    filename: fileName
  };
};
