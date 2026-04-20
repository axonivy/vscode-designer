import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ProcessInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { type InputStep, type MSStateBase, MultiStepCancelledError, MultiStepInput, type ProjectSelection } from './utils/multi-step-input';
import { resolveNamespaceFromPath, validateNamespace, validateProjectArtifactName } from './utils/util';

export type ProcessKind = 'Business Process' | 'Callable Sub Process' | 'Web Service Process' | '';

export type NewProcessParams = ProcessInit;

interface NewProcessState extends MSStateBase {
  projectSelection: ProjectSelection;
  name: string;
  namespace: string;
  projectSelectionFromPath?: ProjectSelection;
}

export const addNewProcess = async (
  kind: ProcessKind = 'Business Process',
  existingProjects: string[],
  pid?: string,
  uri?: Uri,
  projectPath?: string
) => {
  // Step 1 - Pick the project to create the process in, based on available projects in the workspace
  // If supplied, use preselected URI and project path for project and namespace
  const projectSelectionFromPath = projectPath
    ? { label: projectPath.substring(projectPath.lastIndexOf(path.sep) + 1), description: projectPath, path: projectPath }
    : undefined;
  const namespaceFromPath = projectPath && uri ? await resolveNamespaceFromPath(uri, projectPath, 'processes') : undefined;

  const stepProject: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    if (state.projectSelectionFromPath && (state.projectSelection.label === '' || state.projectSelection.label === undefined)) {
      state.projectSelection = state.projectSelectionFromPath;
      state.projectSelectionFromPath = undefined;
    } else {
      state.projectSelection = await input.showQuickPick({
        title: state.dialogTitle,
        titleSuffix: ' - Choose project',
        placeholder: 'Select one of the available projects',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        activeItem: state.projectSelection,
        items: existingProjects.map(project => {
          return {
            label: project.substring(project.lastIndexOf(path.sep) + 1),
            description: project,
            path: project
          };
        })
      });
    }
  };

  // Step 2 - Enter the name of the process to be created
  const stepName: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    state.name = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose process name',
      placeholder: 'Enter a name. Allowed characters: a-z, A-Z, 0-9, _',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.name,
      validationFunction: validateProjectArtifactName,
      onBack: (typedValue: string) => {
        state.name = typedValue;
      }
    });
  };

  // Step 3 - Enter the namespace of the process to be created
  const stepNamespace: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    state.namespace = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose process namespace',
      placeholder: 'Enter Namespace separated by "/". Allowed characters: a-z, A-Z, 0-9, _, /',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.namespace,
      validationFunction: validateNamespace,
      onBack: (typedValue: string) => {
        state.namespace = typedValue;
      }
    });
  };

  // Define step order
  const steps: InputStep<NewProcessState>[] = [stepProject, stepName, stepNamespace];

  const newProcessData: NewProcessState = {
    dialogTitle: `Add New ${kind}`,
    currentStep: 1,
    totalSteps: steps.length,
    name: '',
    namespace: typeof namespaceFromPath === 'string' && namespaceFromPath.trim() !== '' ? namespaceFromPath : '',
    projectSelection: {} as ProjectSelection,
    projectSelectionFromPath: projectSelectionFromPath
  };

  try {
    await new MultiStepInput<NewProcessState>().stepThrough(steps, newProcessData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
      return;
    } else {
      throw err;
    }
  }

  if (newProcessData.projectSelection && newProcessData.name) {
    const createProcessInput: NewProcessParams = {
      name: newProcessData.name,
      namespace: newProcessData.namespace,
      path: newProcessData.projectSelection.path,
      kind,
      pid
    };

    await IvyEngineManager.instance.createProcess(createProcessInput);
  } else {
    throw new Error('Process creation failed due to corrupted input state. Current input state: ' + JSON.stringify(newProcessData));
  }
};
