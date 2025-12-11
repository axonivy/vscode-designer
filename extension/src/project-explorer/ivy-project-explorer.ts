import path from 'path';
import * as vscode from 'vscode';
import { Command, executeCommand, registerCommand } from '../base/commands';
import { getIvyProject } from '../base/ivyProjectSelection';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { CmsEditorRegistry } from '../editors/cms-editor/cms-editor-registry';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { importNewProcess } from './import-process';
import { Entry, IVY_RPOJECT_FILE_PATTERN, IvyProjectTreeDataProvider } from './ivy-project-tree-data-provider';
import { addNewDataClass } from './new-data-class';
import { ProcessKind, addNewProcess } from './new-process';
import { addNewProject } from './new-project';
import { DialogType, addNewUserDialog } from './new-user-dialog';
import { TreeSelection, treeSelectionToUri, treeUriToProjectPath } from './tree-selection';

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
    this.treeView.onDidChangeVisibility((event: vscode.TreeViewVisibilityChangeEvent) => {
      if (event.visible) {
        const activeProjectCmsEditor = CmsEditorRegistry.findActive();
        if (activeProjectCmsEditor) {
          this.selectCmsEntry(activeProjectCmsEditor);
        }
      }
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
    registerCmd(`${VIEW_ID}.importBpmnProcess`, (s: TreeSelection) => this.importBpmnProcess(s));

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
    registerCmd(`${VIEW_ID}.convertProject`, (s: TreeSelection) => this.convertProject(s));
  }

  private defineFileWatchers() {
    vscode.workspace.createFileSystemWatcher(IVY_RPOJECT_FILE_PATTERN, false, true, true).onDidCreate(async () => await this.refresh());
    vscode.workspace.createFileSystemWatcher('**/*', true, true, false).onDidDelete(e => {
      if (e.path.includes('/target/')) {
        return;
      }
      this.getIvyProjects()
        .then(projects => this.deleteProjectOnEngine(e, projects))
        .then(() => this.refresh());
    });
    vscode.workspace
      .createFileSystemWatcher('**/{cms,config,webContent}/**/*', true, false, true)
      .onDidChange(e => this.runEngineAction((d: string) => IvyEngineManager.instance.deployProject(d), e));
    vscode.workspace
      .createFileSystemWatcher('**/pom.xml', true, false, true)
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
    let uri = await treeSelectionToUri(selection);
    if (!uri) {
      uri = await getIvyProject(this);
    }
    treeUriToProjectPath(uri, this.getIvyProjects()).then(selectionPath => (selectionPath ? action(selectionPath) : {}));
  }

  public async addProcess(selection: TreeSelection, kind: ProcessKind, pid?: string) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    if (!uri) {
      logErrorMessage('Add Process: no valid Axon Ivy Project selected.');
      return;
    }
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (projectPath) {
      await addNewProcess(uri, projectPath, kind, pid);
      return;
    }
    logErrorMessage('Add Process: no valid Axon Ivy Project selected.');
  }

  public async importBpmnProcess(selection: TreeSelection) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    if (!uri) {
      logErrorMessage('Import BPMN Process: no valid Axon Ivy Project selected.');
      return;
    }
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (projectPath) {
      await importNewProcess(projectPath);
      return;
    }
    logErrorMessage('Import BPMN Process: no valid Axon Ivy Project selected.');
  }

  public async addUserDialog(selection: TreeSelection, type: DialogType, pid?: string) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    if (!uri) {
      logInformationMessage('Add User Dialog: no valid Axon Ivy Project selected.');
      return;
    }
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (projectPath) {
      await addNewUserDialog(uri, projectPath, type, pid);
      return;
    }
    logInformationMessage('Add User Dialog: no valid Axon Ivy Project selected.');
  }

  private async addDataClass(selection: TreeSelection) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    if (!uri) {
      logInformationMessage('Add Data Class: no valid Axon Ivy Project selected.');
      return;
    }
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (projectPath) {
      await addNewDataClass(uri, projectPath);
      return;
    }
    logInformationMessage('Add Data Class: no valid Axon Ivy Project selected.');
  }

  public async setProjectExplorerActivationCondition(hasIvyProjects: boolean) {
    await executeCommand('setContext', 'ivy:hasIvyProjects', hasIvyProjects);
  }

  private async activateEngineExtension(hasIvyProjects: boolean) {
    if (hasIvyProjects) {
      await IvyEngineManager.instance.start();
    }
  }

  public async selectCmsEntry(projectPath: string) {
    if (!this.treeView.visible) {
      return;
    }
    await this.selectEntry(this.treeDataProvider.findEntry(projectPath));
    this.selectEntry(this.treeDataProvider.findEntry(`${projectPath}/cms`));
  }

  public async selectEntry(entry?: Entry) {
    this.treeView.reveal(entry, { select: true, expand: true });
  }

  private async convertProject(selection: TreeSelection) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    const projects = IvyDiagnostics.instance.projectsToBeConverted();
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'Select Axon Ivy projects to be converted';
    quickPick.canSelectMany = true;
    quickPick.items = projects.map(pom => path.dirname(pom)).map(project => ({ label: path.basename(project), detail: project }));
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
