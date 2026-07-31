import path from 'path';
import { Uri, window, workspace } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { listRootsInAllWorkspaces, sanitizeProjectName } from './utils/util';

export const importIvyProject = async (selectedWorkspaceUri: Uri, allIvyProjectPaths: string[]) => {
  const workspaceId = await IvyEngineManager.instance.getWorkspaceId();
  if (!workspaceId) {
    return;
  }
  const selectedTargetPath = selectedWorkspaceUri.fsPath;
  const selectedFile = await collectImportIvyArchiveFile();
  if (!selectedFile || !selectedFile.file) {
    return;
  }
  const fileName = path.basename(selectedFile.filePath);
  const sanitizedFileName = sanitizeProjectName(fileName);
  if (!validateAgainstExistingProjects(sanitizedFileName, fileName, selectedFile.filePath, allIvyProjectPaths)) {
    return;
  }
  const sanitizedFilePath = path.join(selectedTargetPath, sanitizedFileName);
  if (!(await validateAgainstExistingPaths(sanitizedFilePath, fileName))) {
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

const validateAgainstExistingProjects = (
  fileToImportNameSanitized: string,
  fileImportName: string,
  fileImportPath: string,
  existingIvyProjectPaths: string[]
) => {
  const existingProjectNames = existingIvyProjectPaths.map(projectPath => path.basename(projectPath));
  if (existingProjectNames.includes(fileToImportNameSanitized)) {
    logErrorMessage(
      `File ${fileImportPath} resolves to project name "${fileToImportNameSanitized}".
Axon Ivy Project with name "${fileToImportNameSanitized}" already exists in the workspace.
Please either rename the import file ${fileImportName} or delete/rename the existing project.`
    );
    return false;
  }
  return true;
};

const validateAgainstExistingPaths = async (targetImportPath: string, fileImportName: string) => {
  const existingRootPaths = (await listRootsInAllWorkspaces()).map(folder => folder.fsPath);
  if (existingRootPaths.includes(targetImportPath)) {
    logErrorMessage(
      `Import target folder after project name resolution is ${targetImportPath} which already exists in your workspace.\nPlease either rename the import file ${fileImportName} or delete/rename the existing folder.`
    );
    return false;
  }
  return true;
};
