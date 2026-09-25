import { QuickPickItemKind } from 'vscode';
import type { ProjectSelection } from '../../project-explorer/utils/multi-step-input';
import type {
  Installer,
  MarketProduct,
  MavenDependencyInstaller,
  MavenProjectInstaller,
  ProjectDependency
} from '../generated/market-product';
import type { ProductProjectSelection } from './market-install-types';

export const parseProduct = (productJson: string) => {
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
};

export const markProjectsForImport = (productJson: string, selectedProjects: ProductProjectSelection[]): string => {
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
        const selectedDependencies: ProjectDependency[] = [];
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

export const isIvyProjectSelectionRequired = (products: ProductProjectSelection[]) => {
  if (products.some(project => project.mavenType === 'maven-dependency')) {
    return true;
  }
  return false;
};

export const sortAvailableProjects = (projects: ProductProjectSelection[]) => {
  projects.sort((p1, p2) => {
    if (p1.mavenType === p2.mavenType) {
      return p1.label.localeCompare(p2.label);
    }
    return p1.mavenType === 'maven-dependency' ? -1 : 1;
  });
  return projects;
};

export const parseAvailableProjectItems = (product: MarketProduct): ProductProjectSelection[] => {
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
            isPicked: typeof dependency.optional !== 'boolean' ? true : !dependency.optional,
            requireOneOfGroup: dependency.requireOneOfGroup
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

export const buildGroupedItems = (requiredItems: ProductProjectSelection[]): ProductProjectSelection[] => {
  const groups = new Map<string, ProductProjectSelection[]>();
  for (const item of requiredItems) {
    const group = item.requireOneOfGroup ?? '';
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  return [...groups.entries()].flatMap(([groupName, items]) => [
    { label: groupName, kind: QuickPickItemKind.Separator } as ProductProjectSelection,
    ...items
  ]);
};

export const validateProjectSelection = (
  selectedProjects: Array<ProductProjectSelection>,
  existingProjects: Array<ProjectSelection>
): string | undefined => {
  const conflictingProjects = selectedProjects.filter(
    project => project.artifactId && existingProjects.some(existing => existing.label === project.artifactId)
  );
  if (conflictingProjects.length > 0) {
    return `The following projects cannot be installed because a project folder with the same name already exists: ${conflictingProjects.map(p => p.artifactId).join(', ')}`;
  }
};

export const validateDependencySelection = (
  allProjects: ProductProjectSelection[],
  selectedProjects: ProductProjectSelection[]
): string | undefined => {
  const requiredGroups = new Set(allProjects.map(p => p.requireOneOfGroup).filter((r): r is string => !!r));
  const selectedRequiredGroups = new Set(selectedProjects.map(p => p.requireOneOfGroup).filter((r): r is string => !!r));

  const missingGroups = [...requiredGroups].filter(group => !selectedRequiredGroups.has(group));
  if (missingGroups.length > 0) {
    return `Select at least one dependency from each required group: ${missingGroups.join(', ')}.`;
  }
  return undefined;
};
