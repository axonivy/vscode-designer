import { window, workspace } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import {
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  type InputStep
} from '../project-explorer/utils/multi-step-input';
import { createMarketProductSelectionSteps, finishMarketProductInstallation } from './utils/market-install-flow';
import type { InstallMarketProductState } from './utils/market-install-types';
import { parseProduct } from './utils/market-install-util';

export const installLocalMarketProduct = async (existingIvyProjects: string[]) => {
  const stepSelectJson: () => Promise<string> = async () => {
    const productInstaller = await window.showOpenDialog({
      title: 'Select product.json file',
      filters: { 'JSON files': ['json'] },
      canSelectMany: false,
      openLabel: 'Import product.json'
    });
    if (!productInstaller || productInstaller.length === 0 || !productInstaller[0]) {
      throw new MultiStepCancelledError();
    }
    const fileData = await workspace.fs.readFile(productInstaller[0]);
    const productJson = new TextDecoder('utf-8').decode(fileData);
    parseProduct(productJson);
    return productJson;
  };

  const stepVersion: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    if (state.sourceProductJson?.includes('${version}')) {
      state.version = await input.showTextInput({
        title: state.dialogTitle,
        titleSuffix: ' - Resolve dynamic ${version} in product.json',
        prompt: 'Enter a Maven version, which you made locally available by running `mvn clean install` from your product workspace.',
        placeholder: '14.0.0-SNAPSHOT',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        value: state.version ?? '',
        validationFunction: (value: string) => {
          if (!value.trim()) {
            return 'Version is required for product.json files with ${version} placeholder. Please enter a version.';
          }
        },
        onBack: (typedValue: string) => {
          state.version = typedValue;
        }
      });
    }
  };

  let productJsonSelection: string = '';
  try {
    productJsonSelection = await stepSelectJson();
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      return;
    } else {
      throw err;
    }
  }

  const steps: InputStep<InstallMarketProductState>[] = [
    ...createMarketProductSelectionSteps({
      existingIvyProjects,
      getSourceProductJson: async () => productJsonSelection
    })
  ];
  if (productJsonSelection.includes('${version}')) {
    steps.unshift(stepVersion);
  }
  const installLocalMarketProductData: InstallMarketProductState = {
    dialogTitle: 'Install Local Market Product',
    currentStep: 1,
    totalSteps: steps.length,
    sourceProductJson: productJsonSelection,
    changedProjectSelection: false,
    forceBackRequiredStep: false
  };
  try {
    await new MultiStepInput<InstallMarketProductState>().stepThrough(steps, installLocalMarketProductData);
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

  if (!installLocalMarketProductData.productJson) {
    throw new MultiStepInvalidStateError(
      'Market Product installation failed due to corrupted input state. ProductJson is not set. Current input state: ' +
        JSON.stringify(installLocalMarketProductData)
    );
  } else if (installLocalMarketProductData.productJson.includes('${version}') && !installLocalMarketProductData.version) {
    throw new MultiStepInvalidStateError(
      'Market Product installation failed due to corrupted input state. ProductJson contains ${version} placeholder but version is not set. Current input state: ' +
        JSON.stringify(installLocalMarketProductData)
    );
  }
  await finishMarketProductInstallation(installLocalMarketProductData, productJson =>
    replaceDynamicVersion(productJson, installLocalMarketProductData.version ?? '')
  );
};

const replaceDynamicVersion = (productJson: string, version: string): string => {
  if (!productJson.includes('${version}')) {
    return productJson;
  }
  if (!version) {
    return productJson;
  }
  return productJson.replace(/\$\{version\}/g, version);
};
