import path from 'path';
import { l10n, ProgressLocation, window, type CancellationToken, type Progress } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { logErrorMessage, logInformationMessage, logInformationMessageWithActions } from '../base/logging-util';
import { decreaseWorkspaceLock, increaseWorkspaceLock } from '../base/workspace-lock';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { showProjectConversionLog } from '../engine/project-conversion-log';

export const runProjectConversion = async (projectsToConvert: string[]) => {
  if (projectsToConvert.length === 0) {
    logInformationMessage(l10n.t('No Axon Ivy project(s) selected for conversion. Conversion aborted.'));
    return;
  }
  try {
    increaseWorkspaceLock();
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: true,
        title: l10n.t('Axon Ivy Project Conversion')
      },
      async (progress, token) => await conversionTask(projectsToConvert, progress, token)
    );
  } finally {
    decreaseWorkspaceLock();
  }
  await IvyEngineManager.instance.deployProjects();
  await IvyDiagnostics.instance.refresh();
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
      logInformationMessage(l10n.t(`Project conversion cancelled by user.`));
      return;
    }
    progress.report({
      message: l10n.t(
        'Converting {0} - {1} of {2} project(s) converted.{3}',
        path.basename(project),
        convertedCount,
        numOfProjects,
        failedProjects.length > 0 ? ` ${l10n.t('{0} project(s) failed to convert.', failedProjects.length)}` : ''
      )
    });
    try {
      const result = await IvyEngineManager.instance.convertProject(project);
      if (result?.hasErrorLogEntry) {
        failedProjects.push(project);
      } else {
        convertedCount++;
      }
    } catch (error) {
      logErrorMessage(l10n.t('Failed to convert project {0}: {1}', project, String(error)));
      failedProjects.push(project);
    }
    progress.report({
      increment: (1 / numOfProjects) * 100
    });
  }
  logInformationMessageWithActions(
    l10n.t(
      'Converted {0} of {1} Axon Ivy project(s).{2}',
      convertedCount,
      numOfProjects,
      failedProjects.length > 0 ? ` ${l10n.t('{0} project(s) failed to convert.', failedProjects.length)}` : ''
    ),
    { [l10n.t('Show Project Conversion Log')]: () => showProjectConversionLog(), [l10n.t('Show Extension Log')]: () => showExtensionLog() }
  );
};
