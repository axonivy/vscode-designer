import * as vscode from 'vscode';
import { config } from '../base/configurations';
import { extensionVersion } from '../version/extension-version';
import { ReleaseTrainValidator } from './release-train-validator';

export const PREVIEW_TRAINS = {
  dev: 'dev',
  nightly: 'nightly',
  sprint: 'sprint'
};

export const STABLE_TRAINS = {
  latest: (major: number) => `${major}`,
  nightly: (major: number) => `nightly-${major}`
};

export const engineReleaseTrain = () => {
  const train = config.engineReleaseTrain();
  if (train) {
    return train;
  }
  return extensionVersion.isPreview ? 'nightly' : `${extensionVersion.major}.${extensionVersion.minor}`;
};

export const engineDirFromGlobalState = (contentx: vscode.ExtensionContext, releaseTrain: string) => {
  return contentx.globalState.get<string>(`axonivy.${releaseTrain}`);
};

export const updateGlobalStateEngineDir = async (contentx: vscode.ExtensionContext, releaseTrain: string, engineDir: string) => {
  await contentx.globalState.update(`axonivy.${releaseTrain}`, engineDir);
};

export const switchEngineReleaseTrain = async (reason?: string) => {
  const currentTrain = config.engineReleaseTrain();
  const items = extensionVersion.isPreview
    ? [toItem(PREVIEW_TRAINS.nightly, currentTrain), toItem(PREVIEW_TRAINS.sprint, currentTrain), toItem(PREVIEW_TRAINS.dev, currentTrain)]
    : [
        toItem(STABLE_TRAINS.latest(extensionVersion.major), currentTrain),
        toItem(STABLE_TRAINS.nightly(extensionVersion.major), currentTrain)
      ];
  let selectedTrain = (
    await vscode.window.showQuickPick([...items, { label: 'Enter custom value' }], {
      ignoreFocusOut: true,
      title: reason
    })
  )?.label;
  if (selectedTrain === 'Enter custom value') {
    const releaseTrainValidator = new ReleaseTrainValidator(extensionVersion);
    selectedTrain = await vscode.window.showInputBox({
      placeHolder: "Enter custom release train, e.g. '14.0.1' or a path of an existing engine directory)",
      validateInput: async (value: string) => {
        return (await releaseTrainValidator.validate(value)).reason;
      },
      ignoreFocusOut: true
    });
  }
  if (selectedTrain) {
    await config.setReleaseTrainOnWorkspaceLevel(selectedTrain);
  }
  return selectedTrain;
};

const toItem = (trainSelection: string, currentTrain?: string) => {
  return { label: trainSelection, iconPath: currentTrain === trainSelection ? new vscode.ThemeIcon('check') : undefined };
};
