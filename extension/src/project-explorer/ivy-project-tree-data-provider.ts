import * as path from 'path';
import {
  EventEmitter,
  FileType,
  l10n,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  type TreeDataProvider,
  type Command as VSCodeCommand
} from 'vscode';
import type { KnownCommand } from '../base/commands';
import type { ProjectBean } from '../engine/api/generated/client';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IarContentFileSystemProvider, iarContentUri } from './iar-content-provider';
import { dependencyVersionOf } from './utils/util';

const __dirname = import.meta.dirname;
interface IvyCommand extends VSCodeCommand {
  command: KnownCommand;
}

export interface Entry {
  uri: Uri;
  type: FileType;
  label?: string;
  description?: string;
  tooltip?: string;
  iconPath?: TreeItem['iconPath'];
  collapsibleState?: TreeItemCollapsibleState;
  contextValue?: string;
  kind?: 'workspaceProject' | 'iarDependencyGroup' | 'iarDependency' | 'iarContentDirectory' | 'iarContentFile';
  parent?: Entry;
  command?: IvyCommand;
}

const IVY_PROJECT_CONTEXT_VALUE = 'ivyProject';
const IVY_PROJECT_REQUIRES_CONVERSION_CONTEXT_VALUE = 'requiresConversion';

export class IvyProjectTreeDataProvider implements TreeDataProvider<Entry> {
  private engineProjects?: Promise<ProjectBean[]>;
  private iarProjects?: Promise<ProjectBean[]>;
  private _onDidChangeTreeData = new EventEmitter<Entry | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private entryCache = new Map<string, Entry>();

  constructor(
    private readonly findWorkspaceProjects: () => Promise<string[]>,
    private readonly findEngineProjects: () => Promise<ProjectBean[] | undefined>,
    private readonly iarContentProvider = new IarContentFileSystemProvider()
  ) {}

  private cacheEntry(entry: Entry) {
    this.entryCache.set(entry.uri.fsPath, entry);
  }

  refresh() {
    this.engineProjects = undefined;
    this.iarProjects = undefined;
    this.iarContentProvider.refresh();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Entry): TreeItem {
    const projectNeedsConversion =
      element.kind === 'workspaceProject' &&
      IvyDiagnostics.instance
        .projectFileUrisToBeConverted()
        .map(uri => uri.fsPath)
        .map(projectFile => path.dirname(projectFile))
        .includes(element.uri.fsPath);

    const treeItem = element.label
      ? new TreeItem(element.label, element.collapsibleState)
      : new TreeItem(element.uri, element.collapsibleState);
    if (element.kind === 'iarContentDirectory' || element.kind === 'iarContentFile') {
      treeItem.resourceUri = element.uri;
    }
    if (projectNeedsConversion) {
      treeItem.description = '(needs conversion)';
    } else if (element.description) {
      treeItem.description = element.description;
    }
    if (element.tooltip) {
      treeItem.tooltip = element.tooltip;
    }
    if (element.command) {
      treeItem.command = element.command;
    }
    if (element.iconPath) {
      treeItem.iconPath = element.iconPath;
    }
    if (element.contextValue) {
      let itemContextValue = element.contextValue;
      itemContextValue += projectNeedsConversion ? `+${IVY_PROJECT_REQUIRES_CONVERSION_CONTEXT_VALUE}` : '';
      treeItem.contextValue = itemContextValue;
    }
    return treeItem;
  }

  async getParent(element: Entry): Promise<Entry | undefined> {
    return element.parent;
  }

