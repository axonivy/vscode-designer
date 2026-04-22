import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { IvyEngineManager } from '../engine/engine-manager';
import {
  type InputStep,
  type MSStateBase,
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  type ProjectSelection
} from './utils/multi-step-input';
import { resolveNamespaceFromPath, validateNamespace, validateProjectArtifactName } from './utils/util';

interface NewCaseMapState extends MSStateBase {
  projectSelection?: ProjectSelection;
  name?: string;
  namespace?: string;
  projectSelectionFromPath?: ProjectSelection;
}

export const addNewCaseMap = async (existingProjects: string[], uri?: Uri, projectPath?: string) => {
  // If supplied, use preselected URI and project path for project and namespace
  const projectSelectionFromPath = projectPath
    ? { label: projectPath.substring(projectPath.lastIndexOf(path.sep) + 1), description: projectPath, path: projectPath }
    : undefined;
  const namespaceFromPath = projectPath && uri ? await resolveNamespaceFromPath(uri, projectPath, 'processes') : undefined;

  const stepProject: InputStep<NewCaseMapState> = async (input: MultiStepInput<NewCaseMapState>, state: NewCaseMapState) => {
    if (state.projectSelectionFromPath && state.projectSelection === undefined) {
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

  const stepName: InputStep<NewCaseMapState> = async (input: MultiStepInput<NewCaseMapState>, state: NewCaseMapState) => {
    state.name = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose name',
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

  const stepNamespace: InputStep<NewCaseMapState> = async (input: MultiStepInput<NewCaseMapState>, state: NewCaseMapState) => {
    state.namespace = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose namespace',
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

  const steps: InputStep<NewCaseMapState>[] = [stepProject, stepName, stepNamespace];

  const newCaseMapData: NewCaseMapState = {
    dialogTitle: 'Add New Case Map',
    currentStep: 1,
    totalSteps: steps.length,
    namespace: typeof namespaceFromPath === 'string' && namespaceFromPath.trim() !== '' ? namespaceFromPath : '',
    projectSelectionFromPath: projectSelectionFromPath
  };

  try {
    await new MultiStepInput<NewCaseMapState>().stepThrough(steps, newCaseMapData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
      return;
    } else {
      throw err;
    }
  }

  if (newCaseMapData.name !== undefined && newCaseMapData.namespace !== undefined && newCaseMapData.projectSelection !== undefined) {
    const createCaseMapInput = {
      projectDir: newCaseMapData.projectSelection.path,
      name: newCaseMapData.name,
      namespace: newCaseMapData.namespace
    };

    await IvyEngineManager.instance.createCaseMap(createCaseMapInput);
  } else {
    throw new MultiStepInvalidStateError(
      'Case Map creation failed due to corrupted input state. name, namespace or project selection is undefined. Current input state: ' +
        JSON.stringify(newCaseMapData)
    );
  }
};
