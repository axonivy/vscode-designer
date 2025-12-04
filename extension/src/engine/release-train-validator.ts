import fs from 'fs';
import path from 'path';
import { ExtensionVersion } from '../version/extension-version';
import { PREVIEW_TRAINS, stableTrains } from './engine-release-train';

const MIN_PATCH_VERSION = 0; // to be maintained manually

export class ReleaseTrainValidator {
  private minPatchVersion = MIN_PATCH_VERSION;

  constructor(private readonly extensionVersion: ExtensionVersion) {}

  setMinPatchVersion = (min: number) => {
    this.minPatchVersion = min;
  };

  public validate = async (releaseTrain: string): Promise<{ valid: boolean; isDirectory?: boolean; reason?: string }> => {
    if (this.isValidReleaseTrainTag(releaseTrain)) {
      return { valid: true };
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
      return { valid: false, reason: `Invalid release train tag or engine directory '${engineDir}'` };
    }
    const isDirectory = true;
    const utilBundleFileName = await fs.promises
      .readdir(pluginsDir, { withFileTypes: true })
      .then(files => files.find(file => file.isFile() && file.name.startsWith('ch.ivyteam.util_') && file.name.endsWith('.jar'))?.name);
    if (!utilBundleFileName) {
      return { valid: false, isDirectory, reason: `Failed to determine engine version, no util bundle found in '${pluginsDir}'.` };
    }
    const splittedBundleName = utilBundleFileName.split('_');
    if (splittedBundleName.length !== 2 || !splittedBundleName[1]) {
      return { valid: false, isDirectory, reason: `Failed to check engine version, unexpected util bundle name '${utilBundleFileName}'.` };
    }
    const engineVersion = splittedBundleName[1].replace('.jar', '');
    return { isDirectory, ...this.isValidEngineVersion(engineVersion) };
  };

  private isValidEngineVersion = (engineVersion: string) => {
    const splittedEngineVersion = engineVersion.split('.');
    if (splittedEngineVersion.length < 3) {
      return { valid: false, reason: `Engine version validation failed, unexpected engine version '${engineVersion}'.` };
    }
    const minEngineVersion = `${this.extensionVersion.major}.${this.extensionVersion.minor}.${this.minPatchVersion}`;
    if (this.toInt(splittedEngineVersion[0]) !== this.extensionVersion.major) {
      return {
        valid: false,
        reason: `Engine major version '${engineVersion}' does not match expected major version '${minEngineVersion}'.`
      };
    }
    if (this.toInt(splittedEngineVersion[1]) !== this.extensionVersion.minor) {
      return {
        valid: false,
        reason: `Engine minor version '${engineVersion}' does not match expected minor version '${minEngineVersion}'.`
      };
    }
    if (this.toInt(splittedEngineVersion[2]) < this.minPatchVersion) {
      return { valid: false, reason: `Engine patch version '${engineVersion}' is older than expected version '${minEngineVersion}'.` };
    }
    return { valid: true };
  };

  private isValidReleaseTrainTag = (train: string) => {
    if (this.extensionVersion.isPreview) {
      return PREVIEW_TRAINS.includes(train);
    }
    if (stableTrains(this.extensionVersion.major).includes(train)) {
      return true;
    }
    if (new RegExp(`^${this.extensionVersion.major}\\.${this.extensionVersion.minor}\\.(\\d+)$`).test(train)) {
      return this.toInt(train.split('.')[2]) >= this.minPatchVersion;
    }
    return false;
  };

  private toInt = (value?: string) => parseInt(value ?? '');
}
