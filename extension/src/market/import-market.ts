import path from 'path';
import { Uri, window, workspace, type QuickPickItem } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { ProductInstallParams } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import type { AddCommandSelectionContext } from '../project-explorer/ivy-project-explorer';
import {
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  type InputStep,
  type MSStateBase,
  type ProjectSelection
} from '../project-explorer/utils/multi-step-input';
import type { Dependency, Installer, MarketProduct, MavenDependencyInstaller, MavenProjectInstaller } from './generated/market-product';
import { fetchInstaller, getAvailableVersions, getBestVersion, searchMarketProduct } from './market-client';

interface ProductSelection extends QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  iconPath?: Uri;
}

interface ProductProjectSelection extends QuickPickItem {
  label: string;
  mavenType: 'maven-import' | 'maven-dependency';
  artifactId?: string;
  groupId?: string;
  isPicked: boolean;
}

interface InstallMarketProductState extends MSStateBase {
  product?: ProductSelection;
  productJson?: string;
  version?: string;
  projects?: ProductProjectSelection[];
  projectsSearchString?: string;
  changedProjectSelection?: boolean;
  dependentProject?: ProjectSelection;
  dependentProjectFilterText?: string;
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

export const installMarketProduct = async (selectionContext: AddCommandSelectionContext, extensionVersion: string) => {
  const existingProjects = selectionContext.existingIvyProjects;
  let projectFromSelection = selectionContext.projectPathSelection;
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
      matchOnDescription: true,
      matchOnDetail: true,
      items: allProducts.map(product => ({
        id: product.id,
        label: product.name,
        description: product.id,
        detail: product.description,
        iconPath: Uri.parse(product.logoUrl)
      }))
    });
    if (previousProduct?.id !== state.product?.id) {
      state.projects = undefined;
      state.version = undefined;
    }
  };

  const stepVersion: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const availableVersions = state.product ? await getAvailableVersions(state.product.id ?? '') : [];
    // TODO: Use extensionVersion or engineVersion?
    const bestVersion = await getBestVersion(state.product?.id ?? '', extensionVersion);

    const previousVersion = state.version;
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
    if (previousVersion !== state.version) {
      state.projects = undefined;
    }
  };

  const stepProjects: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    const productJson = await fetchInstaller(state.product?.id ?? '', state.version ?? '');
    const product = parseProduct(productJson ?? '');
    const projectItems = parseAvailableProjectItems(product);
    let initialProjectSelection: ProductProjectSelection[] | undefined = undefined;
    if (!state.changedProjectSelection) {
      initialProjectSelection = projectItems.filter(project => project.isPicked);
      state.changedProjectSelection = true;
    }

    // TODO: Don't show products that have minimumIvyVersion set and higher than current Ivy version?

    state.projects = await input.showQuickPick<ProductProjectSelection, true>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Projects of Product to Import',
      placeholder: 'Select projects to import',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      canSelectMany: true,
      value: state.projectsSearchString,
      items: projectItems,
      selectedItems: initialProjectSelection ?? state.projects ?? [],
      onBack: (typedValue: string, selectedItems: ProductProjectSelection[]) => {
        state.projectsSearchString = typedValue;
        state.projects = selectedItems;
      }
    });
    state.productJson = markProjectsForImport(productJson, state.projects ?? []);
  };

  const stepDependentProject: InputStep<InstallMarketProductState> = async (
    input: MultiStepInput<InstallMarketProductState>,
    state: InstallMarketProductState
  ) => {
    if (!isIvyProjectSelectionRequired(state.projects ?? [])) {
      return;
    } else {
      if (existingProjects.length === 0) {
        throw new MultiStepCancelledError(
          'At least one existing Ivy project is required for installing this Market Product. No Axon Ivy projects in the workspace. Create an Axon Ivy project first.'
        );
      }
    }

    let dependentProjectFilterText: string | undefined = undefined;
    if (projectFromSelection) {
      dependentProjectFilterText = projectFromSelection.substring(projectFromSelection.lastIndexOf(path.sep) + 1);
      projectFromSelection = undefined;
    }
    state.dependentProject = await input.showQuickPick<ProjectSelection>({
      title: state.dialogTitle,
      titleSuffix: ' - Choose Ivy Project to install Product into',
      placeholder: 'Select one of the available projects',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: dependentProjectFilterText ?? state.dependentProjectFilterText,
      items: existingProjects.map(project => {
        return {
          label: project.substring(project.lastIndexOf(path.sep) + 1),
          description: project,
          path: project
        };
      }),
      onBack: (typedValue: string) => {
        state.dependentProjectFilterText = typedValue;
      }
    });
  };

  const steps: InputStep<InstallMarketProductState>[] = [stepProduct, stepVersion, stepProjects, stepDependentProject];

  const installMarketProductData: InstallMarketProductState = {
    dialogTitle: 'Install Market Product',
    currentStep: 1,
    totalSteps: steps.length,
    changedProjectSelection: false
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

  if (!installMarketProductData.productJson) {
    throw new MultiStepInvalidStateError(
      'Market Product installation failed due to corrupted input state. ProductJson is not set. Current input state: ' +
        JSON.stringify(installMarketProductData)
    );
  }

  try {
    const installMarketProductInput: ProductInstallParams = {
      productJson: installMarketProductData.productJson,
      dependentProjectPath: installMarketProductData.dependentProject?.path ?? ''
    };
    await IvyEngineManager.instance.installMarketProduct(installMarketProductInput);
  } catch (err) {
    logErrorMessage('Market installation failed: ' + (err instanceof Error ? err.message : err));
  }
};

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

