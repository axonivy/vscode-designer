import path from 'path';
import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ProductInstallParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import type { AddCommandSelectionContext } from '../project-explorer/ivy-project-explorer';
import {
  MultiStepCancelledError,
  MultiStepForceBack,
  MultiStepInput,
  MultiStepInvalidStateError,
  type InputStep,
  type ProjectSelection
} from '../project-explorer/utils/multi-step-input';
import { fetchInstaller, getAvailableVersions, getBestVersion, searchMarketProduct } from './utils/market-client';
import type { InstallMarketProductState, ProductProjectSelection, ProductSelection } from './utils/market-install-types';
import {
  buildGroupedItems,
  isIvyProjectSelectionRequired,
  markProjectsForImport,
  parseAvailableProjectItems,
  parseProduct,
  validateDependencySelection,
  validateProjectSelection
} from './utils/market-install-util';

export const installMarketProduct = async (selectionContext: AddCommandSelectionContext, engineVersion: string) => {
  const existingProjects = selectionContext.existingIvyProjects.map(project => ({
    label: path.basename(project),
    description: project,
    path: project
  }));
  let projectFromSelection = selectionContext.projectPathSelection;
  const allProducts = await searchMarketProduct();

  const stepProduct: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const previousProduct = state.product;
    state.product = await input.showQuickPick<ProductSelection>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose available Market Product',
      placeholder: 'Select a Market Product to install',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.product ? state.product.label : '',
      matchOnDescription: true,
      matchOnDetail: true,
      items: allProducts.map(product => ({
        id: product.id,
        label: product.name,
        description: product.id,
        detail: product.description,
        iconPath: Uri.parse(product.logoUrl)
      }))
    });
    if (previousProduct?.id !== state.product?.id) {
      state.projects = undefined;
      state.version = undefined;
      state.productJson = undefined;
      state.sourceProductJson = undefined;
    }
  };

  const stepVersion: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const availableVersions = state.product ? await getAvailableVersions(state.product.id ?? '', engineVersion) : [];
    if (availableVersions.length === 0) {
      throw new Error(
        `No available product versions found that satisfy your engine version.Your current Ivy Engine version: ${engineVersion}. Please update your Ivy Engine.`
      );
    }
    const bestVersion = await getBestVersion(state.product?.id ?? '', engineVersion);

    const previousVersion = state.version;
    const version = await input.showQuickPick({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Version',
      placeholder: 'Select a Market Product version to install',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.version ?? (availableVersions.includes(bestVersion) ? bestVersion : ''),
      items: availableVersions.map(version => ({ label: version })),
      onBack: (typedValue: string) => {
        state.version = typedValue;
      }
    });
    state.version = version.label;
    if (previousVersion !== state.version) {
      state.projects = undefined;
      state.productJson = undefined;
      state.sourceProductJson = undefined;
    }
  };

  const stepProjects: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    state.forceBackRequiredStep = false;

    const sourceProductJson = state.sourceProductJson ?? (await fetchInstaller(state.product?.id ?? '', state.version ?? ''));
    state.sourceProductJson = sourceProductJson;
    const product = parseProduct(sourceProductJson);
    const allItems = parseAvailableProjectItems(product);
    const projectItems = allItems.filter(item => !item.requireOneOfGroup);
    let initialProjectSelection: ProductProjectSelection[] | undefined = undefined;
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
      validationFunction: (selectedItems: Array<ProductProjectSelection>) => validateProjectSelection(selectedItems, existingProjects),
      items: projectItems,
      selectedItems: initialProjectSelection ?? state.projects?.filter(p => !p.requireOneOfGroup) ?? [],
      onBack: (typedValue: string, selectedItems: ProductProjectSelection[]) => {
        state.projectsSearchString = typedValue;
        state.projects = [...selectedItems, ...(state.projects?.filter(p => p.requireOneOfGroup) ?? [])];
      }
    });
    state.projects = [...selectedProjects, ...(state.projects?.filter(p => p.requireOneOfGroup) ?? [])];
  };

  const stepRequiredDependencies: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    if (state.forceBackRequiredStep) {
      throw new MultiStepForceBack();
    }
    const sourceProductJson = state.sourceProductJson ?? (await fetchInstaller(state.product?.id ?? '', state.version ?? ''));
    state.sourceProductJson = sourceProductJson;
    const product = parseProduct(sourceProductJson);
    const allItems = parseAvailableProjectItems(product);
    const requiredItems = allItems.filter(item => item.requireOneOfGroup);
    if (requiredItems.length === 0) {
      state.productJson = markProjectsForImport(sourceProductJson, state.projects ?? []);
      return;
    }

    const groupedItems = buildGroupedItems(requiredItems);
    const selectedRequired = await input.showQuickPick<ProductProjectSelection, true>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Required Dependencies',
      placeholder: 'Select required dependencies',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      canSelectMany: true,
      value: state.projectsSearchString,
      items: groupedItems,
      selectedItems: state.projects?.some(p => p.requireOneOfGroup)
        ? state.projects.filter(p => p.requireOneOfGroup)
        : requiredItems.filter(item => item.isPicked),
      validationFunction: (selectedItems: ProductProjectSelection[]) => {
        return validateDependencySelection(requiredItems, selectedItems);
      },
      onBack: (typedValue: string, selectedItems: ProductProjectSelection[]) => {
        state.projectsSearchString = typedValue;
        state.projects = [...(state.projects?.filter(p => !p.requireOneOfGroup) ?? []), ...selectedItems];
      }
    });
    state.projects = [...(state.projects?.filter(p => !p.requireOneOfGroup) ?? []), ...selectedRequired];
    state.productJson = markProjectsForImport(sourceProductJson, state.projects);
  };

  const stepDependentProject: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    if (!isIvyProjectSelectionRequired(state.projects ?? [])) {
      return;
    } else {
      if (existingProjects.length === 0) {
        throw new MultiStepCancelledError(
          'At least one existing Ivy project is required for installing this Market Product. No Axon Ivy projects in the workspace. Create an Axon Ivy project first.'
        );
      }
    }

    let dependentProjectFilterText: string | undefined = undefined;
    if (projectFromSelection) {
      dependentProjectFilterText = projectFromSelection.substring(projectFromSelection.lastIndexOf(path.sep) + 1);
      projectFromSelection = undefined;
    }
    state.dependentProject = await input.showQuickPick<ProjectSelection>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Ivy Project to install Product into',
      placeholder: 'Select one of the available projects',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: dependentProjectFilterText ?? state.dependentProjectFilterText,
      items: existingProjects,
      onBack: (typedValue: string) => {
        state.dependentProjectFilterText = typedValue;
        state.forceBackRequiredStep = true;
      }
    });
  };

  const steps: InputStep<InstallMarketProductState>[] = [
    stepProduct,
    stepVersion,
    stepProjects,
    stepRequiredDependencies,
    stepDependentProject
  ];

  const installMarketProductData: InstallMarketProductState = {
    dialogTitle: 'Install Market Product',
    currentStep: 1,
    totalSteps: steps.length,
    changedProjectSelection: false,
    forceBackRequiredStep: false
  };

  try {
    await new MultiStepInput<InstallMarketProductState>().stepThrough(steps, installMarketProductData);
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

  if (!installMarketProductData.productJson) {
    throw new MultiStepInvalidStateError(
      'Market Product installation failed due to corrupted input state. ProductJson is not set. Current input state: ' +
        JSON.stringify(installMarketProductData)
    );
  }

  try {
    const installMarketProductInput: ProductInstallParams = {
      productJson: installMarketProductData.productJson,
      dependentProjectPath: installMarketProductData.dependentProject?.path ?? ''
    };
    await IvyEngineManager.instance.installMarketProduct(installMarketProductInput);
  } catch (err) {
    logErrorMessage('Market installation failed: ' + (err instanceof Error ? err.message : err));
  }
};
