import path from 'path';
import {
  LanguageModelTextPart,
  LanguageModelToolResult,
  MarkdownString,
  Uri,
  type LanguageModelTool,
  type LanguageModelToolInvocationOptions,
  type LanguageModelToolInvocationPrepareOptions,
  type PreparedToolInvocation,
  type ProviderResult
} from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { NewProjectParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import {
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  type InputStep,
  type MSStateBase
} from './utils/multi-step-input';
import { validateDotSeparatedName, validateProjectName } from './utils/util';

interface NewProjectState extends MSStateBase {
  projectName?: string | undefined;
  projectPath?: string | undefined;
  groupId?: string | undefined;
  projectId?: string | undefined;
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
    if (state.groupId === undefined) {
      if (state.projectName !== undefined) {
        const sanitizedProjectName = state.projectName?.replace(/-/g, '.');
        if (validateDotSeparatedName(sanitizedProjectName) === undefined) {
          state.groupId = sanitizedProjectName;
        }
      } else {
        state.groupId = '';
      }
    }
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
    if (state.projectId === undefined) {
      if (state.projectName !== undefined) {
        const sanitizedProjectName = state.projectName?.replace(/-/g, '.');
        if (validateDotSeparatedName(sanitizedProjectName) === undefined) {
          state.projectId = sanitizedProjectName;
        }
      } else {
        state.projectId = '';
      }
    }
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
    totalSteps: steps.length
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

  if (
    newProjectData.projectName !== undefined &&
    newProjectData.groupId !== undefined &&
    newProjectData.projectId !== undefined &&
    newProjectData.projectPath !== undefined
  ) {
    const createProjectInput: NewProjectParams & { path: string } = {
      name: newProjectData.projectName,
      groupId: newProjectData.groupId,
      projectId: newProjectData.projectId,
      path: newProjectData.projectPath
    };
    await IvyEngineManager.instance.createProject(createProjectInput);
  } else {
    throw new MultiStepInvalidStateError(
      'Project creation failed due to corrupted input state. Current input state: ' + JSON.stringify(newProjectData)
    );
  }
};

export type NewProjectToolArgs = {
  name: string;
  path: string;
  groupId: string;
  projectId: string;
};
export class NewProjectTool implements LanguageModelTool<NewProjectToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewProjectToolArgs>): Promise<LanguageModelToolResult> {
    const newProjectParams = { ...options.input, path: path.join(options.input.path, options.input.name) };
    await IvyEngineManager.instance.createProject(newProjectParams);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart('Project created successfully')]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewProjectToolArgs>): ProviderResult<PreparedToolInvocation> {
    return {
      invocationMessage: 'Creating new Axon Ivy project',
      confirmationMessages: {
        title: 'New Axon Ivy Project',
        message: new MarkdownString(
          `Create an Axon Ivy project with the following details?\n- Name: ${options.input.name}\n- Group ID: ${options.input.groupId}\n- Project ID: ${options.input.projectId}\n- Path: ${options.input.path}`
        )
      }
    };
  }
}
