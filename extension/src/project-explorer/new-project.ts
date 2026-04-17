import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { NewProjectParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { type InputStep, type MSStateBase, MultiStepCancelledError, MultiStepInput } from './utils/multi-step-input';
import { validateDotSeparatedName, validateProjectName } from './utils/util';

interface NewProjectState extends MSStateBase {
  projectName: string;
  projectPath: string;
  groupId: string;
  projectId: string;
}

export const addNewProject = async (selectedUri: Uri) => {
  const stepProjectName: InputStep<NewProjectState> = async (input: MultiStepInput<NewProjectState>, state: NewProjectState) => {
    state.projectName = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose project name',
      placeholder: 'Enter a name. Allowed characters: a-z, A-Z, 0-9, _, -',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.projectName,
      validationFunction: validateProjectName,
      onBack: (typedValue: string) => {
        state.projectName = typedValue;
      }
    });
    state.projectPath = path.join(selectedUri.fsPath, state.projectName);
  };

  const stepGroupId: InputStep<NewProjectState> = async (input: MultiStepInput<NewProjectState>, state: NewProjectState) => {
    state.groupId = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose a group ID',
      placeholder: 'Enter a group ID. Allowed characters: a-z, A-Z, 0-9, _. Separate namespaces with dots, e.g. com.mycompany',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.groupId,
      validationFunction: validateDotSeparatedName,
      onBack: (typedValue: string) => {
        state.groupId = typedValue;
      }
    });
  };

  const stepProjectId: InputStep<NewProjectState> = async (input: MultiStepInput<NewProjectState>, state: NewProjectState) => {
    state.projectId = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose a project artifact ID',
      placeholder: 'Enter a project ID. Allowed characters: a-z, A-Z, 0-9, _. Separate namespaces with dots, e.g. my.project',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.projectId,
      validationFunction: validateDotSeparatedName,
      onBack: (typedValue: string) => {
        state.projectId = typedValue;
      }
    });
  };

  const steps: InputStep<NewProjectState>[] = [stepProjectName, stepGroupId, stepProjectId];
  const newProjectData: NewProjectState = {
    dialogTitle: 'Create New Project',
    currentStep: 1,
    totalSteps: steps.length,
    projectName: '',
    projectPath: '',
    groupId: '',
    projectId: ''
  };

  try {
    await new MultiStepInput<NewProjectState>().stepThrough(steps, newProjectData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
      return;
    } else {
      throw err;
    }
  }

  const createProjectInput: NewProjectParams & { path: string } = {
    name: newProjectData.projectName,
    groupId: newProjectData.groupId,
    projectId: newProjectData.projectId,
    path: newProjectData.projectPath
  };

  await IvyEngineManager.instance.createProject(createProjectInput);
};
