import { Uri, window, workspace, type QuickPickItem } from 'vscode';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import type { ProductInstallParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import type { AddCommandSelectionContext } from '../project-explorer/ivy-project-explorer';
import { MultiStepCancelledError, MultiStepInput, type InputStep, type MSStateBase } from '../project-explorer/utils/multi-step-input';
import type { MarketProduct, MavenDependencyInstaller, MavenProjectInstaller } from './generated/market-product';
import { fetchInstaller, getAvailableVersions, getBestVersion, searchMarketProduct, type Product } from './market-client';

interface ProductSelection extends QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  iconPath?: Uri;
}

interface ProjectSelection extends QuickPickItem {
  label: string;
  picked?: boolean;
  isEditable?: boolean;
}

interface InstallMarketProductState extends MSStateBase {
  product?: ProductSelection;
  version?: string;
  projects?: ProjectSelection[];
  projectsSearchString?: string;
  // productJson?: string;
}

export const importMarketProductFile = async (projectDir: () => Promise<string>) => {
  try {
    const input = await collectLocalProductJson(projectDir);
    await IvyEngineManager.instance.installMarketProduct(input);
  } catch (err) {
    logErrorMessage('Market installation failed: ' + (err instanceof Error ? err.message : err));
  }
};

const collectLocalProductJson = async (projectDir: () => Promise<string>): Promise<ProductInstallParams> => {
  let productJson = await readProductJsonFromFile();
  productJson = await replaceDynamicVersion(productJson);
  const product = parseProduct(productJson);
  productJson = await selectProjects(product);
  return { productJson, dependentProjectPath: await projectDir() };
};

async function readProductJsonFromFile() {
  const productInstaller = await window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Select a product.json file to Import'
  });
  if (!productInstaller || productInstaller.length === 0 || !productInstaller[0]) {
    throw new Error('Cannot pick product.json file.');
  }
  const fileData = await workspace.fs.readFile(productInstaller[0]);
  const decoder = new TextDecoder('utf-8');
  const productJson = decoder.decode(fileData);
  return productJson;
}

export const importMarketProduct = async (selectionContext: AddCommandSelectionContext, extensionVersion: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const existingProjects = selectionContext.existingIvyProjects;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const projectFromSelection = selectionContext.projectPathSelection;
  const allProducts = await searchMarketProduct();

  const stepProduct: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const previousProduct = state.product;
    state.product = await input.showQuickPick<ProductSelection>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose available Market Product',
      placeholder: 'Select a Market Product to install',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.product ? state.product.label : '',
      items: allProducts.map(product => ({
        id: product.id,
        label: product.name,
        description: product.id,
        detail: product.description,
        iconPath: Uri.parse(product.logoUrl)
      }))
    });
    if (previousProduct?.id !== state.product?.id) {
      logInformationMessage('TODO Product selection ID changed, resetting version and project selection');
    }
  };

  const stepVersion: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const availableVersions = state.product ? await getAvailableVersions(state.product.id ?? '') : [];
    const bestVersion = await getBestVersion(state.product?.id ?? '', extensionVersion);

    const version = await input.showQuickPick({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Version',
      placeholder: 'Select a Market Product version to install',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.version ?? (availableVersions.includes(bestVersion) ? bestVersion : ''),
      items: availableVersions.map(version => ({ label: version })),
      onBack: (typedValue: string) => {
        state.version = typedValue;
      }
    });
    state.version = version.label;
  };

  const stepProjects: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const productJson = await fetchInstaller(state.product?.id ?? '', state?.version ?? '');
    const product = parseProduct(productJson);
    const projectItems = parseAvailableProjects(product);

    state.projects = await input.showQuickPick<ProjectSelection, true>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Projects to Import',
      placeholder: 'Select projects to import',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      canSelectMany: true,
      value: state.projectsSearchString,
      selectedItems: state.projects ?? [],
      items: projectItems,
      onBack: (typedValue: string, selectedItems: ProjectSelection[]) => {
        state.projectsSearchString = typedValue;
        state.projects = selectedItems;
      }
    });
  };

  const steps: InputStep<InstallMarketProductState>[] = [stepProduct, stepVersion, stepProjects];

  const installMarketProductData: InstallMarketProductState = {
    dialogTitle: 'Install Market Product',
    currentStep: 1,
    totalSteps: steps.length
  };

  try {
    await new MultiStepInput<InstallMarketProductState>().stepThrough(steps, installMarketProductData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      logErrorMessage(err.message);
      return;
    } else {
      throw err;
    }
  }

  // const input: ProductInstallParams = await searchProduct(projectDir);
  // await IvyEngineManager.instance.installMarketProduct(input);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const searchProduct = async (projectDir: () => Promise<string>): Promise<ProductInstallParams> => {
  const products = await searchMarketProduct();
  const productId = await selectProduct(products);
  const versions = await getAvailableVersions(productId);
  const version = await selectVersion(versions);
  let productJson = await fetchInstaller(productId, version);
  const product = parseProduct(productJson);
  productJson = await selectProjects(product);
  return { productJson, dependentProjectPath: await projectDir() };
};

async function selectVersion(versions: string[]) {
  const selected = await window.showQuickPick(versions, {
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
    iconPath: Uri.parse(product.logoUrl)
  }));
  const selected = await window.showQuickPick(items, {
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
    const userVersion = await window.showInputBox({
      title: 'Resolve dynamic ${version} in product.json',
      prompt: 'Enter a Maven version, which you made locally available by running `mvn clean install` from your product workspace.',
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
  let product: MarketProduct | undefined;
  try {
    product = JSON.parse(productJson);
  } catch (e) {
    throw new Error('Failed to parse product.json as JSON: ' + (e instanceof Error ? e.message : e), { cause: e });
  }
  if (product === undefined || product.installers === undefined) {
    throw new Error('Invalid product.json: No installers found.');
  }
  return product;
}

const parseAvailableProjects = (product: MarketProduct): ProjectSelection[] => {
  if (!product.installers || product.installers.length === 0) {
    throw new Error('No installers found in product.json');
  }
  const availableProjects: ProjectSelection[] = [];
  for (const installer of product.installers) {
    switch (installer.id) {
      case 'maven-import': {
        const data = installer.data as MavenProjectInstaller;
        availableProjects.push(
          ...data.projects.map(project => ({
            label: `${project.artifactId} (${project.groupId})`,
            picked: typeof project.importInWorkspace !== 'boolean' ? true : project.importInWorkspace,
            isEditable: true
          }))
        );
        break;
      }
      case 'maven-dependency': {
        const data = installer.data as MavenDependencyInstaller;
        availableProjects.push(
          ...(data.dependencies?.map(dependency => ({
            label: `${dependency.artifactId} (${dependency.groupId})`,
            picked: true,
            isEditable: false
          })) ?? [])
        );
        break;
      }
      default:
        throw new Error(`Unsupported installer type: ${installer.id}`);
    }
  }
  return availableProjects;
};

async function selectProjects(product: MarketProduct) {
  for (const installer of product?.installers ?? []) {
    if (installer.id === 'maven-import') {
      const data = installer.data as MavenProjectInstaller;
      const projectItems = data.projects.map(project => ({
        label: `${project.artifactId} (${project.groupId})`,
        picked: typeof project.importInWorkspace !== 'boolean' ? true : project.importInWorkspace
      }));
      const selected = await window.showQuickPick(projectItems, {
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
