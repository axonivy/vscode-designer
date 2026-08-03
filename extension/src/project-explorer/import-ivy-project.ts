import path from 'path';
import { Uri, window, workspace } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { listRootsInAllWorkspaces, sanitizeProjectName } from './utils/util';

export const importIvyProject = async (selectedWorkspaceUri: Uri) => {
  const workspaceId = await IvyEngineManager.instance.getWorkspaceId();
  if (!workspaceId) {
    return;
  }
  const selectedTargetPath = selectedWorkspaceUri.fsPath;
  const selectedFile = await collectImportIvyArchiveFile();
  if (!selectedFile || !selectedFile.file) {
    return;
  }
  const existingIvyProjectNames = ((await IvyEngineManager.instance.projects(false)) ?? []).map(pIdentifier => pIdentifier.id.project);
  const fileImportPath = selectedFile.filePath;
  const fileImportName = path.basename(selectedFile.filePath);
  const sanitizedFileName = sanitizeProjectName(fileImportName);
  const sanitizedFilePath = path.join(selectedTargetPath, sanitizedFileName);

  if (existingIvyProjectNames.includes(sanitizedFileName)) {
    logErrorMessage(
      `File ${fileImportPath} resolves to project name "${sanitizedFileName}".
Axon Ivy Project with name "${sanitizedFileName}" already exists in the workspace.
Please either rename the import file ${fileImportName} or delete/rename the existing project.`
    );
    return;
  }

  const existingRootPaths = (await listRootsInAllWorkspaces()).map(folder => folder.fsPath);

  if (existingRootPaths.includes(sanitizedFilePath)) {
    logErrorMessage(
      `Import target folder after project name resolution is ${sanitizedFilePath} which already exists in your workspace.
Please either rename the import file ${fileImportName} or delete/rename the existing folder.`
    );
    return;
  }

  const importProjectParams: ImportProjectsBody = { ...selectedFile, targetPath: selectedTargetPath };
  await IvyEngineManager.instance.importIvyProject(workspaceId, importProjectParams);
};

const collectImportIvyArchiveFile = async () => {
  const ivyProjectFile = await window.showOpenDialog({
    canSelectMany: false,
    title: 'Select Ivy Project Archive .iar or .zip to import',
    openLabel: 'Import Ivy Project Archive',
    filters: {
      'Ivy Project Files': ['iar', 'zip']
    }
  });
  if (!ivyProjectFile || ivyProjectFile.length === 0 || !ivyProjectFile[0]) {
    return undefined;
  }
  const fileUri = ivyProjectFile[0];
  const filePath = fileUri.fsPath;
  const fileData = await workspace.fs.readFile(fileUri);
  const regularArray = new Uint8Array(fileData);
  const fileObj = new File([regularArray.buffer], path.basename(filePath), { type: 'application/zip' });
  return { file: fileObj, filePath };
};
