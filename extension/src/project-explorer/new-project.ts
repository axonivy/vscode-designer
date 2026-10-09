import path from 'path';
import { l10n, Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { CreateProjectParams } from '../engine/api/engine-api';
import type { ProjectBean } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import {
  type InputStep,
  type MSStateBase,
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError
} from './utils/multi-step-input';
import { validateDotSeparatedName, validateProjectArtifactId, validateProjectName as validateProjectNameSyntax } from './utils/util';

interface NewProjectState extends MSStateBase {
  projectName?: string | undefined;
  projectPath?: string | undefined;
  groupId?: string | undefined;
  projectId?: string | undefined;
}

export const addNewProject = async (selectedUri: Uri) => {
  const validateProjectName = (typedProjectName: string): string | undefined => {
    return validateProjectNameSyntax(typedProjectName) ?? validateNotExisting(typedProjectName, selectedUri, deployedProjects);
  };

  const validateNotExisting = (typedProjectName: string, selectedUri: Uri, existingProjects: ProjectBean[]): string | undefined => {
    if (existingProjects.some(project => project.id.name === typedProjectName)) {
      return l10n.t('A project with this name already exists in the workspace or as a Maven dependency.');
    }
    const typedProjectPath = path.join(selectedUri.fsPath, typedProjectName);
    if (existingProjects.some(project => project.projectDirectory === typedProjectPath)) {
      return l10n.t('A project with this path already exists in the workspace or as a Maven dependency.');
    }
  };

  const stepProjectName: InputStep<NewProjectState> = async (input: MultiStepInput<NewProjectState>, state: NewProjectState) => {
    state.projectName = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose project name'),
      placeholder: l10n.t('Enter a project name. Allowed characters: a-z, A-Z, 0-9, _, -'),
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
        if (validateDotSeparatedName(sanitizedProjectName, 'Group ID') === undefined) {
          state.groupId = sanitizedProjectName;
        }
      } else {
        state.groupId = '';
      }
    }
    state.groupId = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose a Group ID'),
      placeholder: l10n.t('Enter a Group ID (e.g. com.domain.one). Allowed characters: a-z, A-Z, 0-9, _'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.groupId,
      validationFunction: (value: string) => validateDotSeparatedName(value, 'Group ID'),
      onBack: (typedValue: string) => {
        state.groupId = typedValue;
      }
    });
  };

  const stepProjectId: InputStep<NewProjectState> = async (input: MultiStepInput<NewProjectState>, state: NewProjectState) => {
    if (state.projectId === undefined) {
      if (state.projectName !== undefined) {
        const sanitizedProjectName = state.projectName?.replace(/-/g, '.');
        if (validateProjectArtifactId(sanitizedProjectName) === undefined) {
          state.projectId = sanitizedProjectName;
        }
      } else {
        state.projectId = '';
      }
    }
    state.projectId = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose an Artifact ID'),
      placeholder: l10n.t('Enter an Artifact ID (e.g. another-project-id). Allowed characters: a-z, A-Z, 0-9, _'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.projectId,
      validationFunction: (value: string) => validateProjectArtifactId(value),
      onBack: (typedValue: string) => {
        state.projectId = typedValue;
      }
    });
  };

  const deployedProjects = (await IvyEngineManager.instance.projects()) ?? [];

  const steps: InputStep<NewProjectState>[] = [stepProjectName, stepGroupId, stepProjectId];
  const newProjectData: NewProjectState = {
    dialogTitle: l10n.t('New Axon Ivy Project'),
    currentStep: 1,
    totalSteps: steps.length
  };

  try {
    await new MultiStepInput<NewProjectState>().stepThrough(steps, newProjectData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      if (err.message.trim()) {
        logErrorMessage(err.message);
      }
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
    const createProjectInput: CreateProjectParams = {
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
