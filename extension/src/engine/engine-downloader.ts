import fs from 'fs';
import path from 'path';
import type { ExtensionContext } from 'vscode';
import { ProgressLocation, Uri, window } from 'vscode';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { askToReloadWindow } from '../base/reload-window';
import { downloadEngine } from './download';
import { engineOutputChannel } from './engine-output-channel';
import { permalinkVersionFromReleaseTrain, updateGlobalStateEngineDir } from './engine-release-train';

export class EngineDownloader {
  private readonly globalEngieStoragePath: string;

  constructor(readonly context: ExtensionContext) {
    this.globalEngieStoragePath = Uri.joinPath(context.globalStorageUri, 'engines').fsPath;
  }
  loadReleaseTrain = async (releaseTrain: string) => {
    return await window.withProgress(
      { location: ProgressLocation.Notification, title: 'Downloading Axon Ivy Engine', cancellable: false },
      async progress => {
        const logger = (message: string) => {
          progress.report({ message });
          engineOutputChannel.appendLine(message);
        };
        const url = this.downloadUrl(releaseTrain);
        try {
          return await downloadEngine(url, this.globalEngieStoragePath, logger);
        } catch (error) {
          await logErrorMessage(`Failed to download engine from ${url}, error: ${error}`);
          throw error;
        }
      }
    );
  };

  tryToUpdateDevEngine = async (releaseTrain: string, globalStateEngineDir: string) => {
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
          await askToReloadWindow('Axon Ivy Engine updated');
        }
        return;
      }
      const selection = await logInformationMessage(
        `There is a new Dev Axon Ivy Engine Version available ${zipName}`,
        'Download new Version',
        'Cancel'
      );
      if (selection !== 'Download new Version') {
        return;
      }
    } catch (error) {
      engineOutputChannel.appendLine(`Failed to check for engine update: ${error}`);
      return;
    }
    const newEngineDir = await this.loadReleaseTrain(releaseTrain);
    await updateGlobalStateEngineDir(this.context, releaseTrain, newEngineDir);
    await askToReloadWindow('Axon Ivy Engine updated');
  };

  private downloadUrl = (releaseTrain: string) => {
    const permalinkVersion = permalinkVersionFromReleaseTrain(releaseTrain);
    // return `https://dev.axonivy.com/permalink/${permalinkVersion}/axonivy-engine-slim.zip`;
    const url = `https://dev.axonivy.com/permalink/${permalinkVersion}/axonivy-engine-slim.zip`;
    console.log(url);
    return url;
  };
}
