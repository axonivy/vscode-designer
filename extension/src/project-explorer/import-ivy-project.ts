import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { Uri, window, workspace } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { logErrorMessageWithActions, logInformationMessageWithActions } from '../base/logging-util';
import { StatusBar } from '../base/status-bar';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { sanitizeProjectName } from './utils/util';

export const importIvyProject = async (selectedWorkspaceUri: Uri) => {
  const activeWorkspaceId = await IvyEngineManager.instance.getWorkspaceId();
  if (!activeWorkspaceId) {
    return;
  }
  const selectedTargetPath = selectedWorkspaceUri.fsPath;
  const selectedFile = await collectImportIvyArchiveFile();
  if (!selectedFile) {
    return;
  }

  const selectedFilePath = selectedFile.filePath;
  const selectedFileIsZip = path.extname(selectedFilePath) === '.zip';
  let iarFilesToCheck: string[];

  if (selectedFileIsZip) {
    const iarFilesInZip = await inspectAppZip(selectedFilePath);
    if (iarFilesInZip.length === 0) {
      logErrorRuntimeLog(`Zip file ${selectedFilePath} does not contain any valid .iar files in the root.`);
      return;
    }
    iarFilesToCheck = iarFilesInZip;
  } else {
    iarFilesToCheck = [selectedFilePath];
  }

  const existingIvyProjectNames = ((await IvyEngineManager.instance.projects(false)) ?? []).map(pIdentifier => pIdentifier.id.project);
  for (const iarFile of iarFilesToCheck) {
    const fileName = path.basename(iarFile);
    const sanitizedFileName = sanitizeProjectName(fileName);
    const targetImportFolderPath = path.join(selectedTargetPath, sanitizedFileName);

    if (existingIvyProjectNames.includes(sanitizedFileName)) {
      logErrorRuntimeLog(
        `File ${iarFile} resolves to project name "${sanitizedFileName}".
Axon Ivy Project with name "${sanitizedFileName}" already exists in the workspace.
Please either rename the import file ${fileName} or delete/rename the existing project.`
      );
      return;
    }

    if (fs.existsSync(targetImportFolderPath)) {
      logErrorRuntimeLog(
        `Import target folder after project name resolution is ${targetImportFolderPath} which already exists in your workspace.
Please either rename the import file ${fileName} or delete/rename the existing folder.`
      );
      return;
    }
  }

  if (selectedFileIsZip) {
    logInformationRuntimeLog(
      `Starting to import ZIP file ${selectedFilePath}\nIdentified ${iarFilesToCheck.length} potential .iar files:\n${iarFilesToCheck.map(p => path.basename(p)).join('\n')}`
    );
  }

  const importProjectParams: ImportProjectsBody = { ...selectedFile, targetPath: selectedTargetPath };
  await StatusBar.withStatusBarProgress({ text: 'Importing Ivy Archive' }, async () => {
    await IvyEngineManager.instance.importIvyProject(activeWorkspaceId, importProjectParams);
    logInformationRuntimeLog(`Successfully imported Ivy project(s) from ${selectedFilePath} into workspace folder ${selectedTargetPath}`);
  });
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

const inspectAppZip = async (filePath: string): Promise<string[]> => {
  const zip = new AdmZip(filePath);
  return zip
    .getEntries()
    .filter(
      entry => !entry.isDirectory && entry.entryName.endsWith('.iar') && !entry.entryName.includes('/') && !entry.entryName.includes('\\')
    )
    .map(entry => path.join(filePath, entry.entryName));
};

const logInformationRuntimeLog = (message: string) => {
  logInformationMessageWithActions(message, {
    'Show Extension Log': () => {
      showExtensionLog();
    }
  });
};

const logErrorRuntimeLog = (message: string) => {
  logErrorMessageWithActions(message, {
    'Show Extension Log': () => {
      showExtensionLog();
    }
  });
};
