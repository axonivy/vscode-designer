import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ProcessInit } from '../engine/api/generated/client';
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
import { resolveNamespaceFromPath, validateNamespace, validateProjectArtifactName, type ResourceDirectoryTarget } from './utils/util';

export type ProcessKind = 'Business Process' | 'Callable Sub Process' | 'Web Service Process' | '';

export type NewProcessParams = ProcessInit;

interface NewProcessState extends MSStateBase {
  project?: ProjectSelection | undefined;
  name?: string | undefined;
  namespace?: string | undefined;
  projectFromSelection?: ProjectSelection | undefined;
}

export const addNewProcess = async (selectionContext: AddCommandSelectionContext, kind: ProcessKind = 'Business Process', pid?: string) => {
  const resourceDirectoryTarget: ResourceDirectoryTarget = 'processes';
  const existingProjects = selectionContext.existingIvyProjects;
  const { projectFromSelection, namespaceFromSelection } = await resolveAddCommandSelectionContext(
    selectionContext,
    resourceDirectoryTarget
  );

  const stepProject: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    if (state.projectFromSelection && state.project === undefined) {
      state.project = state.projectFromSelection;
      state.projectFromSelection = undefined;
    } else {
      const previousProject = state.project;
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
      if (namespaceFromSelection === undefined && (previousProject === undefined || state.project.path !== previousProject.path)) {
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

  const stepName: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
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

  const stepNamespace: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
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

  // Define step order
  const steps: InputStep<NewProcessState>[] = [stepProject, stepName, stepNamespace];

  const newProcessData: NewProcessState = {
    dialogTitle: `Add New ${kind}`,
    currentStep: 1,
    totalSteps: steps.length,
    namespace: namespaceFromSelection,
    projectFromSelection: projectFromSelection
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

  if (newProcessData.project != undefined && newProcessData.name !== undefined && newProcessData.namespace !== undefined) {
    const createProcessInput: NewProcessParams = {
      name: newProcessData.name,
      namespace: newProcessData.namespace,
      path: newProcessData.project.path,
      kind,
      pid
    };

    await IvyEngineManager.instance.createProcess(createProcessInput);
  } else {
    throw new MultiStepInvalidStateError(
      'Process creation failed due to corrupted input state. Current input state: ' + JSON.stringify(newProcessData)
    );
  }
};
