import AdmZip from 'adm-zip';
import fs from 'node:fs';
import { copyFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
import { ProgressLocation, Uri, window, type Progress } from 'vscode';
import { logErrorMessage, logErrorMessageWithActions, logInformationMessage, logInformationMessageWithActions } from '../base/logging-util';
import { runMavenCommand } from '../editors/restclient-editor/maven-runner';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase, type ProjectSelection } from './utils/multi-step-input';
import { validateExportPath } from './utils/util';

const outputChannel = window.createOutputChannel('Axon Ivy Export');

const showExportLog = () => {
  outputChannel.show();
};

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

  // Defensive programming. Should not happen, but just in case.
  if (!exportProjectData.targetFolderUri || !exportProjectData.targetFilename) {
    throw new Error('Unexpected state after dialog: target folder or filename is undefined. Export cancelled.');
  }
  if (exportProjectData.projects.length === 0) {
    throw new Error('Unexpected state after dialog: no projects selected. Export cancelled.');
  }

  const targetFilePath = path.join(exportProjectData.targetFolderUri.fsPath, exportProjectData.targetFilename + exportProjectData.ext);

  // Should not happen, for safety
  // TODO: Instead of error, allow duplicte, warn after last step (with Back/Continue buttons) and warn+overwrite if user continues
  if (fs.existsSync(targetFilePath)) {
    logErrorMessage(`Export Axon Ivy Project: Target file already exists at path: ${targetFilePath}. Export cancelled.`);
    return;
  }

  if (exportProjectData.ext === '.zip') {
    await window.showInformationMessage(
      'WARNING:\n\nCreating a .zip file will not automatically include all Axon Ivy dependencies of the selected projects.\n\nYou are responsible for ensuring that all necessary dependencies are selected.',
      { modal: true }
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
  if (projectsToExport.length === 1) {
    const projectToExport = projectsToExport[0] as ProjectSelection;
    await exportIar(projectToExport, targetFilePath, progress);
  } else {
    await exportZip(projectsToExport, targetFilePath, progress);
  }
};

const exportIar = async (
  projectToExport: ProjectSelection,
  targetPath: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  progress.report({
    message: `${projectToExport.label}`
  });

  let mvnOutput: string;

  // Run Maven command
  try {
    mvnOutput = await runMavenCommand(projectToExport.path, 'mvn -B -ntp package', outputChannel);
  } catch (error) {
    logErrorIvyExport(`Failed to run Maven command for project ${projectToExport.label}: ${(error as Error).message}`);
    return;
  }

  // Extract exported file path and copy to target path
  try {
    const exportedFilePath = extractExportedFilePath(mvnOutput);
    await copyFile(exportedFilePath, targetPath);
    progress.report({
      increment: 100
    });
  } catch (error) {
    logErrorIvyExport(`Failed to locate and copy exported project ${projectToExport.label}: ${(error as Error).message}`);
    return;
  }

  logInfoIvyExport(`Exported project ${projectToExport.label} to ${targetPath}`);
};

const exportZip = async (
  projectsToExport: ProjectSelection[],
  targetFilePath: string,
  progress: Progress<{ message?: string; increment?: number }>
) => {
  const numOfProjects = projectsToExport.length;
  const failedProjects: ProjectSelection[] = [];
  const exportedFiles: string[] = [];
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'axon-ivy-export-'));
  try {
    for (const [index, projectToExport] of projectsToExport.entries()) {
      progress.report({
        message: `${projectToExport.label} (${index + 1}/${numOfProjects})`
      });

      let mvnOutput: string;

      // Run Maven command
      try {
        mvnOutput = await runMavenCommand(projectToExport.path, 'mvn -B -ntp package', outputChannel);
      } catch (error) {
        logErrorIvyExport(`Failed to run Maven command for project ${projectToExport.label}: ${(error as Error).message}`);
        return;
      }

      // Extract exported file path and copy to tmp folder
      try {
        const exportedFilePath = extractExportedFilePath(mvnOutput);
        const exportedFileName = path.basename(exportedFilePath);
        const tempExportedFilePath = path.join(tmpDir, exportedFileName);
        await copyFile(exportedFilePath, tempExportedFilePath);
        exportedFiles.push(tempExportedFilePath);
      } catch (error) {
        logErrorIvyExport(`Failed to export project ${projectToExport.label}: ${(error as Error).message}`);
        failedProjects.push(projectToExport);
      }
      progress.report({
        increment: (1 / numOfProjects) * 100
      });

      // If not all exports and copy operations were successfull abort and do not create zip file
      if (failedProjects.length > 0) {
        logErrorIvyExport(
          `There were ${failedProjects.length} failed exports. Aborting zip creation. Failed projects: ${failedProjects.map(p => p.label).join(', ')}`
        );
        return;
      }

      // Create zip file from exported files
      try {
        const zip = new AdmZip();
        exportedFiles.forEach(file => {
          zip.addLocalFile(file);
        });
        zip.writeZip(targetFilePath);
      } catch (error) {
        logErrorIvyExport(`Failed to create zip file at ${targetFilePath}: ${(error as Error).message}`);
        return;
      }
    }
    logInfoIvyExport(`Exported ${exportedFiles.length} projects to ${targetFilePath}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

const extractExportedFilePath = (mvnOutput: string): string => {
  const matchMvnOutput = mvnOutput.match(new RegExp(String.raw`^\[INFO\]\s+Building zip:\s+(.+)$`, 'm'));
  if (!matchMvnOutput || !matchMvnOutput[1]) {
    throw new Error(`Exported file path not found in Maven output. Output:\n${mvnOutput}`);
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
  return exportedFilePath;
};

const logInfoIvyExport = (message: string) => {
  logInformationMessageWithActions(message, {
    'Show Export Log': () => {
      showExportLog();
    }
  });
};

const logErrorIvyExport = (message: string) => {
  const msg = `Axon Ivy Export Error - ${message}`;
  logErrorMessageWithActions(msg, {
    'Show Export Log': () => {
      showExportLog();
    }
  });
};
