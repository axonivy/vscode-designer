import path from 'path';
import { type QuickPickItem } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { HdInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { type AddCommandSelectionContext } from './ivy-project-explorer';
import type { InputStep, MSStateBase, ProjectSelection } from './utils/multi-step-input';
import {
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  resolveAddCommandSelectionContext
} from './utils/multi-step-input';
import { validateDotSeparatedName, validateProjectArtifactName } from './utils/util';

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
  project?: ProjectSelection | undefined;
  name?: string | undefined;
  namespace?: string | undefined;
  layout?: LayoutPick | undefined;
  template?: TemplatePick | undefined;
  projectFromSelection?: ProjectSelection | undefined;
}

const prepareAndValidateFinalState: (
  type: DialogType,
  state: NewUserDialogState
) => asserts state is NewUserDialogState & {
  project: ProjectSelection;
  name: string;
  namespace: string;
  layout: LayoutPick | undefined;
  template: TemplatePick | undefined;
} = (type, state) => {
  const ERROR_PREFIX = 'Invalid final input. Cannot create Dialog: ';

  if (state.project === undefined) {
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

export const addNewUserDialog = async (selectionContext: AddCommandSelectionContext, type: DialogType, pid?: string) => {
  const existingProjects = selectionContext.existingIvyProjects;
  const { projectFromSelection, namespaceFromSelection } = await resolveAddCommandSelectionContext(selectionContext, 'src_hd');

  const stepProject: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
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

  const stepName: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
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

  const stepNamespace: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
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
    namespace: typeof namespaceFromSelection === 'string' && namespaceFromSelection.trim() !== '' ? namespaceFromSelection : undefined,
    projectFromSelection: projectFromSelection
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
    projectDir: newUserDialogData.project.path,
    pid,
    layout: newUserDialogData.layout?.label,
    template: newUserDialogData.template?.label
  };
  await IvyEngineManager.instance.createUserDialog(createDialogInput);
};
