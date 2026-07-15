import path from 'path';
import { Uri, window, workspace } from 'vscode';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';

export const importIvyProject = async (workspaceUri: Uri) => {
  const workspaceId = path.basename(workspaceUri.fsPath);
  const input = await collectImportIvyProjectParams();
  if (input) {
    await IvyEngineManager.instance.importIvyProject(workspaceId, input);
  }
};

const collectImportIvyProjectParams = async (): Promise<ImportProjectsBody | undefined> => {
  const ivyProjectFile = await window.showOpenDialog({
    canSelectMany: false,
    title: 'Select Ivy Project .iar or .zip file to import',
    openLabel: 'Import Ivy Project',
    filters: {
      'Ivy Project Files': ['iar', 'zip']
    }
  });
  if (!ivyProjectFile || ivyProjectFile.length === 0 || !ivyProjectFile[0]) {
    return undefined;
  }
  const fileUri = ivyProjectFile[0];
  const fileFsPath = fileUri.fsPath;
  const fileData = await workspace.fs.readFile(fileUri);
  const regularArray = new Uint8Array(fileData);
  const fileName = fileFsPath.split(path.sep).pop();
  const fileObj = new File([regularArray.buffer], fileName ?? fileFsPath, { type: 'application/zip' });
  return { file: fileObj };
};
