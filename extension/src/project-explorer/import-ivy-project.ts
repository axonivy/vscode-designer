import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { FileType, l10n, Uri, workspace, type ExtensionContext } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { logErrorMessageWithActions, logInformationMessageWithActions } from '../base/logging-util';
import { showRememberedFileDialog } from '../base/remembered-file-dialog';
import { StatusBar } from '../base/status-bar';
import type { ImportProjectsBody } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectManager } from './ivy-project-manager';
import { isSubdirectoryOrEqual, sanitizeProjectName } from './utils/util';

export const importIvyProject = async (selectedWorkspaceUri: Uri, context: Pick<ExtensionContext, 'globalState'>) => {
  const selectedFile = await collectImportIvyArchiveFile(context);
  if (!selectedFile) {
    return;
  }

  await importIvyProjectArchive(selectedWorkspaceUri, selectedFile);
};

export const importIvyProjectFromFile = async (targetPath: string, selectedFilePath: string) => {
  if (!path.isAbsolute(selectedFilePath) || path.extname(selectedFilePath).toLowerCase() !== '.iar') {
    throw new Error('Expected an absolute path to an .iar file.');
  }
  if (!path.isAbsolute(targetPath)) {
    throw new Error('An absolute targetPath is required.');
  }

  const resolvedFilePath = path.resolve(selectedFilePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const selectedWorkspaceUri = Uri.file(resolvedTargetPath);
  const workspaceFolder = workspace.getWorkspaceFolder(selectedWorkspaceUri);
  let isTargetDirectory = false;
  try {
    isTargetDirectory = (await workspace.fs.stat(selectedWorkspaceUri)).type === FileType.Directory;
  } catch {
    isTargetDirectory = false;
  }
  if (!workspaceFolder || !isTargetDirectory) {
    throw new Error('targetPath must be an existing directory inside an open workspace folder.');
  }

  const [realTargetPath, realWorkspacePath] = await Promise.all([
    fs.promises.realpath(resolvedTargetPath),
    fs.promises.realpath(workspaceFolder.uri.fsPath)
  ]);
  if (!isSubdirectoryOrEqual(realWorkspacePath, realTargetPath)) {
    throw new Error('targetPath must resolve inside its workspace folder.');
  }

  const ivyProjects = await IvyProjectManager.instance.getIvyProjects();
  if (ivyProjects.some(project => isSubdirectoryOrEqual(project, selectedWorkspaceUri.fsPath))) {
    throw new Error('Cannot import an Ivy project into an existing Ivy project.');
  }

  const selectedFile = await readImportArchive(Uri.file(resolvedFilePath));
  const imported = await importIvyProjectArchive(selectedWorkspaceUri, selectedFile);
  if (!imported) {
    throw new Error(`Failed to import IAR file '${selectedFilePath}'.`);
  }
  return imported;
};

const importIvyProjectArchive = async (
  selectedWorkspaceUri: Uri,
  selectedFile: NonNullable<Awaited<ReturnType<typeof readImportArchive>>>
) => {
  const selectedTargetPath = selectedWorkspaceUri.fsPath;
  const selectedFilePath = selectedFile.filePath;
  const selectedFileIsZip = path.extname(selectedFilePath) === '.zip';
  let iarFilesToCheck: string[];

  if (selectedFileIsZip) {
    const iarFilesInZip = await inspectAppZip(selectedFilePath);
    if (iarFilesInZip.length === 0) {
      logErrorIvyImport(l10n.t('Zip file {0} does not contain any valid .iar files in the root.', selectedFilePath));
      return false;
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
      return false;
    }

    if (fs.existsSync(targetImportFolderPath)) {
      logErrorIvyImport(
        l10n.t(
          'Import target folder after project name resolution is {0} which already exists in your workspace.\nPlease either rename the import file {1} or delete/rename the existing folder.',
          targetImportFolderPath,
          fileName
        )
      );
      return false;
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
  return StatusBar.withStatusBarProgress({ text: l10n.t('Importing Ivy Archive') }, async () => {
    await IvyEngineManager.instance.importIvyProject(importProjectParams);
    logInfoIvyImport(
      l10n.t('Successfully imported Ivy project(s) from {0} into workspace folder {1}', selectedFilePath, selectedTargetPath)
    );
    return `Successfully imported Ivy project(s) from ${selectedFilePath} into workspace folder ${selectedTargetPath}.`;
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
  return readImportArchive(ivyProjectFile[0]);
};

const readImportArchive = async (fileUri: Uri) => {
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
