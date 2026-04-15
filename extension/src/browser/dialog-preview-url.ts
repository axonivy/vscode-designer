import path from 'path';
import { window } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';
import { resolveNamespaceFromPath } from '../project-explorer/utils/util';
import { stripTrailingSeparator } from '../utils/path-utils';
import { buildDialogPreviewUrl } from './dialog-preview-url-builder';

export const dialogPreviewUrl = async (devContextPath: string) => {
  const document = window.activeTextEditor?.document;
  if (!document || document.uri.scheme !== 'file' || path.extname(document.fileName) !== '.xhtml') {
    logErrorMessage('No dialog preview url available. Please open a .xhtml editor.');
    return undefined;
  }

  const projectPath = await treeUriToProjectPath(document.uri, IvyProjectExplorer.instance.getIvyProjects());
  if (!projectPath) {
    logErrorMessage('Failed to find Ivy project associated with the active .xhtml file.');
    return undefined;
  }

  const sourceDirectory = path.join(projectPath, 'src_hd');
  if (!isWithinDirectory(document.uri.fsPath, sourceDirectory)) {
    logErrorMessage('Dialog preview is only available for .xhtml files located in src_hd.');
    return undefined;
  }

  const namespace = await resolveNamespaceFromPath(document.uri, projectPath, 'src_hd');
  const dialogName = path.basename(document.fileName, '.xhtml');
  if (!namespace || !dialogName) {
    logErrorMessage('Failed to derive preview information from the active .xhtml file.');
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

const isWithinDirectory = (filePath: string, directoryPath: string) => {
  const relativePath = path.relative(stripTrailingSeparator(directoryPath), stripTrailingSeparator(filePath));
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};
