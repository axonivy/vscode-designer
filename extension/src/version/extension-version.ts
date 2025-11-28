import * as vscode from 'vscode';
import { toVersion, Version } from './version';

export type ExtensionVersion = { isPreview: boolean } & Version;

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