const isIvyProjectSelectionRequired = (products: ProductProjectSelection[]) => {
  if (products.some(project => project.mavenType === 'maven-dependency')) {
    return true;
  }
  return false;
};

const sortAvailableProjects = (projects: ProductProjectSelection[]) => {
  projects.sort((p1, p2) => {
    if (p1.mavenType === p2.mavenType) {
      return p1.label.localeCompare(p2.label);
    }
    return p1.mavenType === 'maven-dependency' ? -1 : 1;
  });
  return projects;
};

const parseAvailableProjectItems = (product: MarketProduct): ProductProjectSelection[] => {
  if (!product.installers || product.installers.length === 0) {
    throw new Error('No installers found in product.json');
  }
  const availableProjects: ProductProjectSelection[] = [];
  for (const installer of product.installers) {
    switch (installer.id) {
      case 'maven-import': {
        const data = installer.data as MavenProjectInstaller;
        availableProjects.push(
          ...data.projects.map(project => ({
            label: `👁️ ${project.artifactId} (${project.groupId})`,
            mavenType: 'maven-import' as const,
            artifactId: project.artifactId ?? '',
            groupId: project.groupId ?? '',
            isPicked: typeof project.importInWorkspace !== 'boolean' ? true : project.importInWorkspace
          }))
        );
        break;
      }
      case 'maven-dependency': {
        const data = installer.data as MavenDependencyInstaller;
        availableProjects.push(
          ...(data.dependencies?.map(dependency => ({
            label: `🔧 ${dependency.artifactId} (${dependency.groupId})`,
            mavenType: 'maven-dependency' as const,
            artifactId: dependency.artifactId ?? '',
            groupId: dependency.groupId ?? '',
            isPicked: true
          })) ?? [])
        );
        break;
      }
      default:
        throw new Error(`Unsupported installer type: ${installer.id}`);
    }
  }
  return sortAvailableProjects(availableProjects);
};

const markProjectsForImport = (productJson: string, selectedProjects: ProductProjectSelection[]): string => {
  const product = parseProduct(productJson);
  if (!product.installers || product.installers.length === 0) {
    throw new Error('No installers found in product.json');
  }
  for (const installer of product.installers) {
    switch (installer.id) {
      case 'maven-import': {
        const dataProjectInstaller = installer.data as MavenProjectInstaller;
        const projects = dataProjectInstaller.projects;
        projects.forEach(project => {
          project.importInWorkspace = selectedProjects.some(sp => sp.artifactId === project.artifactId && sp.groupId === project.groupId);
        });
        break;
      }
      case 'maven-dependency': {
        const dataDependencyInstaller = installer.data as MavenDependencyInstaller;
        const selectedDependencies: Dependency[] = [];
        const allDependencies = dataDependencyInstaller.dependencies ?? [];
        allDependencies.forEach(dependency => {
          const isSelected = selectedProjects.some(sp => sp.artifactId === dependency.artifactId && sp.groupId === dependency.groupId);
          if (isSelected) {
            selectedDependencies.push(dependency);
          }
        });
        installer.data.dependencies = selectedDependencies;
        break;
      }
      default:
        throw new Error(`Unsupported installer type: ${installer.id}`);
    }
  }

  const filteredInstallers: Installer[] = product.installers.filter(installer => {
    if (!installer) return false;
    switch (installer.id) {
      case 'maven-import': {
        const dataProjectInstaller = installer.data as MavenProjectInstaller;
        const projects = dataProjectInstaller.projects;
        return projects.length > 0;
      }
      case 'maven-dependency': {
        const dataDependencyInstaller = installer.data as MavenDependencyInstaller;
        const dependencies = dataDependencyInstaller.dependencies ?? [];
        return dependencies.length > 0;
      }
      default:
        throw new Error(`Unsupported installer type: ${installer.id}`);
    }
  });

  product.installers = filteredInstallers;
  return JSON.stringify(product);
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
