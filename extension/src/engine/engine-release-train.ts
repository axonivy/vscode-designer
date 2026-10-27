import type { ExtensionContext } from 'vscode';
import { l10n, ThemeIcon, window } from 'vscode';
import { config } from '../base/configurations';
import { extensionVersion } from '../version/extension-version';
import { ReleaseTrainValidator } from './release-train-validator';

export const PREVIEW_TRAINS = ['nightly-14', 'milestone'];
export const stableTrains = (major: number) => [`${major}`, `nightly-${major}`];

export const engineReleaseTrain = () => {
  const train = config.engineReleaseTrain();
  if (train) {
    return train;
  }
  return extensionVersion.isPreview ? (extensionVersion.isMilestone ? 'milestone' : 'nightly-14') : `${extensionVersion.major}`;
};

export const engineDirFromGlobalState = (context: ExtensionContext, releaseTrain: string) => {
  return context.globalState.get<string>(`axonivy.${releaseTrain}`);
};

export const updateGlobalStateEngineDir = async (context: ExtensionContext, releaseTrain: string, engineDir: string) => {
  await context.globalState.update(`axonivy.${releaseTrain}`, engineDir);
};

export const switchEngineReleaseTrain = async (reason?: string) => {
  const currentTrain = config.engineReleaseTrain();
  const items = extensionVersion.isPreview
    ? PREVIEW_TRAINS.map(train => toItem(train, currentTrain))
    : stableTrains(extensionVersion.major).map(train => toItem(train, currentTrain));
  const customValueLabel = l10n.t('Enter custom value');
  let selectedTrain = (
    await window.showQuickPick([...items, { label: customValueLabel }], {
      ignoreFocusOut: true,
      title: reason
    })
  )?.label;
  if (selectedTrain === customValueLabel) {
    selectedTrain = await askForCustomReleaseTrain();
  }
  if (selectedTrain) {
    await config.setReleaseTrainOnWorkspaceLevel(selectedTrain);
  }
  return selectedTrain;
};

export const pinCurrentReleaseTrain = async (engineVersion?: string) => {
  const selection = await askForCustomReleaseTrain(engineVersion);
  if (selection) {
    await config.setReleaseTrainOnWorkspaceLevel(selection);
  }
};

const askForCustomReleaseTrain = async (value?: string) => {
  const title = l10n.t("Enter custom release train, e.g. '14.0.1' or a path of an existing engine directory");
  const releaseTrainValidator = new ReleaseTrainValidator(extensionVersion);
  const initialValidation = value ? (await releaseTrainValidator.validate(value)).valid : false;
  return await window.showInputBox({
    value: initialValidation ? value : undefined,
    title,
    validateInput: async (value: string) => {
      const result = await releaseTrainValidator.validate(value);
      if (result.valid) {
        return;
      }
      return result.reason ?? l10n.t('Invalid release train tag');
    },
    ignoreFocusOut: true
  });
};

export const permalinkVersionFromReleaseTrain = (releaseTrain: string) => {
  if (releaseTrain == 'milestone') {
    return `${extensionVersion.major}.${extensionVersion.minor}.0-m${extensionVersion.milestone}`;
  }
  return releaseTrain;
};

const toItem = (trainSelection: string, currentTrain?: string) => {
  return { label: trainSelection, iconPath: currentTrain === trainSelection ? new ThemeIcon('check') : undefined };
};
