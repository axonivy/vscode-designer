import { Disposable, QuickInput, QuickInputButtons, QuickPickItem, window } from 'vscode';
import { logInformationMessage } from '../../base/logging-util';
import { ValidationFunction } from './util';

export interface MSStateBase<P extends QuickPickItem = QuickPickItem> {
  dialogTitle: string;
  currentStep: number;
  totalSteps: number;
  [key: string]: string | number | P | undefined;
}

const enum InputFlowAction {
  back,
  cancel
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type InputStep<T extends MSStateBase> = (input: MultiStepInput<T>, state: T) => Thenable<InputStep<T> | void>;

interface TextInputParameters {
  title: string;
  titleSuffix?: string;
  step: number;
  totalSteps: number;
  value?: string;
  prompt?: string;
  placeholder?: string;
  validationFunction?: ValidationFunction;
  onBack?: (typedValue: string) => void;
  ignoreFocusOut?: boolean;
}

interface QuickPickParameters<P extends QuickPickItem> {
  title: string;
  titleSuffix?: string;
  step: number;
  totalSteps: number;
  items: P[];
  activeItem?: P;
  placeholder?: string;
  onBack?: (typedValue: P) => void;
  ignoreFocusOut?: boolean;
}

export class MultiStepInput<T extends MSStateBase> {
  private current?: QuickInput;
  private steps: InputStep<T>[] = [];

  async stepThrough(steps: InputStep<T>[], state: T) {
    let stepIndex = 0;
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    let step: InputStep<T> | void = steps[stepIndex];
    while (step) {
      this.steps.push(step);
      if (this.current) {
        this.current.enabled = false;
        this.current.busy = true;
      }
      try {
        await step(this, state);
        stepIndex++;
        step = steps[stepIndex];
        state.currentStep++;
      } catch (err) {
        if (err === InputFlowAction.back) {
          state.currentStep--;
          this.steps.pop();
          stepIndex = Math.max(0, stepIndex - 1);
          step = steps[stepIndex];
        } else if (err === InputFlowAction.cancel) {
          logInformationMessage('MultiStepInput: User cancelled the input flow');
          return;
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
    step,
    totalSteps,
    value,
    prompt,
    validationFunction,
    onBack,
    ignoreFocusOut,
    placeholder
  }: TextInputParameters): Promise<string> {
    const disposables: Disposable[] = [];

    // Create the Promise that is resolved/rejected based on the event listeners
    const p = new Promise<string>((resolve, reject) => {
      const input = window.createInputBox();
      input.title = title + (titleSuffix ?? '');
      input.step = step;
      input.totalSteps = totalSteps;
      input.value = value ?? '';
      input.prompt = prompt ?? '';
      input.placeholder = placeholder ?? '';
      input.ignoreFocusOut = ignoreFocusOut ?? true;
      input.buttons = this.steps.length > 1 ? [QuickInputButtons.Back] : [];
      disposables.push(
        input.onDidTriggerButton(item => {
          // If the back button is pressed. No other buttons are expected.
          if (item === QuickInputButtons.Back) {
            onBack?.(input.value);
            reject(InputFlowAction.back);
          }
        }),
        input.onDidAccept(async () => {
          input.enabled = false;
          input.busy = true;
          // If validationFunction is not provided, consider the input valid
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
    step,
    totalSteps,
    activeItem,
    items,
    ignoreFocusOut,
    placeholder
  }: QuickPickParameters<T>): Promise<T> {
    const disposables: Disposable[] = [];

    // Create the Promise that is resolved/rejected based on the event listeners
    const p = new Promise<T>((resolve, reject) => {
      const input = window.createQuickPick<T>();
      input.title = title + (titleSuffix ?? '');
      input.step = step;
      input.totalSteps = totalSteps;
      input.ignoreFocusOut = ignoreFocusOut ?? true;
      input.placeholder = placeholder ?? '';
      input.items = items;
      if (activeItem) {
        input.activeItems = [activeItem];
        input.selectedItems = [activeItem];
        input.value = activeItem.label;
      }
      input.buttons = this.steps.length > 1 ? [QuickInputButtons.Back] : [];
      disposables.push(
        input.onDidTriggerButton(item => {
          // If the back button is pressed. No other buttons are expected.
          if (item === QuickInputButtons.Back) {
            reject(InputFlowAction.back);
          }
        }),
        input.onDidChangeSelection(items => {
          if (items.length === 0) {
            throw new Error('No item selected, but onDidChangeSelection was triggered');
          } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            resolve(items[0]);
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
