import path from 'path';
import type { TextDocument } from 'vscode';
import { logErrorMessage } from '../../../base/logging-util';
import { IvyEngineManager } from '../../../engine/engine-manager';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../../../project-explorer/tree-selection';
import { resolveNamespaceFromPath } from '../../../project-explorer/utils/util';
import { stripTrailingSeparator } from '../../../utils/path-utils';
import { getActiveDialogPreviewDocument } from './active-dialog-preview-document';
import { buildDialogPreviewUrl } from './dialog-preview-url-builder';

const supportedDialogFileExtensions = ['.xhtml', '.f.json'] as const;

export const dialogPreviewUrl = async (devContextPath: string) => {
  const document = await getActiveDialogPreviewDocument();
  const dialogName = document ? getDialogName(document.fileName) : undefined;
  if (!document || document.uri.scheme !== 'file' || !dialogName) {
    logErrorMessage('No dialog preview url available. Please open a .xhtml or .f.json editor.');
    return undefined;
  }
  if (isComponentDialog(document)) {
    logErrorMessage('Dialog preview is not supported for Components.');
    return undefined;
  }

  const projectPath = await treeUriToProjectPath(document.uri, IvyProjectExplorer.instance.getIvyProjects());
  if (!projectPath) {
    logErrorMessage('Failed to find Ivy project associated with the active dialog file.');
    return undefined;
  }

  const sourceDirectory = path.join(projectPath, 'src_hd');
  if (!isWithinDirectory(document.uri.fsPath, sourceDirectory)) {
    logErrorMessage('Dialog preview is only available for .xhtml or .f.json files located in src_hd.');
    return undefined;
  }

  const namespace = await resolveNamespaceFromPath(document.uri, projectPath, 'src_hd');
  if (!namespace || !dialogName) {
    logErrorMessage('Failed to derive preview information from the active dialog file.');
    return undefined;
  }

  const currentProject = await IvyEngineManager.instance
    .projects()
    .then(projects => projects?.find(project => stripTrailingSeparator(project.projectDirectory) === stripTrailingSeparator(projectPath)));
  if (!currentProject) {
    logErrorMessage('Failed to find the current Ivy project in the running engine.');
    return undefined;
  }

  const previewDialogId = `${namespace}.${dialogName}`;
  const previewProject = path.basename(projectPath);
  return buildDialogPreviewUrl(devContextPath, currentProject.id.app, previewProject, previewDialogId);
};

export const isDialogPreviewSupported = async () => {
  const document = await getActiveDialogPreviewDocument();
  if (!document || document.uri.scheme !== 'file') {
    return false;
  }

  const dialogName = getDialogName(document.fileName);
  if (!dialogName || isComponentDialog(document)) {
    return false;
  }

  const projectPath = await treeUriToProjectPath(document.uri, IvyProjectExplorer.instance.getIvyProjects());
  if (!projectPath) {
    return false;
  }

  const sourceDirectory = path.join(projectPath, 'src_hd');
  return isWithinDirectory(document.uri.fsPath, sourceDirectory);
};

const isWithinDirectory = (filePath: string, directoryPath: string) => {
  const relativePath = path.relative(stripTrailingSeparator(directoryPath), stripTrailingSeparator(filePath));
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const getDialogName = (fileName: string) => {
  const matchedExtension = supportedDialogFileExtensions.find(extension => fileName.endsWith(extension));
  return matchedExtension ? path.basename(fileName, matchedExtension) : undefined;
};

const isComponentDialog = (document: TextDocument) =>
  document.fileName.endsWith('.xhtml') && /<cc:interface(?:\s|>)/.test(document.getText());
