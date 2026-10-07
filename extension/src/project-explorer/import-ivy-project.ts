import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { l10n, Uri, workspace, type ExtensionContext } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { logErrorMessageWithActions, logInformationMessageWithActions } from '../base/logging-util';
import { showRememberedFileDialog } from '../base/remembered-file-dialog';
import { StatusBar } from '../base/status-bar';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { sanitizeProjectName } from './utils/util';

export const importIvyProject = async (selectedWorkspaceUri: Uri, context: Pick<ExtensionContext, 'globalState'>) => {
  const selectedTargetPath = selectedWorkspaceUri.fsPath;
  const selectedFile = await collectImportIvyArchiveFile(context);
  if (!selectedFile) {
    return;
  }

  const selectedFilePath = selectedFile.filePath;
  const selectedFileIsZip = path.extname(selectedFilePath) === '.zip';
  let iarFilesToCheck: string[];

  if (selectedFileIsZip) {
    const iarFilesInZip = await inspectAppZip(selectedFilePath);
    if (iarFilesInZip.length === 0) {
      logErrorIvyImport(l10n.t('Zip file {0} does not contain any valid .iar files in the root.', selectedFilePath));
      return;
    }
    iarFilesToCheck = iarFilesInZip;
  } else {
    iarFilesToCheck = [selectedFilePath];
  }

  const existingIvyProjectNames = ((await IvyEngineManager.instance.projects(false)) ?? []).map(pIdentifier => pIdentifier.id.name);

  for (const iarFile of iarFilesToCheck) {
    const fileName = path.basename(iarFile);
    const sanitizedFileName = sanitizeProjectName(fileName);
    const targetImportFolderPath = path.join(selectedTargetPath, sanitizedFileName);

    if (existingIvyProjectNames.includes(sanitizedFileName)) {
      logErrorIvyImport(
        l10n.t(
          'File {0} resolves to project name "{1}".\nAxon Ivy Project with name "{1}" already exists in the workspace.\nPlease either rename the import file {2} or delete/rename the existing project.',
          iarFile,
          sanitizedFileName,
          fileName
        )
      );
      return;
    }

    if (fs.existsSync(targetImportFolderPath)) {
      logErrorIvyImport(
        l10n.t(
          'Import target folder after project name resolution is {0} which already exists in your workspace.\nPlease either rename the import file {1} or delete/rename the existing folder.',
          targetImportFolderPath,
          fileName
        )
      );
      return;
    }
  }

  if (selectedFileIsZip) {
    logInfoIvyImport(
      l10n.t(
        'Starting to import ZIP file {0}\nIdentified {1} potential .iar files:\n{2}',
        selectedFilePath,
        iarFilesToCheck.length,
        iarFilesToCheck.map(p => path.basename(p)).join('\n')
      )
    );
  }

  const importProjectParams: ImportProjectsBody = { ...selectedFile, targetPath: selectedTargetPath };
  await StatusBar.withStatusBarProgress({ text: l10n.t('Importing Ivy Archive') }, async () => {
    await IvyEngineManager.instance.importIvyProject(importProjectParams);
    logInfoIvyImport(
      l10n.t('Successfully imported Ivy project(s) from {0} into workspace folder {1}', selectedFilePath, selectedTargetPath)
    );
  });
};

const collectImportIvyArchiveFile = async (context: Pick<ExtensionContext, 'globalState'>) => {
  const ivyProjectFile = await showRememberedFileDialog(context, 'importIvyProject', {
    canSelectMany: false,
    title: l10n.t('Select Ivy Project Archive .iar or .zip to import'),
    openLabel: l10n.t('Import Ivy Project Archive'),
    filters: {
      [l10n.t('Ivy Project Files')]: ['iar', 'zip']
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

const logInfoIvyImport = (message: string) => {
  logInformationMessageWithActions(message, {
    [l10n.t('Show Extension Log')]: () => {
      showExtensionLog();
    }
  });
};

const logErrorIvyImport = (message: string) => {
  const msg = l10n.t('Axon Ivy Import Error - {0}', message);
  logErrorMessageWithActions(msg, {
    [l10n.t('Show Extension Log')]: () => {
      showExtensionLog();
    }
  });
};
