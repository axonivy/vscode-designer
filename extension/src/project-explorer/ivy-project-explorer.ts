import path from 'path';
import * as vscode from 'vscode';
import { Command, executeCommand, registerCommand } from '../base/commands';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { Entry, IVY_RPOJECT_FILE_PATTERN, IvyProjectTreeDataProvider } from './ivy-project-tree-data-provider';
import { addNewDataClass } from './new-data-class';
import { ProcessKind, addNewProcess } from './new-process';
import { addNewProject } from './new-project';
import { DialogType, addNewUserDialog } from './new-user-dialog';
import { TreeSelection, treeSelectionToProjectPath, treeSelectionToUri } from './tree-selection';

export const VIEW_ID = 'ivyProjects';

export class IvyProjectExplorer {
  private static _instance: IvyProjectExplorer;
  private readonly treeDataProvider: IvyProjectTreeDataProvider;
  private readonly treeView: vscode.TreeView<Entry>;

  private constructor(context: vscode.ExtensionContext) {
    this.treeDataProvider = new IvyProjectTreeDataProvider();
    this.treeView = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: this.treeDataProvider, showCollapseAll: true });
    context.subscriptions.push(this.treeView);
    this.registerCommands(context);
    this.defineFileWatchers();
    vscode.window.tabGroups.onDidChangeTabs(async event => this.changeTabListener(event));
    this.treeDataProvider.onDidCreateTreeItem(entry => {
      this.revealActiveEntry(entry);
    });
    this.hasIvyProjects().then(hasIvyProjects =>
      this.setProjectExplorerActivationCondition(hasIvyProjects).then(() => this.activateEngineExtension(hasIvyProjects))
    );
  }

  static init(context: vscode.ExtensionContext) {
    if (!IvyProjectExplorer._instance) {
      IvyProjectExplorer._instance = new IvyProjectExplorer(context);
    }
    return IvyProjectExplorer._instance;
  }

  private registerCommands(context: vscode.ExtensionContext) {
    const engineManager = IvyEngineManager.instance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registerCmd = (command: Command, callback: (...args: any[]) => any) => registerCommand(command, context, callback);
    registerCmd(`${VIEW_ID}.refreshEntry`, () => this.refresh());
    registerCmd(`${VIEW_ID}.buildProject`, (s: TreeSelection) => this.runEngineAction((d: string) => engineManager.buildProject(d), s));
    registerCmd(`${VIEW_ID}.deployProject`, (s: TreeSelection) => this.runEngineAction((d: string) => engineManager.deployProject(d), s));
    registerCmd(`${VIEW_ID}.buildAndDeployProject`, (s: TreeSelection) =>
      this.runEngineAction((d: string) => engineManager.buildAndDeployProject(d), s)
    );
    registerCmd(`${VIEW_ID}.stopBpmEngine`, (s: TreeSelection) => this.runEngineAction((d: string) => engineManager.stopBpmEngine(d), s));
    registerCmd(`${VIEW_ID}.addBusinessProcess`, (s: TreeSelection) => this.addProcess(s, 'Business Process'));
    registerCmd(`${VIEW_ID}.addCallableSubProcess`, (s: TreeSelection) => this.addProcess(s, 'Callable Sub Process'));
    registerCmd(`${VIEW_ID}.addWebServiceProcess`, (s: TreeSelection) => this.addProcess(s, 'Web Service Process'));
    registerCmd(`${VIEW_ID}.addNewProject`, (s: TreeSelection) => addNewProject(s));
    registerCmd(`${VIEW_ID}.addNewHtmlDialog`, (s: TreeSelection, selections?: [TreeSelection], pid?: string) =>
      this.addUserDialog(s, 'JSF', pid)
    );
    registerCmd(`${VIEW_ID}.addNewFormDialog`, (s: TreeSelection, selections?: [TreeSelection], pid?: string) =>
      this.addUserDialog(s, 'Form', pid)
    );
    registerCmd(`${VIEW_ID}.addNewOfflineDialog`, (s: TreeSelection, selections?: [TreeSelection], pid?: string) =>
      this.addUserDialog(s, 'JSFOffline', pid)
    );
    registerCmd(`${VIEW_ID}.addNewDataClass`, (s: TreeSelection) => this.addDataClass(s));
    registerCmd(`${VIEW_ID}.revealInExplorer`, (entry: Entry) => executeCommand('revealInExplorer', this.getCmdEntry(entry)?.uri));
    registerCmd(`${VIEW_ID}.convertProject`, (s: TreeSelection) => this.convertProject(s));
  }

  private defineFileWatchers() {
    vscode.workspace.createFileSystemWatcher(IVY_RPOJECT_FILE_PATTERN, false, true, true).onDidCreate(async () => await this.refresh());
    vscode.workspace.createFileSystemWatcher('**/*', true, true, false).onDidDelete(e =>
      this.getIvyProjects()
        .then(projects => this.deleteProjectOnEngine(e, projects))
        .then(() => this.refresh())
    );
    vscode.workspace
      .createFileSystemWatcher('**/{cms,config,webContent}/**/*', true, false, true)
      .onDidChange(e => this.runEngineAction((d: string) => IvyEngineManager.instance.deployProject(d), e));
  }

  private deleteProjectOnEngine(uri: vscode.Uri, ivyProjects: string[]) {
    const filePath = uri.fsPath;
    for (const project of ivyProjects) {
      if (project === filePath || project.startsWith(uri.fsPath + path.sep)) {
        IvyEngineManager.instance.deleteProject(project);
      }
    }
  }

  private async hasIvyProjects(): Promise<boolean> {
    return this.treeDataProvider.hasIvyProjects();
  }

  private async refresh() {
    this.treeDataProvider.refresh();
    const hasIvyProjects = await this.hasIvyProjects();
    await this.setProjectExplorerActivationCondition(hasIvyProjects);
    await this.activateEngineExtension(hasIvyProjects);
    await IvyDiagnostics.instance.refresh(true);
  }

  private async runEngineAction(action: (projectDir: string) => Promise<void>, selection: TreeSelection) {
    treeSelectionToProjectPath(selection, this.getIvyProjects()).then(selectionPath => (selectionPath ? action(selectionPath) : {}));
  }

  public async addProcess(selection: TreeSelection, kind: ProcessKind, pid?: string) {
    const projectPath = await treeSelectionToProjectPath(selection, this.getIvyProjects());
    if (projectPath) {
      await addNewProcess(await treeSelectionToUri(selection), projectPath, kind, pid);
      return;
    }
    vscode.window.showErrorMessage('Add Process: no valid Axon Ivy Project selected.');
  }

  public async addUserDialog(selection: TreeSelection, type: DialogType, pid?: string) {
    const projectPath = await treeSelectionToProjectPath(selection, this.getIvyProjects());
    if (projectPath) {
      await addNewUserDialog(await treeSelectionToUri(selection), projectPath, type, pid);
      return;
    }
    vscode.window.showWarningMessage('Add User Dialog: no valid Axon Ivy Project selected.');
  }

  private async addDataClass(selection: TreeSelection) {
    const projectPath = await treeSelectionToProjectPath(selection, this.getIvyProjects());
    if (projectPath) {
      await addNewDataClass(await treeSelectionToUri(selection), projectPath);
      return;
    }
    vscode.window.showWarningMessage('Add Data Class: no valid Axon Ivy Project selected.');
  }

  public async setProjectExplorerActivationCondition(hasIvyProjects: boolean) {
    await executeCommand('setContext', 'ivy:hasIvyProjects', hasIvyProjects);
  }

  private async activateEngineExtension(hasIvyProjects: boolean) {
    if (hasIvyProjects) {
      await IvyEngineManager.instance.start();
    }
  }

  private changeTabListener(event: vscode.TabChangeEvent) {
    if (event.changed.length > 0) {
      this.syncProjectExplorerSelectionWithActiveTab();
    }
  }

  private syncProjectExplorerSelectionWithActiveTab() {
    const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input as { uri: vscode.Uri };
    if (tabInput && tabInput.uri && this.treeView.visible) {
      const entryPath = tabInput.uri.fsPath;
      const entry = this.treeDataProvider.getEntryCache().get(entryPath);
      if (entry) {
        this.treeView.reveal(entry, { expand: true });
        return;
      }
      this.refreshRecursively(path.dirname(entryPath));
    }
  }

  private refreshRecursively(entryPath: string) {
    const entry = this.treeDataProvider.getEntryCache().get(entryPath);
    if (entry) {
      this.treeDataProvider.refreshSubtree(entry);
      return;
    }
    const parentEntryPath = path.dirname(entryPath);
    if (vscode.workspace.getWorkspaceFolder(vscode.Uri.file(parentEntryPath))) {
      this.refreshRecursively(parentEntryPath);
    }
  }

  private revealActiveEntry(entry: Entry) {
    const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input as { uri: vscode.Uri };
    if (tabInput && tabInput.uri && this.treeView.visible) {
      if (tabInput.uri.path.startsWith(entry.uri.path)) {
        this.treeView.reveal(entry, { expand: true });
      }
    }
  }

  private getCmdEntry(entry: Entry): Entry | undefined {
    if (entry) {
      return entry;
    }
    if (this.treeView.selection.length > 0) {
      return this.treeView.selection[0];
    }
    return undefined;
  }

  private async convertProject(selection: TreeSelection) {
    const projectPath = await treeSelectionToProjectPath(selection, this.getIvyProjects());
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'Select Axon Ivy projects to be converted';
    quickPick.canSelectMany = true;
    quickPick.items = (await this.getIvyProjects()).map(p => ({ label: path.basename(p), detail: p }));
    quickPick.selectedItems = quickPick.items.filter(item => item.detail === projectPath);
    quickPick.show();
    quickPick.onDidAccept(async () => {
      for (const item of quickPick.selectedItems) {
        if (item.detail) {
          await IvyEngineManager.instance.convertProject(item.detail);
        }
      }
      IvyDiagnostics.instance.refresh();
      quickPick.dispose();
    });
  }

  getIvyProjects() {
    return this.treeDataProvider.getIvyProjects();
  }

  static get instance() {
    if (IvyProjectExplorer._instance) {
      return IvyProjectExplorer._instance;
    }
    throw new Error('IvyProjectExplorer has not been initialized');
  }
}
