import fs from 'fs';
import path from 'path';
import type { ExtensionContext } from 'vscode';
import { l10n, ProgressLocation, Uri, window } from 'vscode';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { askToReloadWindow } from '../base/reload-window';
import { extensionVersion } from '../version/extension-version';
import { downloadEngine } from './download';
import { engineOutputChannel } from './engine-output-channel';
import { permalinkVersionFromReleaseTrain, pinCurrentReleaseTrain, updateGlobalStateEngineDir } from './engine-release-train';

export class EngineDownloader {
  private readonly globalEngieStoragePath: string;

  constructor(readonly context: ExtensionContext) {
    this.globalEngieStoragePath = Uri.joinPath(context.globalStorageUri, 'engines').fsPath;
  }
  loadReleaseTrain = async (releaseTrain: string) => {
    return await window.withProgress(
      { location: ProgressLocation.Notification, title: l10n.t('Downloading Axon Ivy Engine'), cancellable: false },
      async progress => {
        const logger = (message: string) => {
          progress.report({ message });
          engineOutputChannel.appendLine(message);
        };
        const url = this.downloadUrl(releaseTrain);
        try {
          return await downloadEngine(url, this.globalEngieStoragePath, logger);
        } catch (error) {
          await logErrorMessage(l10n.t('Failed to download engine from {0}, error: {1}', url, String(error)));
          throw error;
        }
      }
    );
  };

  tryToUpdateDevEngine = async (releaseTrain: string, globalStateEngineDir: string, engineVersion?: string) => {
    try {
      const url = this.downloadUrl(releaseTrain);
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
      const zipName = path.basename(response.url);
      const enginePath = path.join(this.globalEngieStoragePath, zipName.replace('.zip', ''));
      if (fs.existsSync(enginePath)) {
        if (globalStateEngineDir !== enginePath) {
          engineOutputChannel.appendLine(`New Dev Axon Ivy Engine Version available locally, updating engine path to ${enginePath}`);
          await updateGlobalStateEngineDir(this.context, releaseTrain, enginePath);
          await askToReloadWindow(l10n.t('Axon Ivy Engine updated'));
        }
        return;
      }
      const downloadLabel = l10n.t('Download new Version');
      const pinTrainLabel = l10n.t('Pin current release train');
      const cancelLabel = l10n.t('Cancel');
      const message = l10n.t(
        'There is a new Dev Axon Ivy Engine Version available for release train {0}, switch from current engine version {1} to {2}',
        releaseTrain,
        path.basename(globalStateEngineDir),
        zipName
      );
      const selection = extensionVersion.isPreview
        ? await logInformationMessage(message, downloadLabel, cancelLabel)
        : await logInformationMessage(message, downloadLabel, pinTrainLabel, cancelLabel);
      if (selection === pinTrainLabel) {
        await pinCurrentReleaseTrain(engineVersion?.split('.').slice(0, 3).join('.'));
        return;
      }
      if (selection !== downloadLabel) {
        return;
      }
    } catch (error) {
      engineOutputChannel.appendLine(`Failed to check for engine update: ${error}`);
      return;
    }
    const newEngineDir = await this.loadReleaseTrain(releaseTrain);
    await updateGlobalStateEngineDir(this.context, releaseTrain, newEngineDir);
    await askToReloadWindow(l10n.t('Axon Ivy Engine updated'));
  };

  private downloadUrl = (releaseTrain: string) => {
    const permalinkVersion = permalinkVersionFromReleaseTrain(releaseTrain);
    return `https://dev.axonivy.com/permalink/${permalinkVersion}/axonivy-engine.zip`;
  };
}
