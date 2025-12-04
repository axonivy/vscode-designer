import * as vscode from 'vscode';
import { config } from '../base/configurations';
import { extensionVersion } from '../version/extension-version';
import { ReleaseTrainValidator } from './release-train-validator';

export const PREVIEW_TRAINS = ['nightly', 'dev', 'sprint'];
export const stableTrains = (major: number) => [`${major}`, `nightly-${major}`];

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
    ? PREVIEW_TRAINS.map(train => toItem(train, currentTrain))
    : stableTrains(extensionVersion.major).map(train => toItem(train, currentTrain));
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
        const result = await releaseTrainValidator.validate(value);
        if (result.valid) {
          return undefined;
        }
        return result.isDirectory && result.reason ? result.reason : 'Invalid release train tag';
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
