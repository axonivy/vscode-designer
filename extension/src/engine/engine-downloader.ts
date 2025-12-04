import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { askToReloadWindow } from '../base/reload-window';
import { downloadEngine } from './download';
import { updateGlobalStateEngineDir } from './engine-release-train';
import { outputChannel } from './output-channel';

export class EngineDownloader {
  private readonly globalEngieStoragePath: string;

  constructor(readonly context: vscode.ExtensionContext) {
    this.globalEngieStoragePath = vscode.Uri.joinPath(context.globalStorageUri, 'engines').fsPath;
  }
  loadReleaseTrain = async (releaseTrain: string) => {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Downloading Axon Ivy Engine', cancellable: false },
      async progress => {
        const logger = (message: string) => {
          progress.report({ message });
          outputChannel.appendLine(message);
        };
        const url = this.downloadUrl(releaseTrain);
        try {
          return await downloadEngine(url, this.globalEngieStoragePath, logger);
        } catch (error) {
          await vscode.window.showErrorMessage(`Failed to download engine from ${url}, error: ${error}`);
          throw error;
        }
      }
    );
  };

  tryToUpdateDevEngine = async (releaseTrain: string) => {
    try {
      const url = this.downloadUrl(releaseTrain);
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
      const zipName = path.basename(response.url);
      const enginePath = path.join(this.globalEngieStoragePath, zipName.replace('.zip', ''));
      if (fs.existsSync(enginePath)) {
        return;
      }
      const selection = await vscode.window.showInformationMessage(
        `There is a new Dev Axon Ivy Engine Version available ${zipName}`,
        'Download new Version',
        'Cancel'
      );
      if (selection !== 'Download new Version') {
        return;
      }
    } catch (error) {
      outputChannel.appendLine(`Failed to check for engine update: ${error}`);
      return;
    }
    const newEngineDir = await this.loadReleaseTrain(releaseTrain);
    await updateGlobalStateEngineDir(this.context, releaseTrain, newEngineDir);
    await askToReloadWindow('Axon Ivy Engine updated');
  };

  private downloadUrl = (version: string) => {
    return `https://dev.axonivy.com/permalink/${version}/axonivy-engine-slim.zip`;
  };
}
