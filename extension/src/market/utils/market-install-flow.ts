import { logErrorMessage } from '../../base/logging-util';
import type { ProductInstallParams } from '../../engine/api/generated/client';
import { IvyEngineManager } from '../../engine/engine-manager';
import {
  MultiStepCancelledError,
  MultiStepForceBack,
  MultiStepInvalidStateError,
  type InputStep,
  type ProjectSelection
} from '../../project-explorer/utils/multi-step-input';
import type { InstallMarketProductState, ProductProjectSelection } from './market-install-types';
import {
  buildGroupedItems,
  isIvyProjectSelectionRequired,
  markProjectsForImport,
  parseAvailableProjectItems,
  parseProduct,
  projectPathToProjectItem,
  validateDependencySelection,
  validateProjectSelection
} from './market-install-util';

export const createInstallSteps = (
  existingProjects: string[],
  getProductFromSource: (state: InstallMarketProductState) => Promise<string>
): InputStep<InstallMarketProductState>[] => {
  const existingProjectItems = projectPathToProjectItem(existingProjects);

  const stepProjects: InputStep<InstallMarketProductState> = async (input, state) => {
    state.forceBackRequiredStep = false;

    const product = parseProduct(await getProductFromSource(state));
    const projectItems = parseAvailableProjectItems(product).filter(item => !item.requireOneOfGroup);
    let initialProjectSelection: ProductProjectSelection[] | undefined;
    if (!state.changedProjectSelection) {
      initialProjectSelection = projectItems.filter(project => project.isPicked);
      state.changedProjectSelection = true;
    }

    const selectedProjects = await input.showQuickPick<ProductProjectSelection, true>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Projects and Dependencies to Import',
      placeholder: 'Select projects to import',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      canSelectMany: true,
      value: state.projectsSearchString,
      validationFunction: selectedItems => validateProjectSelection(selectedItems, existingProjectItems),
      items: projectItems,
      selectedItems: initialProjectSelection ?? state.projects?.filter(project => !project.requireOneOfGroup) ?? [],
      onBack: (typedValue, selectedItems) => {
        state.projectsSearchString = typedValue;
        state.projects = [...selectedItems, ...(state.projects?.filter(project => project.requireOneOfGroup) ?? [])];
      }
    });
    state.projects = [...selectedProjects, ...(state.projects?.filter(project => project.requireOneOfGroup) ?? [])];
  };

  const stepRequiredDependencies: InputStep<InstallMarketProductState> = async (input, state) => {
    if (state.forceBackRequiredStep) {
      throw new MultiStepForceBack();
    }

    const sourceProductJson = await getProductFromSource(state);
    const requiredItems = parseAvailableProjectItems(parseProduct(sourceProductJson)).filter(item => item.requireOneOfGroup);
    if (requiredItems.length > 0) {
      const selectedRequired = await input.showQuickPick<ProductProjectSelection, true>({
        title: state.dialogTitle,
        titleSuffix: ' - Choose Required Dependencies',
        placeholder: 'Select required dependencies',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        canSelectMany: true,
        value: state.projectsSearchString,
        items: buildGroupedItems(requiredItems),
        selectedItems: state.projects?.some(project => project.requireOneOfGroup)
          ? state.projects.filter(project => project.requireOneOfGroup)
          : requiredItems.filter(item => item.isPicked),
        validationFunction: selectedItems => validateDependencySelection(requiredItems, selectedItems),
        onBack: (typedValue, selectedItems) => {
          state.projectsSearchString = typedValue;
          state.projects = [...(state.projects?.filter(project => !project.requireOneOfGroup) ?? []), ...selectedItems];
        }
      });
      state.projects = [...(state.projects?.filter(project => !project.requireOneOfGroup) ?? []), ...selectedRequired];
    }
    state.installProductJson = markProjectsForImport(sourceProductJson, state.projects ?? []);
  };

  const stepDependentProject: InputStep<InstallMarketProductState> = async (input, state) => {
    if (!isIvyProjectSelectionRequired(state.projects ?? [])) {
      return;
    }
    if (existingProjectItems.length === 0) {
      throw new MultiStepCancelledError(
        'At least one existing Ivy project is required for installing this Market Product. No Axon Ivy projects in the workspace. Create an Axon Ivy project first.'
      );
    }

    state.dependentProject = await input.showQuickPick<ProjectSelection>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Ivy Project to install Product into',
      placeholder: 'Select one of the available projects',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.dependentProjectFilterText,
      items: existingProjectItems,
      onBack: typedValue => {
        state.dependentProjectFilterText = typedValue;
        state.forceBackRequiredStep = true;
      }
    });
  };

  return [stepProjects, stepRequiredDependencies, stepDependentProject];
};

export const finishMarketProductInstallation = async (
  state: InstallMarketProductState,
  transformProductJson: (productJson: string) => string = productJson => productJson
): Promise<void> => {
  if (!state.installProductJson) {
    throw new MultiStepInvalidStateError(
      'Market Product installation failed due to corrupted input state. InstallProductJson is not set. Current input state: ' +
        JSON.stringify(state)
    );
  }

  try {
    const installMarketProductInput: ProductInstallParams = {
      productJson: transformProductJson(state.installProductJson),
      dependentProjectPath: state.dependentProject?.path ?? ''
    };
    await IvyEngineManager.instance.installMarketProduct(installMarketProductInput);
  } catch (err) {
    logErrorMessage('Market installation failed: ' + (err instanceof Error ? err.message : err));
  }
};

export const executeInstall = async (productJson: string, dependentProjectPath: string): Promise<void> => {
  try {
    await IvyEngineManager.instance.installMarketProduct({
      productJson,
      dependentProjectPath
    });
  } catch (err) {
    logErrorMessage('Market installation failed: ' + (err instanceof Error ? err.message : err));
  }
};
