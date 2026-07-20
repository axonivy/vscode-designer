import fs from 'fs';
import * as path from 'path';
import {
  Diagnostic,
  DiagnosticSeverity,
  EventEmitter,
  FileType,
  Range,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  workspace,
  type IconPath,
  type TreeDataProvider,
  type Command as VSCodeCommand
} from 'vscode';
import { executeCommand, type Command } from '../base/commands';
import { config } from '../base/configurations';
import { CmsEditorRegistry } from '../editors/cms-editor/cms-editor-registry';
import { IvyProjectExplorer } from './ivy-project-explorer';

const __dirname = import.meta.dirname;
interface IvyCommand extends VSCodeCommand {
  command: Command;
}

export interface Entry {
  uri: Uri;
  type: FileType;
  iconPath?: string | IconPath;
  contextValue?: string;
  parent?: Entry;
  collapsibleState?: TreeItemCollapsibleState;
  command?: IvyCommand;
}

export const IVY_RPOJECT_FILE_PATTERN = '**/{.ivyproject,.project}';
const IVY_PROJECT_CONTEXT_VALUE = 'ivyProject';

export const isIvyProject = (projectFile: Uri) => {
  const projectFilePath = projectFile.fsPath;
  try {
    if (path.basename(projectFilePath) === '.ivyproject') {
      return true;
    }
    const content = fs.readFileSync(projectFile.fsPath, 'utf8');
    return content.includes('<nature>ch.ivyteam.ivy.project.IvyProjectNature</nature>');
  } catch {
    return false;
  }
};

type ProjectFindResult = {
  projects: string[];
  diagnostics: Map<Uri, Diagnostic>;
};

export class IvyProjectTreeDataProvider implements TreeDataProvider<Entry> {
  private ivyProjects: Promise<ProjectFindResult>;
  private _onDidChangeTreeData = new EventEmitter<Entry | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private entryCache = new Map<string, Entry>();

  private readonly excludePattern: string;
  private readonly maxResults: number;

  constructor(readonly initPromise: Promise<void> | undefined) {
    this.excludePattern = config.projectExcludePattern() ?? '';
    this.maxResults = config.projectMaximumNumber() ?? 50;
    this.ivyProjects = this.findIvyProjects();
  }

  private cacheEntry(entry: Entry) {
    this.entryCache.set(entry.uri.fsPath, entry);
  }

  public findEntry(uri: Uri) {
    return this.entryCache.get(uri.fsPath);
  }

  private async findIvyProjects() {
    const projectFiles = await workspace.findFiles(IVY_RPOJECT_FILE_PATTERN, this.excludePattern, this.maxResults);
    const distinctProjectDirs = [...new Set(projectFiles.filter(p => isIvyProject(p)).map(p => path.dirname(p.fsPath)))];
    const projectsPerBaseName = new Map<string, string[]>();
    for (const projectDir of distinctProjectDirs) {
      const baseName = path.basename(projectDir).toLowerCase();
      projectsPerBaseName.set(baseName, [...(projectsPerBaseName.get(baseName) ?? []), projectDir]);
    }
    const validProjects: string[] = [];
    const diagnostics = new Map<Uri, Diagnostic>();
    [...projectsPerBaseName.entries()].forEach(([baseName, projectDirs]) => {
      if (projectDirs.length === 1 && projectDirs[0]) {
        validProjects.push(projectDirs[0]);
      } else if (projectDirs.length > 1) {
        projectDirs.forEach(dir => {
          const message = `Multiple project directories with the same name '${baseName}' found: ${projectDirs.join(', ')}. Please cleanup the workspace.`;
          diagnostics.set(Uri.file(dir), new Diagnostic(new Range(0, 0, 0, 0), message, DiagnosticSeverity.Error));
        });
      }
    });
    await executeCommand('setContext', 'ivy:hasIvyProjects', validProjects.length > 0);
    return { projects: validProjects.sort(), diagnostics };
  }

  async hasIvyProjects(): Promise<boolean> {
    return (await this.ivyProjects).projects.length > 0;
  }

  async getIvyProjects(): Promise<string[]> {
    return this.ivyProjects.then(result => result.projects);
  }

  async getDiagnostics(): Promise<Map<Uri, Diagnostic>> {
    return this.ivyProjects.then(result => result.diagnostics);
  }

  refresh() {
    this.ivyProjects = this.findIvyProjects();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Entry): TreeItem {
    const collapsibleState = this.collapsibleStateOf(element);
    const treeItem = new TreeItem(element.uri, collapsibleState);
    if (element.command) {
      treeItem.command = element.command;
    }
    if (element.iconPath) {
      treeItem.iconPath = element.iconPath;
    }
    if (element.contextValue) {
      treeItem.contextValue = element.contextValue;
    }
    return treeItem;
  }

  private collapsibleStateOf(element: Entry): TreeItemCollapsibleState {
    if (element.collapsibleState !== undefined) {
      return element.collapsibleState;
    }
    if (element.type !== FileType.Directory) {
      return TreeItemCollapsibleState.None;
    }
    if (CmsEditorRegistry.find(element.uri.fsPath)?.active) {
      return TreeItemCollapsibleState.Expanded;
    }
    return TreeItemCollapsibleState.Collapsed;
  }

  async getParent(element: Entry): Promise<Entry | undefined> {
    return element.parent;
  }

  async getChildren(element?: Entry): Promise<Entry[]> {
    await this.initPromise;
    if (element) {
      return [this.cmsEntry(element)];
    }
    return (await this.ivyProjects).projects.map(dir => this.createAndCacheRoot(dir));
  }

  private createAndCacheRoot(ivyProjectDir: string): Entry {
    const entry = {
      uri: Uri.file(ivyProjectDir),
      type: FileType.Directory,
      iconPath: path.join(__dirname, '..', 'assets', 'ivy-logo-black-background.svg'),
      contextValue: IVY_PROJECT_CONTEXT_VALUE
    };
    this.cacheEntry(entry);
    return entry;
  }

  private cmsEntry(element: Entry) {
    const uri = Uri.joinPath(element.uri, 'cms');
    const entry: Entry = {
      uri,
      type: FileType.File,
      parent: element,
      collapsibleState: TreeItemCollapsibleState.None,
      iconPath: {
        light: Uri.file(path.join(__dirname, '..', 'assets', 'light', 'cms.svg')),
        dark: Uri.file(path.join(__dirname, '..', 'assets', 'dark', 'cms.svg'))
      },
      command: { command: 'ivyEditor.openCmsEditor', title: 'Open CMS Editor', arguments: [uri] }
    };
    this.cacheEntry(entry);
    if (CmsEditorRegistry.find(element.uri.fsPath)?.active) {
      IvyProjectExplorer.instance.selectEntry(entry);
    }
    return entry;
  }
}
