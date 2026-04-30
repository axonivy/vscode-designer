import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { IvyEngineManager } from '../engine/engine-manager';
import { type AddCommandSelectionContext } from './ivy-project-explorer';
import {
  type InputStep,
  type MSStateBase,
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  type ProjectSelection,
  resolveAddCommandSelectionContext
} from './utils/multi-step-input';
import { resolveNamespaceFromPath, type ResourceDirectoryTarget, validateNamespace, validateProjectArtifactName } from './utils/util';

interface NewCaseMapState extends MSStateBase {
  project?: ProjectSelection;
  name?: string;
  namespace?: string;
  projectFromSelection?: ProjectSelection;
}

export const addNewCaseMap = async (selectionContext: AddCommandSelectionContext) => {
  const resourceDirectoryTarget: ResourceDirectoryTarget = 'processes';
  const existingProjects = selectionContext.existingIvyProjects;
  const { projectFromSelection, namespaceFromSelection } = await resolveAddCommandSelectionContext(
    selectionContext,
    resourceDirectoryTarget
  );

  const stepProject: InputStep<NewCaseMapState> = async (input: MultiStepInput<NewCaseMapState>, state: NewCaseMapState) => {
    if (state.projectFromSelection && state.project === undefined) {
      state.project = state.projectFromSelection;
      state.projectFromSelection = undefined;
    } else {
      state.project = await input.showQuickPick({
        title: state.dialogTitle,
        titleSuffix: ' - Choose project',
        placeholder: 'Select one of the available projects',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        activeItem: state.project,
        items: existingProjects.map(project => {
          return {
            label: project.substring(project.lastIndexOf(path.sep) + 1),
            description: project,
            path: project
          };
        })
      });
      if (state.namespace === undefined || state.namespace === '') {
        const projectDefaultNamespace = await resolveNamespaceFromPath(
          Uri.file(state.project.path),
          state.project.path,
          resourceDirectoryTarget
        );
        if (validateNamespace(projectDefaultNamespace) === undefined) {
          state.namespace = projectDefaultNamespace;
        }
      }
    }
  };

  const stepName: InputStep<NewCaseMapState> = async (input: MultiStepInput<NewCaseMapState>, state: NewCaseMapState) => {
    state.name = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose name',
      placeholder: 'Enter a name. Must start with a letter or underscore. Allowed characters: a-z, A-Z, 0-9, _',
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
    namespace: typeof namespaceFromSelection === 'string' && namespaceFromSelection.trim() !== '' ? namespaceFromSelection : '',
    projectFromSelection: projectFromSelection
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

  if (newCaseMapData.name !== undefined && newCaseMapData.namespace !== undefined && newCaseMapData.project !== undefined) {
    const createCaseMapInput = {
      projectDir: newCaseMapData.project.path,
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
