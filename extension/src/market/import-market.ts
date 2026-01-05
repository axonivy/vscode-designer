import * as vscode from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { ProductInstallParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { availableVersions, fetchInstaller, Product, searchMarketProduct } from './market-client';
import { MarketProduct, MavenProjectInstaller } from './market-product';

export const importMarketProductFile = async (projectDir: string) => {
  const input = await collectLocalProductJson(projectDir);
  if (input) {
    await IvyEngineManager.instance.installMarketProduct(input);
  }
};

const collectLocalProductJson = async (projectDir: string): Promise<ProductInstallParams> => {
  let productJson = await readProductJsonFromFile();
  productJson = await replaceDynamicVersion(productJson);
  productJson = await selectProjects(productJson);
  return { productJson, dependentProjectPath: projectDir };
};

async function readProductJsonFromFile() {
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
  return productJson;
}

export const importMarketProduct = async (projectDir: string) => {
  const input = await searchProduct(projectDir);
  if (input) {
    await IvyEngineManager.instance.installMarketProduct(input);
  }
};

const searchProduct = async (projectDir: string): Promise<ProductInstallParams> => {
  const products = await searchMarketProduct();
  const productId = await selectProduct(products);
  if (!productId) {
    return Promise.reject(new Error('No product selected'));
  }
  const versions = await availableVersions(productId);
  const version = await selectVersion(versions);
  let productJson = await fetchInstaller(productId, version);
  productJson = await selectProjects(productJson);
  return { productJson, dependentProjectPath: projectDir };
};

async function selectVersion(versions: string[]) {
  const selected = await vscode.window.showQuickPick(versions, {
    placeHolder: 'Select a version to install',
    canPickMany: false
  });
  if (!selected) {
    return '';
  }
  return selected;
}

async function selectProduct(products: Product[]) {
  const items = products.map(product => ({
    label: product.name,
    description: product.id,
    detail: product.description,
    iconPath: vscode.Uri.parse(product.logoUrl)
  }));
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a Product to install',
    canPickMany: false,
    matchOnDetail: true,
    matchOnDescription: true
  });
  if (!selected || !selected.description) {
    return '';
  }
  return selected.description;
}

async function replaceDynamicVersion(productJson: string) {
  if (productJson.includes('${version}')) {
    const userVersion = await vscode.window.showInputBox({
      prompt: 'Enter a concrete version to use instead of dynamic ${version} in product.json',
      placeHolder: '14.0.0-SNAPSHOT'
    });
    if (userVersion) {
      productJson = productJson.replace(/\$\{version\}/g, userVersion);
    }
  }
  return productJson;
}

async function selectProjects(productJson: string) {
  try {
    let product: MarketProduct | undefined = undefined;
    product = JSON.parse(productJson);
    for (const installer of product?.installers ?? []) {
      if (installer.id === 'maven-import') {
        const data = installer.data as MavenProjectInstaller;
        const projectItems = data.projects.map(project => ({
          label: `${project.artifactId} (${project.groupId})`,
          picked: typeof project.importInWorkspace !== 'boolean' ? true : project.importInWorkspace
        }));
        const selected = await vscode.window.showQuickPick(projectItems, {
          canPickMany: true,
          placeHolder: 'Select projects to import'
        });
        data.projects.forEach((project, idx) => {
          const label = projectItems[idx]?.label ?? '';
          project.importInWorkspace = Array.isArray(selected) && label !== '' && selected.some(item => item.label === label);
        });
      }
    }
    productJson = JSON.stringify(product);
  } catch (e) {
    logErrorMessage('Failed to parse product.json as JSON: ' + (e instanceof Error ? e.message : e));
  }
  return productJson;
}
