import fs from 'node:fs';
import path from 'path';
import { commands, env, ProgressLocation, Uri, window, type Progress } from 'vscode';
import { showExtensionLog } from '../base/extension-output-channel';
import { logErrorMessage, logInformationMessageWithActions } from '../base/logging-util';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase, type ProjectSelection } from './utils/multi-step-input';
import { validateExportPath } from './utils/util';

interface ExportProjectsState extends MSStateBase {
  project?: ProjectSelection;
  targetFolderUri?: Uri;
  targetFilename?: string;
}

export const exportIvyProject = async (addCommandSelectionContext: AddCommandSelectionContext) => {
  const stepProjects: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    const selectedProject = await input.showQuickPick<ProjectSelection>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose project to export as Ivy Archive (.iar)',
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
      title: 'Target folder for .iar file',
      openLabel: 'Select folder'
    });
    if (!selectedUri || !selectedUri[0] || selectedUri.length === 0) {
      throw new MultiStepCancelledError('Dialog cancelled by the user');
    }
    try {
      const st = fs.statSync(selectedUri[0].fsPath);
      if (!st.isDirectory()) {
        throw new MultiStepCancelledError('Selected target is not a directory. Export cancelled.');
      }
      state.targetFolderUri = selectedUri[0];
    } catch (error) {
      throw new MultiStepCancelledError(`Error accessing target folder. Export cancelled. ${error}`);
    }
  };

  const stepFileName: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    if (!state.targetFolderUri) {
      throw new MultiStepCancelledError('Target folder not selected. Export cancelled.');
    }
    state.targetFilename = state.project?.label;
    const targetFolderPath = state.targetFolderUri.fsPath;
    const buildTargetPathPrompt = (typedValue: string) => `Target path: ${path.join(targetFolderPath, typedValue + '.iar')}`;

    state.targetFilename = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose name of export file (without extension .iar)',
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

  const exportProjectData: ExportProjectsState = {
    dialogTitle: `Export Axon Ivy Project`,
    currentStep: 1,
    totalSteps: steps.length,
    project: undefined
  };

  try {
    await new MultiStepInput<ExportProjectsState>().stepThrough(steps, exportProjectData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
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
  const targetFilePath = path.join(targetFolder, targetFileName + '.iar');

  if (fs.existsSync(targetFilePath)) {
    logErrorMessage(`Export Axon Ivy Project: Target file already exists at path: ${targetFilePath}. Export cancelled.`);
    return;
  }

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      cancellable: false,
      title: 'Axon Ivy Export .iar'
    },
    async progress => await exportIar(exportProjectData.project as ProjectSelection, targetFilePath, targetFolder, targetFileName, progress)
  );
};

const exportIar = async (
  projectToExport: ProjectSelection,
  targetFilePath: string,
  targetFolder: string,
  fileName: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  progress.report({
    message: `${projectToExport.label}`
  });

  try {
    await commands.executeCommand(
      'maven.goal.custom',
      path.join(projectToExport.path, 'pom.xml'),
      `com.axonivy.ivy.ci:project-build-plugin:pack-iar -Divy.output.directory='${targetFolder}' -Divy.final.name='${fileName}'`
    );
  } catch (error) {
    logErrorMessage(`Failed to run Maven command for project ${projectToExport.label}: ${(error as Error).message}`);
    return;
  }

  logInformationMessageWithActions(`Exported project ${projectToExport.label} to ${targetFilePath}`, {
    'Show Log': () => {
      showExtensionLog();
    },
    'Reveal in Explorer': async () => {
      await env.openExternal(Uri.file(targetFolder));
    }
  });
};
