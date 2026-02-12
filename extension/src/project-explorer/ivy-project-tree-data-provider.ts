import fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { Command } from '../base/commands';
import { config } from '../base/configurations';
import { CmsEditorRegistry } from '../editors/cms-editor/cms-editor-registry';
import { IvyProjectExplorer } from './ivy-project-explorer';

interface IvyCommand extends vscode.Command {
  command: Command;
}

export interface Entry {
  uri: vscode.Uri;
  type: vscode.FileType;
  iconPath?: string | vscode.IconPath;
  contextValue?: string;
  parent?: Entry;
  collapsibleState?: vscode.TreeItemCollapsibleState;
  command?: IvyCommand;
}

export const IVY_RPOJECT_FILE_PATTERN = '**/{.ivyproject,.project}';
const IVY_PROJECT_CONTEXT_VALUE = 'ivyProject';

export const isIvyProject = (projectFile: vscode.Uri) => {
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

export class IvyProjectTreeDataProvider implements vscode.TreeDataProvider<Entry> {
  private ivyProjects: Promise<string[]>;
  private _onDidChangeTreeData = new vscode.EventEmitter<Entry | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private entryCache = new Map<string, Entry>();

  private readonly excludePattern: string;
  private readonly maxResults: number;

  constructor() {
    this.excludePattern = config.projectExcludePattern() ?? '';
    this.maxResults = config.projectMaximumNumber() ?? 50;
    this.ivyProjects = this.findIvyProjects();
  }

  private cacheEntry(entry: Entry) {
    this.entryCache.set(entry.uri.fsPath, entry);
  }

  public findEntry(uri: vscode.Uri) {
    return this.entryCache.get(uri.fsPath);
  }

  private async findIvyProjects(): Promise<string[]> {
    return (await vscode.workspace.findFiles(IVY_RPOJECT_FILE_PATTERN, this.excludePattern, this.maxResults))
      .filter(p => isIvyProject(p))
      .map(p => path.dirname(p.fsPath))
      .sort();
  }

  async hasIvyProjects(): Promise<boolean> {
    return (await this.ivyProjects).length > 0;
  }

  async getIvyProjects(): Promise<string[]> {
    return this.ivyProjects;
  }

  refresh() {
    this.ivyProjects = this.findIvyProjects();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Entry): vscode.TreeItem {
    const collapsibleState = this.collapsibleStateOf(element);
    const treeItem = new vscode.TreeItem(element.uri, collapsibleState);
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

  private collapsibleStateOf(element: Entry): vscode.TreeItemCollapsibleState {
    if (element.collapsibleState !== undefined) {
      return element.collapsibleState;
    }
    if (element.type !== vscode.FileType.Directory) {
      return vscode.TreeItemCollapsibleState.None;
    }
    if (CmsEditorRegistry.find(element.uri.fsPath)?.active) {
      return vscode.TreeItemCollapsibleState.Expanded;
    }
    return vscode.TreeItemCollapsibleState.Collapsed;
  }

  async getParent(element: Entry): Promise<Entry | undefined> {
    return element.parent;
  }

  async getChildren(element?: Entry): Promise<Entry[]> {
    if (element) {
      return [this.cmsEntry(element)];
    }
    return (await this.ivyProjects).map(dir => this.createAndCacheRoot(dir));
  }

  private createAndCacheRoot(ivyProjectDir: string): Entry {
    const entry = {
      uri: vscode.Uri.file(ivyProjectDir),
      type: vscode.FileType.Directory,
      iconPath: path.join(__dirname, '..', 'assets', 'ivy-logo-black-background.svg'),
      contextValue: IVY_PROJECT_CONTEXT_VALUE
    };
    this.cacheEntry(entry);
    return entry;
  }

  private cmsEntry(element: Entry) {
    const uri = vscode.Uri.joinPath(element.uri, 'cms');
    const entry: Entry = {
      uri,
      type: vscode.FileType.File,
      parent: element,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      iconPath: {
        light: vscode.Uri.file(path.join(__dirname, '..', 'assets', 'light', 'cms.svg')),
        dark: vscode.Uri.file(path.join(__dirname, '..', 'assets', 'dark', 'cms.svg'))
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
