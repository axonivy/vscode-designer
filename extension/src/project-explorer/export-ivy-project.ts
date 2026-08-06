import path from 'path';
import { logErrorMessage } from '../base/logging-util';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase, type ProjectSelection } from './utils/multi-step-input';
import { validateProjectName } from './utils/util';

interface ExportProjectsState extends MSStateBase {
  projects: ProjectSelection[];
  targetFolder?: string | undefined;
  targetFilename?: string | undefined;
}

export const exportIvyProjects = async (addCommandSelectionContext: AddCommandSelectionContext) => {
  const existingProjects = addCommandSelectionContext.existingIvyProjects;
  let selectedProjects: ProjectSelection[] = [];

  const stepProjects: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    state.projects = await input.showQuickPick<ProjectSelection, true>({
      canSelectMany: true,
      title: state.dialogTitle,
      titleSuffix: ' - Choose projects to export',
      placeholder: 'Select projects',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      selectedItems: selectedProjects,
      items: existingProjects.map(project => {
        return {
          label: path.basename(project),
          description: project,
          path: project
        };
      })
    });
    selectedProjects = state.projects;
  };

  const stepFileName: InputStep<ExportProjectsState> = async (input: MultiStepInput<ExportProjectsState>, state: ExportProjectsState) => {
    state.targetFilename = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose name of export file',
      placeholder: 'Enter a name. Must start with a letter or underscore. Allowed characters: a-z, A-Z, 0-9, _',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.targetFilename,
      validationFunction: validateProjectName,
      onBack: (typedValue: string) => {
        state.targetFilename = typedValue;
      }
    });
  };

  // Define step order
  const steps: InputStep<ExportProjectsState>[] = [stepProjects, stepFileName];

  const exportProjectData: ExportProjectsState = {
    dialogTitle: `Export Axon Ivy Projects`,
    currentStep: 1,
    totalSteps: steps.length,
    projects: []
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

  console.log(exportProjectData);
};

// const validateOutputFileName = (fileName: string, folderPath: Uri, extension: string): string | undefined => {
//   const nameValid = validateProjectName(fileName);
//   if (nameValid !== undefined) {
//     return nameValid;
//   }
//   const filePath = path.join(folderPath.fsPath, `${fileName}${extension}`);
//   if (fs.existsSync(filePath)) {
//     return `File already exists: ${filePath}`;
//   }
//   return undefined;
// };
