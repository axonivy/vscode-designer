import type { QuickInput, QuickPickItem } from 'vscode';
import { Disposable, QuickInputButtons, window } from 'vscode';

export interface MSStateBase {
  dialogTitle: string;
  currentStep: number;
  totalSteps: number;
}

const enum InputFlowAction {
  back,
  cancel
}

export type InputStep<T extends MSStateBase> = {
  execCounter?: number;
  (input: MultiStepInput<T>, state: T): Thenable<InputStep<T>> | Promise<void>;
};

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

interface QuickPickParameters<P extends QuickPickItem> {
  title: string;
  titleSuffix?: string;
  currentStep: number;
  totalSteps: number;
  items: P[];
  activeItem?: P;
  placeholder?: string;
  onBack?: (typedValue: P) => void;
  ignoreFocusOut?: boolean;
}

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
        if (this.currentStep.execCounter !== undefined) {
          this.currentStep.execCounter++;
        }
        stepIndex++;
        state.currentStep = stepIndex + 1;
        this.currentStep = steps[stepIndex];
      } catch (err) {
        if (err == InputFlowAction.back) {
          stepIndex = Math.max(0, stepIndex - 1);
          state.currentStep = stepIndex + 1;
          this.currentStep = steps[stepIndex];
        } else if (err == InputFlowAction.cancel) {
          throw new Error('Dialog cancelled by the user');
        } else {
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

  async showQuickPick<T extends QuickPickItem>({
    title,
    titleSuffix,
    currentStep,
    totalSteps,
    activeItem,
    items,
    ignoreFocusOut,
    placeholder
  }: QuickPickParameters<T>): Promise<T> {
    const disposables: Disposable[] = [];

    const p = new Promise<T>((resolve, reject) => {
      const input = window.createQuickPick<T>();
      input.title = title + (titleSuffix ?? '');
      input.step = currentStep;
      input.totalSteps = totalSteps;
      input.ignoreFocusOut = ignoreFocusOut ?? true;
      input.placeholder = placeholder ?? '';
      input.items = items;
      if (activeItem) {
        input.activeItems = [activeItem];
        input.selectedItems = [activeItem];
        input.value = activeItem.label;
      }
      input.buttons = currentStep > 1 ? [QuickInputButtons.Back] : [];
      disposables.push(
        input.onDidTriggerButton(item => {
          if (item === QuickInputButtons.Back) {
            reject(InputFlowAction.back);
          }
        }),
        input.onDidChangeSelection(items => {
          if (items.length === 1 && items[0]) {
            resolve(items[0]);
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
