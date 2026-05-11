import path from 'path';
import type { QuickInput, QuickPickItem } from 'vscode';
import { Disposable, QuickInputButtons, Uri, window } from 'vscode';
import { type AddCommandSelectionContext } from '../ivy-project-explorer';
import { resolveNamespaceFromPath, type ResourceDirectoryTarget } from './util';

export class MultiStepCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepCancelledError';
  }
}

export class MultiStepInvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiStepInvalidStateError';
  }
}

export interface MSStateBase {
  dialogTitle: string;
  currentStep: number;
  totalSteps: number;
}

const enum InputFlowAction {
  back,
  cancel,
  abortEmptySelection
}

export interface ProjectSelection extends QuickPickItem {
  label: string;
  description: string;
  path: string;
}

export const resolveAddCommandSelectionContext = async (
  selectionContext: AddCommandSelectionContext,
  resourceDirectoryTarget: ResourceDirectoryTarget
): Promise<{
  projectFromSelection: ProjectSelection | undefined;
  namespaceFromSelection: string | undefined;
}> => {
  const { projectPathSelection: projectPathFromSelection, uriSelection: uriFromSelection } = selectionContext;
  if (!projectPathFromSelection || projectPathFromSelection === '') {
    return { projectFromSelection: undefined, namespaceFromSelection: undefined };
  }
  const projectFromSelection: ProjectSelection = {
    label: projectPathFromSelection.substring(projectPathFromSelection.lastIndexOf(path.sep) + 1),
    description: projectPathFromSelection,
    path: projectPathFromSelection
  };
  if (!uriFromSelection) {
    return { projectFromSelection: projectFromSelection, namespaceFromSelection: undefined };
  }
  const namespaceFromSelection = await resolveNamespaceFromPath(uriFromSelection, projectPathFromSelection, resourceDirectoryTarget);
  return { projectFromSelection, namespaceFromSelection };
};

type StateWithProjectAndNamespace = MSStateBase & {
  project: ProjectSelection;
  namespace: string;
};

function stateHasProjectAndNamespace(state: MSStateBase): state is StateWithProjectAndNamespace {
  return 'project' in state && 'namespace' in state;
}

export const overrideProjectDefaultNamespaceIfAllowed = async <S extends MSStateBase>(
  state: S,
  previousProject: ProjectSelection | undefined,
  resourceDirectoryTarget: ResourceDirectoryTarget,
  validationFunction: (namespace: string) => string | undefined
): Promise<void> => {
  if (!stateHasProjectAndNamespace(state)) {
    return;
  }
  if (previousProject === undefined || state.project.path !== previousProject.path) {
    const projectDefaultNamespace = await resolveNamespaceFromPath(
      Uri.file(state.project.path),
      state.project.path,
      resourceDirectoryTarget
    );
    if (validationFunction(projectDefaultNamespace) === undefined) {
      state.namespace = projectDefaultNamespace;
    }
  }
  return;
};

export type InputStep<T extends MSStateBase> = (input: MultiStepInput<T>, state: T) => Thenable<InputStep<T>> | Promise<void>;

interface TextInputParameters {
  title: string;
  titleSuffix?: string;
  currentStep: number;
  totalSteps: number;
  value?: string;
  prompt?: string;
  placeholder?: string;
  validationFunction?: (value: string) => string | undefined;
  onBack?: (typedValue: string) => void;
  ignoreFocusOut?: boolean;
}

interface BaseQuickPickParameters<P extends QuickPickItem> {
  title: string;
  titleSuffix?: string;
  currentStep: number;
  totalSteps: number;
  value?: string;
  canSelectMany?: boolean;
  items: P[];
  selectedItems?: P[];
  placeholder?: string;
  ignoreFocusOut?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  onBack?: (typedValue: string, selectedItems: P[]) => void;
}

interface SingleQuickPickParameters<P extends QuickPickItem> extends BaseQuickPickParameters<P> {
  canSelectMany?: false;
}
interface MultiQuickPickParameters<P extends QuickPickItem> extends BaseQuickPickParameters<P> {
  canSelectMany: true;
}

type QuickPickResult<T, M extends boolean> = M extends true ? T[] : T;

