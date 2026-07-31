import path from 'path';
import { ProgressLocation, Uri, window, type CancellationToken, type Progress } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { runJavaProjectConfigurationUpdate } from '../base/java-extension-api';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { IvyEngineManager } from '../engine/engine-manager';

export let isProjectConversionRunning = false;

export const runProjectConversion = async (projectsToConvert: string[]) => {
  if (projectsToConvert.length === 0) {
    logInformationMessage('No Axon Ivy project(s) selected for conversion. Conversion aborted.');
    return;
  }
  try {
    isProjectConversionRunning = true;
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: true,
        title: 'Axon Ivy Project Conversion'
      },
      async (progress, token) => await conversionTask(projectsToConvert, progress, token)
    );
  } finally {
    isProjectConversionRunning = false;
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
      message: `Converting ${path.basename(project)} - ${convertedCount}/${numOfProjects} converted.${failedProjects.length > 0 ? ` ${failedProjects.length} project(s) failed to convert.` : ''}`
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
  isProjectConversionRunning = false;
  if (projectsToReload.length > 0) {
    await runJavaProjectConfigurationUpdate(projectsToReload);
  }
  window
    .showInformationMessage(
      `Converted ${convertedCount} of ${numOfProjects} Axon Ivy project(s).${failedProjects.length > 0 ? ` ${failedProjects.length} project(s) failed to convert.` : ''}`,
      'Go to Extension Log'
    )
    .then(selection => {
      if (selection === 'Go to Extension Log') {
        showExtensionLog();
      }
    });
};