  async getChildren(element?: Entry): Promise<Entry[]> {
    if (element?.kind === 'workspaceProject') {
      return (await this.getEngineIarDependenciesForWorkspaceProject(element.uri.fsPath)).length > 0 ? [this.createIarGroup(element)] : [];
    }
    if (element?.kind === 'iarDependencyGroup') {
      const dependencies = element.parent ? await this.getEngineIarDependenciesForWorkspaceProject(element.parent.uri.fsPath) : [];
      return Promise.all(
        dependencies.map(async depProject => {
          const depVersionProject = depProject.version;
          const depVersionPom = element.parent
            ? await dependencyVersionOf(element.parent.uri.fsPath, depProject.groupId, depProject.artifactId)
            : undefined;
          const versionsMatch = depVersionPom === depVersionProject;
          return {
            uri: iarContentUri(depProject.projectDirectory, 'META-INF/ivy'),
            type: FileType.Directory,
            label: depProject.artifactId,
            description: versionsMatch ? depVersionProject : l10n.t('Version error'),
            tooltip: versionsMatch
              ? `${depProject.groupId}:${depProject.artifactId}:${depVersionProject}`
              : l10n.t('Dependency version error. There are conflicting versions specified. Check the Problems view.'),
            iconPath: new ThemeIcon('lock', versionsMatch ? undefined : new ThemeColor('problemsErrorIcon.foreground')),
            collapsibleState: TreeItemCollapsibleState.Collapsed,
            kind: 'iarDependency' as const,
            parent: element
          };
        })
      );
    }
    if (element?.kind === 'iarDependency' || element?.kind === 'iarContentDirectory') {
      return this.getIarContentChildren(element);
    }
    if (element) {
      return [];
    }
    const projectDirectories = await this.findWorkspaceProjects();
    return Promise.all(
      projectDirectories.map(async dir =>
        this.createAndCacheRoot(dir, (await this.getEngineIarDependenciesForWorkspaceProject(dir)).length > 0)
      )
    );
  }

  private getEngineProjects() {
    this.engineProjects ??= this.findEngineProjects().then(projects => projects ?? []);
    return this.engineProjects;
  }

  private async getIarProjects() {
    this.iarProjects ??= this.getEngineProjects().then(projects =>
      projects
        .filter(project => project.id.isIar)
        .sort((a, b) => {
          const aCoordinate = `${a.groupId}:${a.artifactId}:${a.version}`;
          const bCoordinate = `${b.groupId}:${b.artifactId}:${b.version}`;
          return aCoordinate.localeCompare(bCoordinate);
        })
    );
    return this.iarProjects;
  }

  private async getEngineIarDependenciesForWorkspaceProject(projectDirectory: string) {
    const [engineProjects, iarProjects] = await Promise.all([this.getEngineProjects(), this.getIarProjects()]);
    const workspaceProject = engineProjects.find(
      project => !project.id.isIar && path.resolve(project.projectDirectory) === path.resolve(projectDirectory)
    );
    if (!workspaceProject) {
      return [];
    }
    const dependencyIds = new Set(workspaceProject.dependencies.map(dependency => dependency.id));
    return iarProjects.filter(project => dependencyIds.has(project.id.id));
  }

  private getIarContentChildren(parent: Entry): Entry[] {
    return this.iarContentProvider
      .readDirectory(parent.uri)
      .sort(([aName, aType], [bName, bType]) => {
        if (aType !== bType) {
          return aType === FileType.Directory ? -1 : 1;
        }
        return aName.localeCompare(bName);
      })
      .map(([name, type]) => {
        const uri = Uri.joinPath(parent.uri, name);
        const isDirectory = type === FileType.Directory;
        return {
          uri,
          type,
          label: name,
          collapsibleState: isDirectory ? TreeItemCollapsibleState.Collapsed : undefined,
          kind: isDirectory ? 'iarContentDirectory' : 'iarContentFile',
          command: isDirectory ? undefined : { command: 'vscode.openWith', title: 'Open', arguments: [uri, 'default'] },
          parent
        };
      });
  }

  private createIarGroup(parent: Entry): Entry {
    return {
      uri: Uri.parse('axonivy:iar-dependencies'),
      type: FileType.Directory,
      label: l10n.t('IAR Dependencies'),
      iconPath: new ThemeIcon('library'),
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      kind: 'iarDependencyGroup',
      parent
    };
  }

  private createAndCacheRoot(ivyProjectDir: string, hasIarDependencies: boolean): Entry {
    const entry: Entry = {
      uri: Uri.file(ivyProjectDir),
      type: FileType.Directory,
      iconPath: path.join(__dirname, '..', 'assets', 'ivy-logo-black-background.svg'),
      collapsibleState: hasIarDependencies ? TreeItemCollapsibleState.Collapsed : undefined,
      contextValue: IVY_PROJECT_CONTEXT_VALUE,
      kind: 'workspaceProject'
    };
    this.cacheEntry(entry);
    return entry;
  }
}
