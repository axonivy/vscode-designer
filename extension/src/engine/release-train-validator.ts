import fs from 'fs';
import path from 'path';
import { l10n } from 'vscode';
import { type ExtensionVersion } from '../version/extension-version';
import { PREVIEW_TRAINS, stableTrains } from './engine-release-train';

const MIN_PATCH_VERSION = 0; // to be maintained manually

export class ReleaseTrainValidator {
  private minPatchVersion = MIN_PATCH_VERSION;

  constructor(private readonly extensionVersion: ExtensionVersion) {}

  setMinPatchVersion = (min: number) => {
    this.minPatchVersion = min;
  };

  public validate = async (releaseTrain: string): Promise<{ valid: boolean; isDirectory?: boolean; reason?: string }> => {
    const isValidReleaseTrainTag = this.isValidReleaseTrainTag(releaseTrain);
    if (isValidReleaseTrainTag.valid || isValidReleaseTrainTag.reason) {
      return isValidReleaseTrainTag;
    }
    return await this.isValidEngineDir(releaseTrain);
  };

  private isDirectory = (engineDir: string) => {
    try {
      return fs.statSync(engineDir).isDirectory();
    } catch {
      return false;
    }
  };

  public isValidEngineDir = async (engineDir: string) => {
    const pluginsDir = path.join(engineDir, 'system', 'plugins');
    if (!this.isDirectory(pluginsDir)) {
      return { valid: false, reason: l10n.t("Invalid release train tag or engine directory '{0}'", engineDir) };
    }
    const isDirectory = true;
    const utilBundleFileName = await fs.promises
      .readdir(pluginsDir, { withFileTypes: true })
      .then(files => files.find(file => file.isFile() && file.name.startsWith('ch.ivyteam.util_') && file.name.endsWith('.jar'))?.name);
    if (!utilBundleFileName) {
      return {
        valid: false,
        isDirectory,
        reason: l10n.t("Failed to determine engine version, no util bundle found in '{0}'.", pluginsDir)
      };
    }
    const splittedBundleName = utilBundleFileName.split('_');
    if (splittedBundleName.length !== 2 || !splittedBundleName[1]) {
      return {
        valid: false,
        isDirectory,
        reason: l10n.t("Failed to check engine version, unexpected util bundle name '{0}'.", utilBundleFileName)
      };
    }
    const engineVersion = splittedBundleName[1].replace('.jar', '');
    return { isDirectory, ...this.isValidEngineVersion(engineVersion) };
  };

  private isValidEngineVersion = (engineVersion: string) => {
    const splittedEngineVersion = engineVersion.split('.');
    if (splittedEngineVersion.length < 3) {
      return {
        valid: false,
        reason: l10n.t("Engine version validation failed, unexpected engine version '{0}'.", engineVersion)
      };
    }
    const minEngineVersion = `${this.extensionVersion.major}.${this.extensionVersion.minor}.${this.minPatchVersion}`;
    if (this.toInt(splittedEngineVersion[0]) !== this.extensionVersion.major) {
      return {
        valid: false,
        reason: l10n.t("Engine major version '{0}' does not match expected major version '{1}'.", engineVersion, minEngineVersion)
      };
    }
    if (this.toInt(splittedEngineVersion[1]) !== this.extensionVersion.minor) {
      return {
        valid: false,
        reason: l10n.t("Engine minor version '{0}' does not match expected minor version '{1}'.", engineVersion, minEngineVersion)
      };
    }
    if (this.toInt(splittedEngineVersion[2]) < this.minPatchVersion) {
      return {
        valid: false,
        reason: l10n.t("Engine patch version '{0}' is older than expected version '{1}'.", engineVersion, minEngineVersion)
      };
    }
    return { valid: true };
  };

  private isValidReleaseTrainTag = (releaseTrain: string) => {
    if (this.extensionVersion.isPreview) {
      if (!PREVIEW_TRAINS.includes(releaseTrain)) {
        return { valid: false };
      }
      if (this.extensionVersion.isMilestone && releaseTrain != 'milestone') {
        return {
          valid: false,
          reason: l10n.t(
            `Release train setting mismatch. Extension Version is a milestone release, but there is a Workspace or User VS Code setting "axonivy.engine.releaseTrain": "{0}". Switch the releaseTrain to 'milestone' or install a non-milestone version of the extension.`,
            releaseTrain
          )
        };
      }
      if (!this.extensionVersion.isMilestone && releaseTrain == 'milestone') {
        return {
          valid: false,
          reason: l10n.t(
            `Release train setting mismatch. Extension Version is not a milestone release, but there is a Workspace or User VS Code setting "axonivy.engine.releaseTrain": "milestone". Switch the releaseTrain to 'nightly' or 'dev', or install a milestone version of the extension.`
          )
        };
      }
      return { valid: true };
    }
    if (stableTrains(this.extensionVersion.major).includes(releaseTrain)) {
      return { valid: true };
    }
    if (new RegExp(`^${this.extensionVersion.major}\\.${this.extensionVersion.minor}\\.(\\d+)$`).test(releaseTrain)) {
      return { valid: this.toInt(releaseTrain.split('.')[2]) >= this.minPatchVersion };
    }
    return { valid: false };
  };

  private toInt = (value?: string) => parseInt(value ?? '');
}
