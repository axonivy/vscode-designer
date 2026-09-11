import path from 'path';
import { ProgressLocation, Uri, window, type CancellationToken, type Progress } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { askToRunJavaCleanWorkspace, runJavaProjectConfigurationUpdate } from '../base/java-extension-api';
import { logErrorMessage, logInformationMessage, logInformationMessageWithActions } from '../base/logging-util';
import { decreaseWorkspaceLock, increaseWorkspaceLock } from '../base/workspace-lock';
import { IvyEngineManager } from '../engine/engine-manager';

export const runProjectConversion = async (projectsToConvert: string[]) => {
  if (projectsToConvert.length === 0) {
    logInformationMessage('No Axon Ivy project(s) selected for conversion. Conversion aborted.');
    return;
  }
  try {
    increaseWorkspaceLock();
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: true,
        title: 'Axon Ivy Project Conversion'
      },
      async (progress, token) => await conversionTask(projectsToConvert, progress, token)
    );
  } finally {
    await askToRunJavaCleanWorkspace('Project conversion finished');
    decreaseWorkspaceLock();
  }
};

const conversionTask = async (
  projectsToConvert: string[],
  progress: Progress<{ message?: string; increment?: number }>,
  token: CancellationToken
) => {
  let convertedCount = 0;
  const failedProjects: string[] = [];
  const numOfProjects = projectsToConvert.length;
  for (const project of projectsToConvert) {
    if (token.isCancellationRequested) {
      logInformationMessage(`Project conversion cancelled by user.`);
      return;
    }
    progress.report({
      message: `Converting ${path.basename(project)} - ${convertedCount} of ${numOfProjects} project(s) converted.${failedProjects.length > 0 ? ` ${failedProjects.length} project(s) failed to convert.` : ''}`
    });
    try {
      await IvyEngineManager.instance.convertProject(project);
      convertedCount++;
    } catch (error) {
      logErrorMessage(`Failed to convert project ${project}: ${error}`);
      failedProjects.push(project);
    }
    progress.report({
      increment: (1 / numOfProjects) * 100
    });
  }
  const projectsToReload = projectsToConvert.filter(p => !failedProjects.includes(p)).map(p => Uri.file(p));
  if (projectsToReload.length > 0) {
    await runJavaProjectConfigurationUpdate(projectsToReload);
  }
  logInformationMessageWithActions(
    `Converted ${convertedCount} of ${numOfProjects} Axon Ivy project(s).${failedProjects.length > 0 ? ` ${failedProjects.length} project(s) failed to convert.` : ''}`,
    { 'Show Extension Log': () => showExtensionLog() }
  );
};
