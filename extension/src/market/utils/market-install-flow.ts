import { l10n } from 'vscode';
import { logErrorMessage } from '../../base/logging-util';
import { IvyEngineManager } from '../../engine/engine-manager';
import {
  MultiStepCancelledError,
  MultiStepForceBack,
  type InputStep,
  type ProjectSelection
} from '../../project-explorer/utils/multi-step-input';
import type { InstallMarketProductState, ProductProjectSelection } from './market-install-types';
import {
  buildGroupedItems,
  isIvyProjectSelectionRequired,
  markProjectsForInstall,
  parseAvailableProjectItems,
  parseProduct,
  projectPathToProjectItem,
  validateDependencySelection,
  validateProjectSelection
} from './market-install-util';

export const createSteps = (
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
      titleSuffix: l10n.t('Choose Projects and Dependencies to install'),
      placeholder: l10n.t('Select projects to install'),
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
        titleSuffix: l10n.t('Choose Required Dependencies'),
        placeholder: l10n.t('Select required dependencies'),
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
    state.installProductJson = markProjectsForInstall(sourceProductJson, state.projects ?? []);
  };

  const stepDependentProject: InputStep<InstallMarketProductState> = async (input, state) => {
    if (!isIvyProjectSelectionRequired(state.projects ?? [])) {
      return;
    }
    if (existingProjectItems.length === 0) {
      throw new MultiStepCancelledError(
        l10n.t(
          'At least one existing Ivy project is required for installing this Market Product. No Axon Ivy projects in the workspace. Create an Axon Ivy project first.'
        )
      );
    }

    const hasRequiredItems =
      parseAvailableProjectItems(parseProduct(await getProductFromSource(state))).filter(item => item.requireOneOfGroup).length > 0;

    state.dependentProject = await input.showQuickPick<ProjectSelection>({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose Ivy Project to install Product into'),
      placeholder: l10n.t('Select one of the available projects'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.dependentProjectFilterText,
      items: existingProjectItems,
      onBack: typedValue => {
        state.dependentProjectFilterText = typedValue;
        state.forceBackRequiredStep = !hasRequiredItems;
      }
    });
  };

  return [stepProjects, stepRequiredDependencies, stepDependentProject];
};

export const executeInstall = async (productJson: string, dependentProjectPath: string): Promise<void> => {
  try {
    await IvyEngineManager.instance.installMarketProduct({
      productJson,
      dependentProjectPath
    });
  } catch (err) {
    logErrorMessage(l10n.t('Market installation failed: {0}', err instanceof Error ? err.message : String(err)));
  }
};
