import { Uri, window, workspace } from 'vscode';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';

export const importIvyProject = async (workspaceName: string) => {
  const input = await collectImportIvyProjectParams();
  if (input) {
    await IvyEngineManager.instance.importIvyProject(workspaceName, input);
  }
};

const collectImportIvyProjectParams = async (): Promise<ImportProjectsBody | undefined> => {
  const ivyProjectFile = await window.showOpenDialog({
    canSelectMany: false,
    title: 'Select Ivy Project .iar or .zip file to import',
    openLabel: 'Import Ivy Project',
    filters: {
      'Ivy Project Files': ['iar', 'zip']
    },
    defaultUri: Uri.file('/home/dominik/Desktop/testIarImport')
  });
  if (!ivyProjectFile || ivyProjectFile.length === 0 || !ivyProjectFile[0]) {
    return undefined;
  }
  const fileUri = ivyProjectFile[0];
  const fileFsPath = fileUri.fsPath;
  const fileData = await workspace.fs.readFile(fileUri);
  const regularArray = new Uint8Array(fileData);
  const fileName = fileFsPath.split('/').pop();
  const fileObj = new File([regularArray.buffer], fileName ?? fileFsPath, { type: 'application/zip' });
  return { file: fileObj };
};
