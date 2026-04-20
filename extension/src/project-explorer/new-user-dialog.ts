import path from 'path';
import { Uri, type QuickPickItem } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { HdInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import type { InputStep, MSStateBase, ProjectSelection } from './utils/multi-step-input';
import { MultiStepCancelledError, MultiStepInput } from './utils/multi-step-input';
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
  label: Layout | '';
}

const templates = ['frame-10', 'frame-10-right', 'frame-10-full-width', 'basic-10'] as const;
type Template = (typeof templates)[number];
interface TemplatePick extends QuickPickItem {
  label: Template | '';
}

export type NewUserDialogParams = HdInit;

interface NewUserDialogState extends MSStateBase {
  projectSelection: ProjectSelection;
  name: string;
  namespace: string;
  layout: LayoutPick;
  template: TemplatePick;
  projectSelectionFromPath?: ProjectSelection;
}

export const addNewUserDialog = async (type: DialogType, existingProjects: string[], pid?: string, uri?: Uri, projectPath?: string) => {
  // If supplied, use preselected URI and project path for project and namespace
  const projectSelectionFromPath = projectPath
    ? { label: projectPath.substring(projectPath.lastIndexOf(path.sep) + 1), description: projectPath, path: projectPath }
    : undefined;
  const namespaceFromPath = projectPath && uri ? await resolveNamespaceFromPath(uri, projectPath, 'processes') : undefined;

  const stepProject: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
    if (state.projectSelectionFromPath && (state.projectSelection.label === '' || state.projectSelection.label === undefined)) {
      state.projectSelection = state.projectSelectionFromPath;
      state.projectSelectionFromPath = undefined;
    } else {
      state.projectSelection = await input.showQuickPick({
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
      // TODO: Confusion about namespace with dot vs slash. Here, empty input should be allowed, this creates the dialog directly under "src_hc"
      // TODO: What is the rule, when is the input dot vs slash separated?
      // IMO: Is used in new-project.ts for GroupID and ArtifactID (cannot be empty), but here and in new-data-class.ts it is used for the folder path namespace, which should be validateNamespace and use "/"?
      validationFunction: validateDotSeparatedName,
      onBack: (typedValue: string) => {
        state.namespace = typedValue;
      }
    });
  };

  const stepLayout: InputStep<NewUserDialogState> = async (input: MultiStepInput<NewUserDialogState>, state: NewUserDialogState) => {
    state.layout = await input.showQuickPick({
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
    state.template = await input.showQuickPick({
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
  };

  const steps = [stepProject, stepName, stepNamespace, stepLayout, stepTemplate];

  const newUserDialogData: NewUserDialogState = {
    dialogTitle: `Add New ${type}`,
    currentStep: 1,
    totalSteps: steps.length,
    name: '',
    namespace: typeof namespaceFromPath === 'string' && namespaceFromPath.trim() !== '' ? namespaceFromPath : '',
    layout: {} as LayoutPick,
    template: {} as TemplatePick,
    projectSelection: {} as ProjectSelection,
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

  const createDialogInput: NewUserDialogParams = {
    type,
    name: newUserDialogData.name,
    namespace: newUserDialogData.namespace,
    layout: newUserDialogData.layout.label,
    template: newUserDialogData.template.label,
    projectDir: newUserDialogData.projectSelection.path,
    pid
  };

  await IvyEngineManager.instance.createUserDialog(createDialogInput);
};
