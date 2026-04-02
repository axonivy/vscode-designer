import path from 'path';
import { type QuickPickItem, Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ProcessInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectExplorer } from './ivy-project-explorer';
import { type InputStep, type MSStateBase, MultiStepInput } from './utils/multi-step-input';
import { resolveNamespaceFromPath, validateArtifactName, validateNamespace } from './utils/util';

export type ProcessKind = 'Business Process' | 'Callable Sub Process' | 'Web Service Process' | '';

export type NewProcessParams = ProcessInit;

interface ProjectSelection extends QuickPickItem {
  label: string;
  description: string;
  path: string;
}

interface NewProcessState extends MSStateBase {
  projectSelection: ProjectSelection;
  name: string;
  namespace: string;
  namespaceFromPath?: string;
  projectSelectionFromPath?: ProjectSelection;
}

export const addNewProcess = async (kind: ProcessKind = 'Business Process', pid?: string, uri?: Uri, projectPath?: string) => {
  // Step 1 - Pick the project to create the process in, based on available projects in the workspace
  // If supplied, use preselected URI and project path for project and namespace
  const projectSelectionFromPath = projectPath
    ? { label: projectPath.substring(projectPath.lastIndexOf(path.sep) + 1), description: projectPath, path: projectPath }
    : undefined;
  const namespaceFromPath = projectPath && uri ? await resolveNamespaceFromPath(uri, projectPath, 'processes') : undefined;

  const projects: string[] = await IvyProjectExplorer.instance.getIvyProjects();
  if (!projects || projects.length === 0) {
    logErrorMessage('No ivy-projects are open in the workspace.');
    return;
  }

  const stepProject: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    if (state.projectSelectionFromPath && stepProject.execCounter !== undefined && stepProject.execCounter === 0) {
      state.projectSelection = state.projectSelectionFromPath;
    } else {
      state.projectSelection = await input.showQuickPick({
        title: state.dialogTitle,
        titleSuffix: ' - Choose project',
        placeholder: 'Select one of the available projects',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        activeItem: state.projectSelection,
        items: projects.map(project => {
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
      placeholder: 'Enter a name. Allowed characters: a-z, A-Z, 0-9, -, _',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.name,
      validationFunction: validateArtifactName
    });
  };

  // Step 3 - Enter the namespace of the process to be created
  const stepNamespace: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    if (state.namespaceFromPath) {
      state.namespace = state.namespaceFromPath;
    }
    state.namespace = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose process namespace',
      placeholder: 'Enter Namespace separated by "/"',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.namespace,
      validationFunction: validateNamespace
    });
  };

  // Define step order, set execution counter for steps that might have defaults and set value automatically
  const steps: InputStep<NewProcessState>[] = [stepProject, stepName, stepNamespace];
  stepProject.execCounter = 0;

  const newProcessData: NewProcessState = {
    dialogTitle: `Add New ${kind}`,
    currentStep: 1,
    totalSteps: steps.length,
    name: '',
    namespace: '',
    namespaceFromPath: namespaceFromPath,
    projectSelection: {} as ProjectSelection,
    projectSelectionFromPath: projectSelectionFromPath
  };

  await new MultiStepInput<NewProcessState>().stepThrough(steps, newProcessData);

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
    logErrorMessage('Process creation cancelled or invalid input provided. Current input state: ' + JSON.stringify(newProcessData));
    return;
  }
};
