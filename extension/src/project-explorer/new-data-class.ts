import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { type DataClassInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import type { InputStep, MSStateBase, ProjectSelection } from './utils/multi-step-input';
import { MultiStepCancelledError, MultiStepInput, MultiStepInvalidStateError } from './utils/multi-step-input';
import { resolveNamespaceFromPath, validateDotSeparatedName, validateProjectArtifactName } from './utils/util';

export const dataClassTypes = ['Data Class', 'Entity Class'] as const;
export type DataClassType = (typeof dataClassTypes)[number];

type NewDataClassParams = DataClassInit;

interface NewDataClassState extends MSStateBase {
  projectSelection?: ProjectSelection | undefined;
  name?: string | undefined;
  namespace?: string | undefined;
  projectSelectionFromPath?: ProjectSelection | undefined;
}

export const addNewDataClass = async (type: DataClassType, existingProjects: string[], uri?: Uri, projectPath?: string) => {
  // If supplied, use preselected URI and project path for project and namespace
  const projectSelectionFromPath = projectPath
    ? { label: projectPath.substring(projectPath.lastIndexOf(path.sep) + 1), description: projectPath, path: projectPath }
    : undefined;
  const namespaceFromPath = projectPath && uri ? await resolveNamespaceFromPath(uri, projectPath, 'dataclasses') : undefined;

  const stepProject: InputStep<NewDataClassState> = async (input: MultiStepInput<NewDataClassState>, state: NewDataClassState) => {
    if (state.projectSelectionFromPath && state.projectSelection === undefined) {
      state.projectSelection = state.projectSelectionFromPath;
      state.projectSelectionFromPath = undefined;
    } else {
      state.projectSelection = await input.showQuickPick<ProjectSelection>({
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

  const stepName: InputStep<NewDataClassState> = async (input: MultiStepInput<NewDataClassState>, state: NewDataClassState) => {
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
    namespace: typeof namespaceFromPath === 'string' && namespaceFromPath.trim() !== '' ? namespaceFromPath : undefined,
    projectSelectionFromPath: projectSelectionFromPath
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
    newDataClassDialogData.projectSelection !== undefined
  ) {
    const createDataClassInput: NewDataClassParams = {
      name: `${newDataClassDialogData.namespace}.${newDataClassDialogData.name}`,
      projectDir: newDataClassDialogData.projectSelection.path
    };
    switch (type) {
      case 'Data Class':
        await IvyEngineManager.instance.createDataClass(createDataClassInput);
        break;
      case 'Entity Class':
        await IvyEngineManager.instance.createEntityClass(createDataClassInput);
        break;
      default:
        throw new Error(`Unsupported data class type: ${type}`);
    }
  } else {
    throw new MultiStepInvalidStateError('Illegal state: name, namespace or project selection is undefined');
  }
};
