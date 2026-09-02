import type { ExtensionContext } from 'vscode';
import { ThemeIcon, window } from 'vscode';
import { config } from '../base/configurations';
import { extensionVersion } from '../version/extension-version';
import { ReleaseTrainValidator } from './release-train-validator';

export const PREVIEW_TRAINS = ['nightly', 'dev', 'milestone'];
export const stableTrains = (major: number) => [`${major}`, `nightly-${major}`];

export const engineReleaseTrain = () => {
  const train = config.engineReleaseTrain();
  if (train) {
    return train;
  }
  // FIXME: Ugly workaround classifies each extension version with a patch > 0 and not a YYYYMMDDHH as a milestone release.
  // Could lead to problems in the future when we use real patch versions, e.g. 14.1.1
  const isTimestampPatch = (patch: number) => {
    return patch >= 2_000_000_000 && patch < 3_000_000_000;
  };
  return extensionVersion.isPreview
    ? isTimestampPatch(extensionVersion.patch)
      ? 'nightly'
      : 'milestone'
    : `${extensionVersion.major}.${extensionVersion.minor}`;
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
  let selectedTrain = (
    await window.showQuickPick([...items, { label: 'Enter custom value' }], {
      ignoreFocusOut: true,
      title: reason
    })
  )?.label;
  if (selectedTrain === 'Enter custom value') {
    const releaseTrainValidator = new ReleaseTrainValidator(extensionVersion);
    selectedTrain = await window.showInputBox({
      placeHolder: "Enter custom release train, e.g. '14.0.1' or a path of an existing engine directory)",
      validateInput: async (value: string) => {
        const result = await releaseTrainValidator.validate(value);
        if (result.valid) {
          return;
        }
        return result.reason ?? 'Invalid release train tag';
      },
      ignoreFocusOut: true
    });
  }
  if (selectedTrain) {
    await config.setReleaseTrainOnWorkspaceLevel(selectedTrain);
  }
  return selectedTrain;
};

export const permalinkVersionFromReleaseTrain = (releaseTrain: string) => {
  if (releaseTrain == 'milestone') {
    return `${extensionVersion.major}.${extensionVersion.minor}.0-m${extensionVersion.patch}`;
  }
  return releaseTrain;
};

const toItem = (trainSelection: string, currentTrain?: string) => {
  return { label: trainSelection, iconPath: currentTrain === trainSelection ? new ThemeIcon('check') : undefined };
};
