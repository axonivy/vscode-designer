import fs from 'node:fs';
import path from 'path';
import { commands, Disposable, env, l10n, ProgressLocation, Uri, window, workspace, type ExtensionContext, type Progress } from 'vscode';
import { logErrorMessage, logErrorMessageWithActions, logInformationMessageWithActions } from '../base/logging-util';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase, type ProjectSelection } from './utils/multi-step-input';
import { validateExportPath } from './utils/util';

interface ExportProjectsState extends MSStateBase {
  project?: ProjectSelection;
  targetFolderUri?: Uri;
  targetFilename?: string;
}

const LAST_TARGET_FOLDER_KEY = 'axonivy.exportIvyProject.lastTargetFolderUri';

export const exportIvyProject = async (
  addCommandSelectionContext: AddCommandSelectionContext,
  context: Pick<ExtensionContext, 'globalState'>
) => {
  const stepProjects: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    const selectedProject = await input.showQuickPick<ProjectSelection>({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose project to export as Ivy Archive (.iar)'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: addCommandSelectionContext.projectPathSelection,
      matchOnDetail: true,
      matchOnDescription: true,
      items: addCommandSelectionContext.existingIvyProjects.map(project => {
        return {
          label: path.basename(project),
          description: project,
          path: project
        };
      })
    });
    state.project = selectedProject;
  };

  const stepFolder: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    const selectedUri = await window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: state.targetFolderUri,
      title: l10n.t('Target folder for .iar file'),
      openLabel: l10n.t('Select folder')
    });
    if (!selectedUri || !selectedUri[0] || selectedUri.length === 0) {
      throw new MultiStepCancelledError();
    }
    try {
      const st = fs.statSync(selectedUri[0].fsPath);
      if (!st.isDirectory()) {
        throw new MultiStepCancelledError(l10n.t('Selected target is not a directory. Export cancelled.'));
      }
      state.targetFolderUri = selectedUri[0];
    } catch (error) {
      throw new MultiStepCancelledError(l10n.t('Error accessing target folder. Export cancelled. {0}', String(error)));
    }
    await context.globalState.update(LAST_TARGET_FOLDER_KEY, state.targetFolderUri.toString());
  };

  const stepFileName: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    if (!state.targetFolderUri) {
      throw new MultiStepCancelledError(l10n.t('Target folder not selected. Export cancelled.'));
    }
    state.targetFilename = state.project?.label;
    const targetFolderPath = state.targetFolderUri.fsPath;
    const buildTargetPathPrompt = (typedValue: string) => l10n.t('Target path: {0}', path.join(targetFolderPath, typedValue + '.iar'));

    state.targetFilename = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose name of export file (without extension .iar)'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.targetFilename,
      prompt: buildTargetPathPrompt(state.targetFilename ?? ''),
      validationFunction: (value: string) => validateExportPath(value, state.targetFolderUri as Uri),
      onBack: (typedValue: string) => {
        state.targetFilename = typedValue;
      },
      onChange: (typedValue: string, textInputBoxObject) => {
        const targetPathPrompt = buildTargetPathPrompt(typedValue);
        textInputBoxObject.prompt = targetPathPrompt;
      }
    });
  };

  const steps: InputStep<ExportProjectsState>[] = [stepProjects, stepFolder, stepFileName];
  const lastTargetFolderUri = context.globalState.get<string>(LAST_TARGET_FOLDER_KEY);

  const exportProjectData: ExportProjectsState = {
    dialogTitle: l10n.t('Export Axon Ivy Project'),
    currentStep: 1,
    totalSteps: steps.length,
    project: undefined,
    targetFolderUri: lastTargetFolderUri ? Uri.parse(lastTargetFolderUri) : workspace.workspaceFolders?.[0]?.uri
  };

  try {
    await new MultiStepInput<ExportProjectsState>().stepThrough(steps, exportProjectData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      if (err.message.trim()) {
        logErrorMessage(err.message);
      }
      return;
    } else {
      throw err;
    }
  }

  if (!exportProjectData.targetFolderUri || !exportProjectData.targetFilename) {
    throw new Error('Unexpected state after dialog: target folder or filename is undefined. Export cancelled.');
  }
  if (exportProjectData.project === undefined) {
    throw new Error('Unexpected state after dialog: no project selected. Export cancelled.');
  }

  const targetFolder = exportProjectData.targetFolderUri.fsPath;
  const targetFileName = exportProjectData.targetFilename;

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      cancellable: false,
      title: l10n.t('Axon Ivy Export')
    },
    async progress => {
      await exportIar(exportProjectData.project as ProjectSelection, targetFolder, targetFileName, progress);
    }
  );
};

const exportIar = async (
  projectToExport: ProjectSelection,
  targetFolder: string,
  fileName: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  progress.report({
    message: `${projectToExport.label}`
  });

  createEndTerminalExecutionListener();

  await commands.executeCommand(
    'maven.goal.custom',
    path.join(projectToExport.path, 'pom.xml'),
    `com.axonivy.ivy.ci:project-build-plugin:pack-iar "-Divy.output.directory=${targetFolder}" "-Divy.final.name=${fileName}"`
  );
};

let endTerminalExecutionListener: Disposable | undefined;

const createEndTerminalExecutionListener = () => {
  if (endTerminalExecutionListener) {
    return;
  }
  endTerminalExecutionListener = window.onDidEndTerminalShellExecution(e => {
    const commandLineValue = e.execution.commandLine.value;
    if (!commandLineValue.includes('com.axonivy.ivy.ci:project-build-plugin:pack-iar "-Divy.output.directory=')) {
      return;
    }
    if (!commandLineValue.includes('"-Divy.final.name=')) {
      return;
    }
    const showTerminal = {
      [l10n.t('Show Terminal')]: () => {
        e.terminal.show();
      }
    };
    if (e.exitCode !== 0) {
      logErrorMessageWithActions(
        l10n.t('Maven pack-iar command failed with exit code {0} for command: {1}', e.exitCode ?? 'unknown', commandLineValue),
        showTerminal
      );
      return;
    }
    const targetFolder = commandLineValue.match(/"-Divy\.output\.directory=([^"]+)"/)?.[1];
    const fileName = commandLineValue.match(/"-Divy\.final\.name=([^"]+)"/)?.[1];
    if (!targetFolder) {
      logErrorMessageWithActions(l10n.t('Could not determine target folder from command: {0}', commandLineValue), showTerminal);
      return;
    }
    logInformationMessageWithActions(
      l10n.t('Project archive {0} has been exported to "{1}".', fileName ?? '<unknown file name>', targetFolder),
      {
        [l10n.t('Reveal in Explorer')]: async () => {
          await env.openExternal(Uri.file(targetFolder));
        },
        ...showTerminal
      }
    );
  });
};
