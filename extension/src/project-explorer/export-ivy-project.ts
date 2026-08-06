import AdmZip from 'adm-zip';
import fs from 'node:fs';
import { copyFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
import { ProgressLocation, Uri, window, type Progress } from 'vscode';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { runMavenCommand } from '../editors/restclient-editor/maven-runner';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase, type ProjectSelection } from './utils/multi-step-input';
import { validateExportPath } from './utils/util';

const outputChannel = window.createOutputChannel('Axon Ivy Export');

type ExtensionType = '.iar' | '.zip';
const ALLOWED_EXTENSIONS = ['.iar', '.zip'] as const;

interface ExportProjectsState extends MSStateBase {
  projects: ProjectSelection[];
  targetFolderUri?: Uri | undefined;
  targetFilename?: string | undefined;
  ext: ExtensionType;
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

  const targetFilePath = path.join(exportProjectData.targetFolderUri.fsPath, exportProjectData.targetFilename + exportProjectData.ext);

  if (exportProjectData.ext === '.zip') {
    await window.showInformationMessage(
      'Creating a .zip file will not automatically include all Axon Ivy dependencies of the selected projects.\nYou are responsible for ensuring that all necessary dependencies are selected',
      { modal: true } // blocks until user chooses/dismisses
    );
  }

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      cancellable: false,
      title: `Axon Ivy Export ${exportProjectData.ext}`
    },
    async progress => await exportTask(exportProjectData.projects, targetFilePath, progress)
  );
};

const exportTask = async (
  projectsToExport: ProjectSelection[],
  targetFilePath: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  if (projectsToExport.length === 0) {
    logErrorMessage('No projects selected for export. Export cancelled.');
    return;
  }

  if (projectsToExport.length === 1) {
    const projectToExport = projectsToExport[0] as ProjectSelection;
    await exportIar(projectToExport, targetFilePath, progress);
  } else {
    await exportZip(projectsToExport, targetFilePath, progress);
  }
};

const exportZip = async (
  projectsToExport: ProjectSelection[],
  targetFilePath: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  const numOfProjects = projectsToExport.length;
  let exportedCount = 0;
  const failedProjects: ProjectSelection[] = [];
  const exportedFiles: string[] = [];
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'axon-ivy-export-'));
  try {
    for (const project of projectsToExport) {
      progress.report({
        message: `Exporting ${exportedCount + 1} of ${numOfProjects} project(s) - ${project.label}\n\n${failedProjects.length > 0 ? `Failed to export ${failedProjects.length} project(s).` : ''}`
      });
      try {
        const outputMvnCommand = await runMavenCommand(project.path, 'mvn -B -ntp package', outputChannel);
        const matchMvnOutput = outputMvnCommand.match(new RegExp(String.raw`^\[INFO\]\s+Building zip:\s+(.+)$`, 'm'));
        if (!matchMvnOutput || !matchMvnOutput[1]) {
          throw new Error(`Exported file path not found in Maven output. Output:\n${outputMvnCommand}`);
        }
        const exportedFilePath = matchMvnOutput[1].trim();
        if (!fs.existsSync(exportedFilePath)) {
          throw new Error(`Exported file does not exist on disk at path: ${exportedFilePath}`);
        }
        if (!ALLOWED_EXTENSIONS.includes(path.extname(exportedFilePath) as ExtensionType)) {
          throw new Error(
            `Exported file has an invalid extension: ${path.extname(exportedFilePath)}. Allowed extensions are: ${ALLOWED_EXTENSIONS.join(', ')}`
          );
        }
        const exportedFileName = path.basename(exportedFilePath);
        const tempExportedFilePath = path.join(tmpDir, exportedFileName);
        await copyFile(exportedFilePath, tempExportedFilePath);
        exportedFiles.push(tempExportedFilePath);
      } catch (error) {
        logErrorMessage(`Failed to export project ${project.label}: ${(error as Error).message}`);
        failedProjects.push(project);
      }
      exportedCount++;
      progress.report({
        increment: (1 / numOfProjects) * 100
      });

      if (failedProjects.length > 0) {
        throw new Error(`Failed to export ${failedProjects.length} project(s). Export cancelled.`);
      }

      const zip = new AdmZip();
      exportedFiles.forEach(file => {
        zip.addLocalFile(file);
      });
      zip.writeZip(targetFilePath);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

const exportIar = async (
  projectToExport: ProjectSelection,
  targetPath: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  progress.report({
    message: `Exporting project - ${projectToExport.label}`
  });
  try {
    const outputMvnCommand = await runMavenCommand(projectToExport.path, 'mvn -B -ntp package', outputChannel);
    const matchMvnOutput = outputMvnCommand.match(new RegExp(String.raw`^\[INFO\]\s+Building zip:\s+(.+)$`, 'm'));
    if (!matchMvnOutput || !matchMvnOutput[1]) {
      throw new Error(`Exported file path not found in Maven output. Output:\n${outputMvnCommand}`);
    }
    const exportedFilePath = matchMvnOutput[1].trim();
    if (!fs.existsSync(exportedFilePath)) {
      throw new Error(`Exported file does not exist on disk at path: ${exportedFilePath}`);
    }
    if (!ALLOWED_EXTENSIONS.includes(path.extname(exportedFilePath) as ExtensionType)) {
      throw new Error(
        `Exported file has an invalid extension: ${path.extname(exportedFilePath)}. Allowed extensions are: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }
    await copyFile(exportedFilePath, targetPath);
    progress.report({
      increment: 100
    });
  } catch (error) {
    logErrorMessage(`Failed to export project ${projectToExport.label}: ${(error as Error).message}`);
    throw error;
  }
};