export class MultiStepInput<T extends MSStateBase> {
  private current?: QuickInput;
  private currentStep: InputStep<T> | undefined;
  async stepThrough(steps: InputStep<T>[], state: T) {
    if (steps.length === 0) {
      return;
    }
    let stepIndex = 0;
    this.currentStep = steps[stepIndex];
    while (this.currentStep) {
      if (this.current) {
        this.current.enabled = false;
        this.current.busy = true;
      }
      try {
        await this.currentStep(this, state);
        stepIndex++;
        state.currentStep = stepIndex + 1;
        this.currentStep = steps[stepIndex];
      } catch (err) {
        if (err == InputFlowAction.back) {
          stepIndex = Math.max(0, stepIndex - 1);
          state.currentStep = stepIndex + 1;
          this.currentStep = steps[stepIndex];
        } else if (err == InputFlowAction.cancel) {
          throw new MultiStepCancelledError('Dialog cancelled by the user');
        } else if (err == InputFlowAction.abortEmptySelection) {
          this.current?.hide();
          throw new MultiStepCancelledError('Selection was empty, dialog aborted');
        } else {
          this.current?.hide();
          throw err;
        }
      }
    }
    if (this.current) {
      this.current.dispose();
    }
  }

  async showTextInput({
    title,
    titleSuffix,
    currentStep,
    totalSteps,
    value,
    prompt,
    validationFunction,
    onBack,
    ignoreFocusOut,
    placeholder
  }: TextInputParameters): Promise<string> {
    const disposables: Disposable[] = [];

    const p = new Promise<string>((resolve, reject) => {
      const input = window.createInputBox();
      input.title = title + (titleSuffix ?? '');
      input.step = currentStep;
      input.totalSteps = totalSteps;
      input.value = value ?? '';
      input.prompt = prompt ?? '';
      input.placeholder = placeholder ?? '';
      input.ignoreFocusOut = ignoreFocusOut ?? true;
      input.buttons = currentStep > 1 ? [QuickInputButtons.Back] : [];
      input.validationMessage = validationFunction ? validationFunction(input.value) : '';
      disposables.push(
        input.onDidTriggerButton(item => {
          if (item === QuickInputButtons.Back) {
            onBack?.(input.value);
            reject(InputFlowAction.back);
          }
        }),
        input.onDidAccept(async () => {
          input.enabled = false;
          input.busy = true;
          const validationResult = validationFunction ? validationFunction(input.value) : '';
          if (validationResult) {
            input.validationMessage = validationResult;
          } else {
            resolve(input.value);
          }
          input.enabled = true;
          input.busy = false;
        }),
        input.onDidHide(() => {
          reject(InputFlowAction.cancel);
        }),
        input.onDidChangeValue(async () => {
          const validationResult = validationFunction ? validationFunction(input.value) : '';
          if (validationResult) {
            input.validationMessage = validationResult;
          } else {
            input.validationMessage = '';
          }
        })
      );
      if (this.current) {
        this.current.dispose();
      }
      this.current = input;
      this.current.show();
    });

    try {
      return await p;
    } finally {
      disposables.forEach(d => d.dispose());
    }
  }

  async showQuickPick<T extends QuickPickItem, M extends boolean = false>(
    params: M extends true ? MultiQuickPickParameters<T> : SingleQuickPickParameters<T>
  ): Promise<QuickPickResult<T, M>> {
    const disposables: Disposable[] = [];

    const p = new Promise<QuickPickResult<T, M>>((resolve, reject) => {
      const input = window.createQuickPick<T>();
      input.title = params.title + (params.titleSuffix ?? '');
      input.step = params.currentStep;
      input.totalSteps = params.totalSteps;
      input.ignoreFocusOut = params.ignoreFocusOut ?? true;
      input.value = params.value ?? '';
      input.canSelectMany = params.canSelectMany ?? false;
      input.placeholder = params.placeholder ?? '';
      input.items = params.items;
      input.matchOnDescription = params.matchOnDescription ?? false;
      input.matchOnDetail = params.matchOnDetail ?? false;
      if (params.canSelectMany) {
        if (params.selectedItems) {
          input.selectedItems = params.items.filter(item => params.selectedItems?.some(selected => selected.label === item.label));
        }
      }
      input.buttons = params.currentStep > 1 ? [QuickInputButtons.Back] : [];
      disposables.push(
        input.onDidTriggerButton(item => {
          if (item === QuickInputButtons.Back) {
            params.onBack?.(input.value, input.selectedItems as T[]);
            reject(InputFlowAction.back);
          }
        }),
        input.onDidAccept(() => {
          if (params.canSelectMany) {
            if (input.selectedItems.length === 0) {
              reject(InputFlowAction.abortEmptySelection);
              return;
            }
            resolve(input.selectedItems as QuickPickResult<T, M>);
          }
        }),
        input.onDidChangeSelection(items => {
          if (!params.canSelectMany && items.length === 1 && items[0]) {
            resolve(items[0] as QuickPickResult<T, M>);
          } else if (params.canSelectMany) {
            return;
          } else {
            return;
          }
        }),
        input.onDidHide(() => {
          reject(InputFlowAction.cancel);
        })
      );
      this.current?.dispose();
      this.current = input;
      this.current.show();
    });

    try {
      return await p;
    } finally {
      disposables.forEach(d => d.dispose());
    }
  }
}
