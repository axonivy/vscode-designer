import path from 'path';
import { Uri, type QuickPickItem } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { HdInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import type { InputStep, MSStateBase, ProjectSelection } from './utils/multi-step-input';
import { MultiStepCancelledError, MultiStepInput, MultiStepInvalidStateError } from './utils/multi-step-input';
import { resolveNamespaceFromPath, validateDotSeparatedName, validateProjectArtifactName } from './utils/util';

export const dialogTypes = ['JSF', 'Form', 'JSFOffline'] as const;
export type DialogType = (typeof dialogTypes)[number];

const layouts = [
  'Page Responsive Grid 2 Columns',
  'Page Responsive Grid 4 Columns',
  'Page Responsive Top Labels',
  'Page Panel Grid',
  'Component',
  'Page'
] as const;
type Layout = (typeof layouts)[number];
interface LayoutPick extends QuickPickItem {
  label: Layout;
}

const templates = ['frame-10', 'frame-10-right', 'frame-10-full-width', 'basic-10'] as const;
type Template = (typeof templates)[number];
interface TemplatePick extends QuickPickItem {
  label: Template;
}

export type NewUserDialogParams = HdInit;

interface NewUserDialogState extends MSStateBase {
  projectSelection?: ProjectSelection | undefined;
  name?: string | undefined;
  namespace?: string | undefined;
  layout?: LayoutPick | undefined;
  template?: TemplatePick | undefined;
  projectSelectionFromPath?: ProjectSelection | undefined;
}

const prepareAndValidateFinalState: (
  type: DialogType,
  state: NewUserDialogState
) => asserts state is NewUserDialogState & {
  projectSelection: ProjectSelection;
  name: string;
  namespace: string;
  layout: LayoutPick | undefined;
  template: TemplatePick | undefined;
} = (type, state) => {
  const ERROR_PREFIX = 'Invalid final input. Cannot create Dialog: ';

  if (state.projectSelection === undefined) {
    throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Project selection cannot be null.');
  }
  if (state.name === undefined) {
    throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Dialog name cannot be null.');
  }
  if (state.namespace === undefined) {
    throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Namespace cannot be null.');
  }

  switch (type) {
    case 'JSF':
      if (state.layout === undefined) {
        throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Layout is required for JSF dialogs.');
      }
      if (state.template === undefined && state.layout.label !== 'Component') {
        throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Template is required for JSF dialogs with non-Component layouts.');
      }
      break;
    case 'Form':
      if (state.layout !== undefined) {
        throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Layout should not be set for Form dialogs.');
      }
      if (state.template !== undefined) {
        throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Template should not be set for Form dialogs.');
      }
      break;
    case 'JSFOffline':
      state.layout = { label: 'Page' };
      if (state.template !== undefined) {
        throw new MultiStepInvalidStateError(ERROR_PREFIX + 'Template should not be set for JSF Offline dialogs.');
      }
      break;
    default:
      throw new Error('Unsupported dialog type: ' + type);
  }
};

export const addNewUserDialog = async (type: DialogType, existingProjects: string[], pid?: string, uri?: Uri, projectPath?: string) => {
  // If supplied, use preselected URI and project path for project and namespace
  const projectSelectionFromPath = projectPath
    ? { label: projectPath.substring(projectPath.lastIndexOf(path.sep) + 1), description: projectPath, path: projectPath }
    : undefined;
  const namespaceFromPath = projectPath && uri ? await resolveNamespaceFromPath(uri, projectPath, 'src_hd') : undefined;

  const stepProject: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
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

  const stepName: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
    state.name = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose dialog name',
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

  const stepNamespace: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
    state.namespace = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: ' - Choose dialog namespace',
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

  const stepLayout: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
    state.layout = await input.showQuickPick<LayoutPick>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose layout',
      placeholder: 'Select one of the available layouts',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      items: layouts.map(layout => {
        return {
          label: layout
        };
      })
    });
  };

  const stepTemplate: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
    if (state.layout !== undefined && state.layout.label === 'Component') {
      return;
    } else {
      state.template = await input.showQuickPick<TemplatePick>({
        title: state.dialogTitle,
        titleSuffix: ' - Choose template',
        placeholder: 'Select one of the available templates',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        items: templates.map(template => {
          return {
            label: template
          };
        })
      });
    }
  };

  let steps: InputStep<NewUserDialogState>[];
  switch (type) {
    case 'Form':
      steps = [stepProject, stepName, stepNamespace];
      break;
    case 'JSFOffline':
      steps = [stepProject, stepName, stepNamespace];
      break;
    case 'JSF':
      steps = [stepProject, stepName, stepNamespace, stepLayout, stepTemplate];
      break;
    default:
      throw new Error('Unsupported dialog type: ' + type);
  }

  const newUserDialogData: NewUserDialogState = {
    dialogTitle: `Add New ${type}`,
    currentStep: 1,
    totalSteps: steps.length,
    namespace: typeof namespaceFromPath === 'string' && namespaceFromPath.trim() !== '' ? namespaceFromPath : undefined,
    projectSelectionFromPath: projectSelectionFromPath
  };

  try {
    await new MultiStepInput<NewUserDialogState>().stepThrough(steps, newUserDialogData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
      return;
    } else {
      throw err;
    }
  }

  // Let potential errors propagate without catching
  prepareAndValidateFinalState(type, newUserDialogData);
  const createDialogInput: NewUserDialogParams = {
    type,
    name: newUserDialogData.name,
    namespace: newUserDialogData.namespace,
    projectDir: newUserDialogData.projectSelection.path,
    pid,
    layout: newUserDialogData.layout?.label,
    template: newUserDialogData.template?.label
  };
  await IvyEngineManager.instance.createUserDialog(createDialogInput);
};
