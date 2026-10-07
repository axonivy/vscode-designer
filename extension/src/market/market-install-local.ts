import { l10n, workspace, type ExtensionContext } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { showRememberedFileDialog } from '../base/remembered-file-dialog';
import { MultiStepCancelledError, MultiStepInput, type InputStep } from '../project-explorer/utils/multi-step-input';
import { createSteps, executeInstall } from './utils/market-install-flow';
import type { InstallMarketProductState } from './utils/market-install-types';
import { initState } from './utils/market-install-types';
import { parseProduct, replaceDynamicVersion } from './utils/market-install-util';

export const installLocalMarketProduct = async (existingProjects: string[], context: Pick<ExtensionContext, 'globalState'>) => {
  const stepSelectJsonFile: () => Promise<string> = async () => {
    const productInstaller = await showRememberedFileDialog(context, 'installLocalMarketProduct', {
      title: l10n.t('Select product.json file'),
      filters: { [l10n.t('JSON files')]: ['json'] },
      canSelectMany: false,
      openLabel: l10n.t('Import product.json')
    });
    if (!productInstaller || productInstaller.length === 0 || !productInstaller[0]) {
      throw new MultiStepCancelledError();
    }
    const fileData = await workspace.fs.readFile(productInstaller[0]);
    const productJson = new TextDecoder('utf-8').decode(fileData);
    parseProduct(productJson); // this validates the parsed json
    return productJson;
  };

  const stepVersion: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    if (state.sourceProductJson?.includes('${version}')) {
      state.version = await input.showTextInput({
        title: state.dialogTitle,
        titleSuffix: l10n.t('Resolve dynamic ${version} in product.json'),
        prompt: l10n.t(
          'Enter a Maven version, which you made locally available by running `mvn clean install` from your product workspace.'
        ),
        placeholder: '14.0.0-SNAPSHOT',
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        value: state.version ?? '',
        validationFunction: (value: string) => {
          if (!value.trim()) {
            return l10n.t('Version is required for product.json files with ${version} placeholder. Please enter a version.');
          }
        }
      });
    }
  };

  let productJsonFromFile: string = '';
  try {
    productJsonFromFile = await stepSelectJsonFile();
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      return;
    } else {
      throw err;
    }
  }

  // In the local case, productJsonFromFile is already determined and fixed, no need to use the state to fetch it.
  const steps: InputStep<InstallMarketProductState>[] = [...createSteps(existingProjects, async () => productJsonFromFile)];
  if (productJsonFromFile.includes('${version}')) {
    steps.unshift(stepVersion);
  }
  const installLocalMarketProductData = initState({
    dialogTitle: l10n.t('Install Local Market Product'),
    totalSteps: steps.length,
    sourceProductJson: productJsonFromFile // At this point, the ground truth JSON is already determined and fixed
  });

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

  const finalProductJson = replaceDynamicVersion(
    installLocalMarketProductData.installProductJson ?? '',
    installLocalMarketProductData.version ?? ''
  );

  await executeInstall(finalProductJson, installLocalMarketProductData.dependentProject?.path ?? '');
};
