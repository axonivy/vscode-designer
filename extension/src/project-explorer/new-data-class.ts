import path from 'path';
import { logErrorMessage } from '../base/logging-util';
import { type DataClassInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { type AddCommandSelectionContext } from './ivy-project-explorer';
import {
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  resolveAddCommandSelectionContext,
  type InputStep,
  type MSStateBase,
  type ProjectSelection
} from './utils/multi-step-input';
import { validateDotSeparatedName, validateProjectArtifactName } from './utils/util';

type DataClassType = 'Data Class' | 'Entity Class';

type NewDataClassParams = DataClassInit;

interface NewDataClassState extends MSStateBase {
  project?: ProjectSelection | undefined;
  name?: string | undefined;
  namespace?: string | undefined;
  projectFromSelection?: ProjectSelection | undefined;
}

export const addNewDataClass = async (type: DataClassType, selectionContext: AddCommandSelectionContext) => {
  const existingProjects = selectionContext.existingIvyProjects;
  const { projectFromSelection, namespaceFromSelection } = await resolveAddCommandSelectionContext(selectionContext, 'dataclasses');

  const stepProject: InputStep<NewDataClassState> = async (input: MultiStepInput<NewDataClassState>, state: NewDataClassState) => {
    if (state.projectFromSelection && state.project === undefined) {
      state.project = state.projectFromSelection;
      state.projectFromSelection = undefined;
    } else {
      state.project = await input.showQuickPick<ProjectSelection>({
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
    }
  };

  const stepName: InputStep<NewDataClassState> = async (input: MultiStepInput<NewDataClassState>, state: NewDataClassState) => {
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

  const stepNamespace: InputStep<NewDataClassState> = async (input: MultiStepInput<NewDataClassState>, state: NewDataClassState) => {
    state.namespace = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose namespace',
      placeholder: 'Enter Namespace separated by ".". Allowed characters: a-z, A-Z, 0-9, _, .',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.namespace,
      validationFunction: validateDotSeparatedName,
      onBack: (typedValue: string) => {
        state.namespace = typedValue;
      }
    });
  };

  const steps: InputStep<NewDataClassState>[] = [stepProject, stepName, stepNamespace];

  const newDataClassDialogData: NewDataClassState = {
    dialogTitle: `Add New ${type}`,
    currentStep: 1,
    totalSteps: steps.length,
    namespace: typeof namespaceFromSelection === 'string' && namespaceFromSelection.trim() !== '' ? namespaceFromSelection : undefined,
    projectFromSelection: projectFromSelection
  };

  try {
    await new MultiStepInput<NewDataClassState>().stepThrough(steps, newDataClassDialogData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
      return;
    } else {
      throw err;
    }
  }

  if (
    newDataClassDialogData.name !== undefined &&
    newDataClassDialogData.namespace !== undefined &&
    newDataClassDialogData.project !== undefined
  ) {
    const createDataClassInput: NewDataClassParams = {
      name: `${newDataClassDialogData.namespace}.${newDataClassDialogData.name}`,
      projectDir: newDataClassDialogData.project.path
    };
    if (type === 'Data Class') {
      await IvyEngineManager.instance.createDataClass(createDataClassInput);
    } else {
      await IvyEngineManager.instance.createEntityClass(createDataClassInput);
    }
  } else {
    throw new MultiStepInvalidStateError(
      'Data Class creation failed due to corrupted input state. name, namespace or project selection is undefined. Current input state: ' +
        JSON.stringify(newDataClassDialogData)
    );
  }
};
