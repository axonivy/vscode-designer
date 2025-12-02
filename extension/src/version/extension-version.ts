import * as vscode from 'vscode';

export type ExtensionVersion = { major: number; minor: number; patch: number; isPreview: boolean };
export let extensionVersion: ExtensionVersion;

export const resolveExtensionVersion = (context: vscode.ExtensionContext) => {
  const isPreview = context.extension.packageJSON.preview === true;
  const rawVersion = context.extension.packageJSON.version;
  if (rawVersion == undefined || typeof rawVersion !== 'string') {
    throw new Error(`Invalid extension version ${rawVersion}`);
  }
  extensionVersion = {
    isPreview,
    ...toVersion(rawVersion)
  };
};

export const toVersion = (rawVersion: string) => {
  const splittedVersion = rawVersion.split('.');
  if (splittedVersion.length < 3) {
    throw new Error(`Invalid version ${rawVersion}`);
  }
  return {
    major: toInt(rawVersion, splittedVersion[0]),
    minor: toInt(rawVersion, splittedVersion[1]),
    patch: toInt(rawVersion, splittedVersion[2])
  };
};

const toInt = (rawVersion: string, value?: string) => {
  const int = parseInt(value ?? '');
  if (isNaN(int)) {
    throw new Error(`Invalid version part ${value} in version ${rawVersion}`);
  }
  return int;
};
