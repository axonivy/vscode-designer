import { QuickPickItem } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { ProcessInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectExplorer } from './ivy-project-explorer';
import { InputStep, MSStateBase, MultiStepInput } from './utils/multi-step-input';
import { validateArtifactName, validateNamespace } from './utils/util';

export type ProcessKind = 'Business Process' | 'Callable Sub Process' | 'Web Service Process' | '';

export type NewProcessParams = ProcessInit;

interface ProjectSelection extends QuickPickItem {
  label: string;
  description: string;
  path: string;
}

interface NewProcessState extends MSStateBase {
  projectSelection: ProjectSelection | undefined;
  name: string;
  namespace: string;
}

export const addNewProcess = async (kind: ProcessKind = 'Business Process', pid?: string) => {
  // Step 1 - Pick the project to create the process in, based on available projects in the workspace
  const projects: string[] = await IvyProjectExplorer.instance.getIvyProjects();

  if (!projects || projects.length === 0) {
    logErrorMessage('No ivy-projects are open in the workspace.');
    return;
  }

  const stepProject: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    state.projectSelection = await input.showQuickPick({
      title: state.dialogTitle,
      titleSuffix: ' - Choose project',
      placeholder: 'Select one of the available projects',
      step: state.currentStep,
      totalSteps: state.totalSteps,
      items: projects.map(project => {
        return {
          label: project.substring(project.lastIndexOf('/') + 1),
          description: project,
          path: project
        };
      })
    });
  };

  // Step 2 - Enter the name of the process to be created
  const stepName: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    state.name = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose process name',
      placeholder: 'Enter a name. Allowed characters: a-z, A-Z, 0-9, -, _',
      step: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.name,
      validationFunction: validateArtifactName
    });
  };

  // Step 3 - Enter the namespace of the process to be created
  const stepNamespace: InputStep<NewProcessState> = async (input: MultiStepInput<NewProcessState>, state: NewProcessState) => {
    state.namespace = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose process namespace',
      placeholder: 'Enter Namespace separated by "/"',
      step: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.namespace,
      validationFunction: validateNamespace
    });
  };

  // Define step order
  const steps: InputStep<NewProcessState>[] = [stepProject, stepName, stepNamespace];

  const newProcessData: NewProcessState = {
    dialogTitle: `Add New ${kind}`,
    currentStep: 1,
    totalSteps: steps.length,
    name: '',
    namespace: '',
    projectSelection: undefined
  };

  await new MultiStepInput<NewProcessState>().stepThrough(steps, newProcessData);

  if (newProcessData.projectSelection && newProcessData.name && newProcessData.namespace) {
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
