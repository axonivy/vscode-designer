import fs from 'node:fs';
import path from 'path';
import type { Progress, Uri } from 'vscode';
import { commands, ProgressLocation, window } from 'vscode';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase, type ProjectSelection } from './utils/multi-step-input';
import { validateExportPath } from './utils/util';

interface ExportProjectsState extends MSStateBase {
  projects: ProjectSelection[];
  targetFolderUri?: Uri | undefined;
  targetFilename?: string | undefined;
  ext: '.iar' | '.zip';
}

export const exportIvyProjects = async (addCommandSelectionContext: AddCommandSelectionContext) => {
  const existingProjects = addCommandSelectionContext.existingIvyProjects;
  const existingProjectsWithPom = existingProjects.filter(project => {
    return fs.existsSync(path.join(project, 'pom.xml'));
  });

  const stepProjects: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    const selectedProjects = await input.showQuickPick<ProjectSelection, true>({
      canSelectMany: true,
      title: state.dialogTitle,
      titleSuffix: ' - Choose projects to export (must contain pom.xml file in root)',
      placeholder:
        'If you select multiple projects, they will be exported as a single .zip file. If you select only one project, it will be exported as a .iar file.',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      selectedItems: state.projects,
      items: existingProjectsWithPom.map(project => {
        return {
          label: path.basename(project),
          description: project,
          path: project
        };
      })
    });
    state.projects = selectedProjects;
    state.ext = selectedProjects.length > 1 ? '.zip' : '.iar';
  };

  const stepFolder: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    const selectedUri = await window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: state.targetFolderUri,
      title: `Target folder for ${state.ext} file`,
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
      logInformationMessage(`Selected target folder: ${state.targetFolderUri.fsPath}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err === undefined || err === null) {
        throw new MultiStepCancelledError('Error accessing target folder. Export cancelled.');
      }
      if (err?.code === 'ENOENT') {
        throw new MultiStepCancelledError('Selected target folder does not exist. Export cancelled.');
      }
      if (err?.code === 'EACCES' || err?.code === 'EPERM') {
        throw new MultiStepCancelledError('Permission denied to access target folder. Export cancelled.');
      }
      if (err) throw err; // unexpected error
    }
  };

  const stepFileName: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    if (!state.targetFolderUri) {
      throw new MultiStepCancelledError('Target folder not selected. Export cancelled.');
    }
    const targetFolderPath = (state.targetFolderUri as Uri).fsPath;
    const buildTargetPathPrompt = (typedValue: string) => `Target path: ${path.join(targetFolderPath, typedValue + state.ext)}`;

    state.targetFilename = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ` - Choose name of export file (without extension ${state.ext})`,
      placeholder: 'Enter a name. Must start with a letter or underscore. Allowed characters: a-z, A-Z, 0-9, _',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.targetFilename,
      prompt: buildTargetPathPrompt(state.targetFilename ?? ''),
      validationFunction: (value: string) => validateExportPath(value, state.targetFolderUri as Uri, state.ext),
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
    dialogTitle: `Export Axon Ivy Projects`,
    currentStep: 1,
    totalSteps: steps.length,
    projects: [],
    ext: '.iar'
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
    logErrorMessage('Export Axon Ivy Project: Target folder or filename not selected. Export cancelled.');
    return;
  }
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      cancellable: false,
      title: `Axon Ivy Export`
    },
    async progress => await exportTask(exportProjectData.projects, progress)
  );
};

const exportTask = async (projectsToExport: ProjectSelection[], progress: Progress<{ message?: string; increment?: number }>) => {
  let exportedCount = 0;
  const failedProjects: ProjectSelection[] = [];
  const numOfProjects = projectsToExport.length;
  for (const project of projectsToExport) {
    progress.report({
      message: `Exporting ${exportedCount + 1} of ${numOfProjects} project(s)\n\n${failedProjects.length > 0 ? `Failed to export ${failedProjects.length} project(s).` : ''}`
    });
    const projectPomPath = path.join(project.path, 'pom.xml');
    try {
      await commands.executeCommand('maven.goal.package', { pomPath: projectPomPath });
      exportedCount++;
    } catch (error) {
      logErrorMessage(`Failed to export project ${project.path}: ${error}`);
      failedProjects.push(project);
    }
    progress.report({
      increment: (1 / numOfProjects) * 100
    });
  }
};
