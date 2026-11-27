import { beforeEach, expect, test, vi } from 'vitest';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase } from './multi-step-input';

const mocks = vi.hoisted(() => {
  const disposables = { dispose: vi.fn() };
  const hideListeners: Array<() => void> = [];
  const inputBox = {
    value: '',
    show: vi.fn(() => hideListeners.forEach(listener => listener())),
    dispose: vi.fn(),
    onDidTriggerButton: vi.fn(() => disposables),
    onDidAccept: vi.fn(() => disposables),
    onDidHide: vi.fn((listener: () => void) => {
      hideListeners.push(listener);
      return disposables;
    }),
    onDidChangeValue: vi.fn(() => disposables)
  };
  return { inputBox };
});

vi.mock('vscode', () => ({
  InputBoxValidationSeverity: { Error: 0, Warning: 1 },
  QuickInputButtons: { Back: {} },
  Uri: { file: vi.fn() },
  l10n: { t: (message: string) => message },
  window: {
    createInputBox: () => mocks.inputBox
  }
}));

vi.mock('../../base/logging-util', () => ({ logErrorMessage: vi.fn() }));
vi.mock('../ivy-project-explorer', () => ({}));
vi.mock('./util', () => ({ resolveNamespaceFromPath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

test('disposes the active input when the multi-step flow is cancelled', async () => {
  const state: MSStateBase = { dialogTitle: 'Create project', currentStep: 1, totalSteps: 1 };
  const step: InputStep<MSStateBase> = async input => {
    await input.showTextInput({
      title: state.dialogTitle,
      currentStep: state.currentStep,
      totalSteps: state.totalSteps
    });
  };

  await expect(new MultiStepInput<MSStateBase>().stepThrough([step], state)).rejects.toBeInstanceOf(MultiStepCancelledError);
  expect(mocks.inputBox.dispose).toHaveBeenCalledOnce();
});
