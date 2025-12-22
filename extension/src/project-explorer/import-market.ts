import * as vscode from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { ProductInstallParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';

export const importMarketProduct = async (projectDir: string) => {
  const input = await collectProductJson(projectDir);
  if (input) {
    await IvyEngineManager.instance.installMarketProduct(input);
  }
};

const collectProductJson = async (projectDir: string): Promise<ProductInstallParams> => {
  const productInstaller = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Select a product.json file to Import'
  });
  if (!productInstaller || productInstaller.length === 0 || !productInstaller[0]) {
    logErrorMessage('Cannot pick product.json file.');
    return Promise.reject(new Error('product.json file not selected'));
  }
  const fileData = await vscode.workspace.fs.readFile(productInstaller[0]);
  const decoder = new TextDecoder('utf-8');
  const productJson = decoder.decode(fileData);
  return { productJson, dependentProjectPath: projectDir };
};
