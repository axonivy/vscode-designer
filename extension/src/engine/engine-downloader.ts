import AdmZip from 'adm-zip';
import fs from 'fs';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import path from 'path';
import * as vscode from 'vscode';
import { config } from '../base/configurations';
import { extensionVersion } from '../version/extension-version';
import { outputChannel } from './output-channel';

export class EngineDownloader {
  private readonly globalEngieStoragePath: string;
  private readonly bestMatchingEngineVersion: string;

  constructor(context: vscode.ExtensionContext) {
    this.globalEngieStoragePath = vscode.Uri.joinPath(context.globalStorageUri, 'engines').fsPath;
    this.bestMatchingEngineVersion = extensionVersion.isPreview ? 'dev' : `${extensionVersion.major}.${extensionVersion.minor}`;
  }
  loadBestMatchingVersion = async () => {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Downloading Axon Ivy Engine', cancellable: false },
      async () => {
        const url = this.downloadUrl(this.bestMatchingEngineVersion);
        return await downloadEngine(url, this.globalEngieStoragePath, outputChannel.appendLine);
      }
    );
  };

  tryToUpdateEngine = async () => {
    try {
      const url = this.downloadUrl(this.bestMatchingEngineVersion);
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
      // this is just a try and ok if it fails, e.g. offline mode
      console.log(error);
      return;
    }
    outputChannel.show(true);
    const newEnginePath = await this.loadBestMatchingVersion();
    await config.updateEngineDirectory(newEnginePath);
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  };

  private downloadUrl = (version: string) => {
    return `https://dev.axonivy.com/permalink/${version}/axonivy-engine-slim.zip`;
  };
}

export const downloadEngine = async (url: string, rootDir: string, logger: (message: string) => void, engineDir?: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return Promise.reject(`Download engine failed with status code ${response.status}`);
  }
  const zipName = path.basename(response.url);
  const enginePath = engineDir ? path.join(rootDir, engineDir) : path.join(rootDir, zipName.replace('.zip', ''));
  if (fs.existsSync(enginePath)) {
    logger(`Engine does already exist under '${enginePath}'`);
    return enginePath;
  }
  fs.mkdirSync(enginePath, { recursive: true });
  const zipPath = path.join(rootDir, zipName);
  logger(`Download engine from '${url}' to '${zipPath}'`);
  const fileStream = fs.createWriteStream(zipPath);
  Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(fileStream);
  return new Promise<string>(resolve => {
    fileStream.on('finish', () => {
      fileStream.close();
      logger('--> Download finished');
      unzipEngine(zipPath, enginePath, logger);
      resolve(enginePath);
    });
  });
};

const unzipEngine = (zipPath: string, targetDir: string, logger: (message: string) => void) => {
  logger(`Extract '${zipPath}' to '${targetDir}'`);
  let zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true, true);
  fs.rmSync(zipPath);

  const files = fs.readdirSync(targetDir);
  files.forEach(file => {
    const nestedZipName = path.join(targetDir, file);
    if (nestedZipName.endsWith('.zip') && fs.existsSync(nestedZipName)) {
      zip = new AdmZip(nestedZipName);
      zip.extractAllTo(targetDir, true, true);
      fs.rmSync(nestedZipName);
      return;
    }
  });
  logger('--> Extract finished');
};
