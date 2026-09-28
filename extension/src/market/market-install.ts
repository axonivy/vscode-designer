import { Uri } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { MultiStepCancelledError, MultiStepInput, type InputStep } from '../project-explorer/utils/multi-step-input';
import { fetchInstaller, getAvailableVersions, getBestVersion, searchMarketProduct } from './utils/market-client';
import { createMarketProductSelectionSteps, finishMarketProductInstallation } from './utils/market-install-flow';
import type { InstallMarketProductState, ProductSelection } from './utils/market-install-types';

export const installMarketProduct = async (existingIvyProjects: string[], engineVersion: string) => {
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

  const steps: InputStep<InstallMarketProductState>[] = [
    stepProduct,
    stepVersion,
    ...createMarketProductSelectionSteps({
      existingIvyProjects,
      getSourceProductJson: state => fetchInstaller(state.product?.id ?? '', state.version ?? '')
    })
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

  await finishMarketProductInstallation(installMarketProductData);
};
