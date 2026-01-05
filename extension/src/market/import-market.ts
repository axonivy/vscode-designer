import * as vscode from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { ProductInstallParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { availableVersions, fetchInstaller, Product, searchMarketProduct } from './market-client';
import { MarketProduct, MavenProjectInstaller } from './market-product';

export const importMarketProductFile = async (projectDir: string) => {
  try {
    const input = await collectLocalProductJson(projectDir);
    await IvyEngineManager.instance.installMarketProduct(input);
  } catch (err) {
    logErrorMessage('Market installation failed: ' + (err instanceof Error ? err.message : err));
  }
};

const collectLocalProductJson = async (projectDir: string): Promise<ProductInstallParams> => {
  let productJson = await readProductJsonFromFile();
  productJson = await replaceDynamicVersion(productJson);
  const product = parseProduct(productJson);
  productJson = await selectProjects(product);
  return { productJson, dependentProjectPath: projectDir };
};

async function readProductJsonFromFile() {
  const productInstaller = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Select a product.json file to Import'
  });
  if (!productInstaller || productInstaller.length === 0 || !productInstaller[0]) {
    throw new Error('Cannot pick product.json file.');
  }
  const fileData = await vscode.workspace.fs.readFile(productInstaller[0]);
  const decoder = new TextDecoder('utf-8');
  const productJson = decoder.decode(fileData);
  return productJson;
}

export const importMarketProduct = async (projectDir: string) => {
  try {
    const input = await searchProduct(projectDir);
    await IvyEngineManager.instance.installMarketProduct(input);
  } catch (err) {
    logErrorMessage('Import from Market failed: ' + (err instanceof Error ? err.message : err));
  }
};

const searchProduct = async (projectDir: string): Promise<ProductInstallParams> => {
  const products = await searchMarketProduct();
  const productId = await selectProduct(products);
  const versions = await availableVersions(productId);
  const version = await selectVersion(versions);
  let productJson = await fetchInstaller(productId, version);
  const product = parseProduct(productJson);
  productJson = await selectProjects(product);
  return { productJson, dependentProjectPath: projectDir };
};

async function selectVersion(versions: string[]) {
  const selected = await vscode.window.showQuickPick(versions, {
    placeHolder: 'Select a version to install',
    canPickMany: false
  });
  if (!selected) {
    throw new Error('No version selected by user');
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
    throw new Error('No product selected by user');
  }
  return selected.description;
}

async function replaceDynamicVersion(productJson: string) {
  if (productJson.includes('${version}')) {
    const userVersion = await vscode.window.showInputBox({
      prompt: 'Enter a concrete version to use instead of dynamic ${version} in product.json',
      placeHolder: '14.0.0-SNAPSHOT'
    });
    if (!userVersion) {
      throw new Error('No version provided for ${version}');
    }
    productJson = productJson.replace(/\$\{version\}/g, userVersion);
  }
  return productJson;
}

function parseProduct(productJson: string) {
  let product: MarketProduct | undefined = undefined;
  try {
    product = JSON.parse(productJson);
  } catch (e) {
    throw new Error('Failed to parse product.json as JSON: ' + (e instanceof Error ? e.message : e));
  }
  if (product === undefined || product.installers === undefined) {
    throw new Error('Invalid product.json: No installers found.');
  }
  return product;
}

async function selectProjects(product: MarketProduct) {
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
      if (!selected) {
        throw new Error('No projects selected by user');
      }
      data.projects.forEach((project, idx) => {
        const label = projectItems[idx]?.label ?? '';
        project.importInWorkspace = Array.isArray(selected) && label !== '' && selected.some(item => item.label === label);
      });
    }
  }
  return JSON.stringify(product);
}
