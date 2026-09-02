import type { ExtensionContext } from 'vscode';

export type ExtensionVersion = { major: number; minor: number; patch: number; isPreview: boolean; isMilestone: boolean; milestone: number };
export let extensionVersion: ExtensionVersion;

export const resolveExtensionVersion = (context: ExtensionContext) => {
  const isPreview = context.extension.packageJSON.preview === true;
  const rawVersion = context.extension.packageJSON.version;
  if (rawVersion == undefined || typeof rawVersion !== 'string') {
    throw new Error(`Invalid extension version ${rawVersion}`);
  }
  const milestonePackageJson = context.extension.packageJSON.milestone;
  extensionVersion = {
    isPreview,
    ...parseMilestone(milestonePackageJson),
    ...toVersion(rawVersion)
  };
};

export const toVersion = (rawVersion: string) => {
  const splittedVersion = rawVersion.split('.');
  if (splittedVersion.length < 3) {
    throw new Error(`Invalid version ${rawVersion}`);
  }
  return {
    major: versionNumberToInt(rawVersion, splittedVersion[0]),
    minor: versionNumberToInt(rawVersion, splittedVersion[1]),
    patch: versionNumberToInt(rawVersion, splittedVersion[2])
  };
};

const versionNumberToInt = (rawVersion: string, value?: string) => {
  const int = parseInt(value ?? '');
  if (isNaN(int)) {
    throw new Error(`Invalid version part ${value} in version ${rawVersion}`);
  }
  return int;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseMilestone = (milestonePackageJson: any) => {
  if (milestonePackageJson == undefined) {
    return { isMilestone: false, milestone: 0 };
  }
  if (typeof milestonePackageJson !== 'string') {
    throw new Error(`Invalid milestone ${milestonePackageJson}. Must be a string.`);
  }
  const milestone = milestonePackageJson.trim();
  const int = parseInt(milestone);
  if (isNaN(int) || int <= 0) {
    throw new Error(`Invalid milestone ${milestone}. Must be a valid number greater than 0.`);
  }
  return { isMilestone: true, milestone: int };
};
