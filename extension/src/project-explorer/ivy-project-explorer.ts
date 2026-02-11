import path from 'path';
import * as vscode from 'vscode';
import { Command, executeCommand, registerCommand } from '../base/commands';
import { debouncedAction } from '../base/debounce';
import { getIvyProject } from '../base/ivyProjectSelection';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { CmsEditorRegistry } from '../editors/cms-editor/cms-editor-registry';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { importMarketProduct, importMarketProductFile } from '../market/import-market';
import { importNewProcess } from './import-process';
import { Entry, IVY_RPOJECT_FILE_PATTERN, IvyProjectTreeDataProvider } from './ivy-project-tree-data-provider';
import { addNewCaseMap } from './new-case-map';
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
    this.treeView.onDidChangeVisibility((event: vscode.TreeViewVisibilityChangeEvent) => {
      if (event.visible) {
        const activeProjectCmsEditor = CmsEditorRegistry.findActive();
        if (activeProjectCmsEditor) {
          this.selectCmsEntry(activeProjectCmsEditor);
        }
      }
    });
  }

  static async init(context: vscode.ExtensionContext) {
    if (IvyProjectExplorer._instance) {
      return IvyProjectExplorer._instance;
    }
    IvyProjectExplorer._instance = new IvyProjectExplorer(context);
    await IvyProjectExplorer._instance.activateEngineIfNeeded();
    IvyProjectExplorer._instance.registerCommands(context);
    IvyProjectExplorer._instance.defineFileWatchers(context);
  }

  private async activateEngineIfNeeded() {
    const hasIvyProjects = await this.hasIvyProjects();
    await this.setProjectExplorerActivationCondition(hasIvyProjects);
    if (hasIvyProjects) {
      await IvyEngineManager.instance.start();
    }
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
    registerCmd(`${VIEW_ID}.installLocalMarketProduct`, (s: TreeSelection) => this.installLocalMarketProduct(s));
    registerCmd(`${VIEW_ID}.installMarketProduct`, (s: TreeSelection) => this.installMarketProduct(s));

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
    registerCmd(`${VIEW_ID}.addNewCaseMap`, (s: TreeSelection) => this.addCaseMap(s));
    registerCmd(`${VIEW_ID}.convertProject`, (s: TreeSelection) => this.convertProject(s));
  }

  private defineFileWatchers(context: vscode.ExtensionContext) {
    const ivyProjectFileWatcher = vscode.workspace.createFileSystemWatcher(IVY_RPOJECT_FILE_PATTERN, false, true, true);
    ivyProjectFileWatcher.onDidCreate(async () => await this.refresh());
    const deleteProjectWatcher = vscode.workspace.createFileSystemWatcher('**/*', true, true, false);
    deleteProjectWatcher.onDidDelete(async e => {
      if (e.path.includes('/target/')) {
        return;
      }
      await this.deleteProjectOnEngine(e.fsPath);
    });
    const deployProject = (uri: vscode.Uri) =>
      this.runEngineActionDebounced((d: string) => IvyEngineManager.instance.deployProject(d), 'deploy', uri);
    const webContentWatcher = vscode.workspace.createFileSystemWatcher('**/webContent/**/*');
    webContentWatcher.onDidChange(deployProject);
    webContentWatcher.onDidDelete(deployProject);
    webContentWatcher.onDidCreate(deployProject);
    const configWatcher = vscode.workspace.createFileSystemWatcher(
      '**/config/{custom-fields.yaml,overrides.any,persistence.xml,webservice-clients.yaml}',
      true,
      false,
      true
    );
    configWatcher.onDidChange(deployProject);
    const pomWatcher = vscode.workspace.createFileSystemWatcher('**/pom.xml', true, false, true);
    pomWatcher.onDidChange(deployProject);
    const targetWatcher = vscode.workspace.createFileSystemWatcher('**/target/classes/**/*.*');
    const invalidateClassLoader = (uri: vscode.Uri) =>
      this.runEngineActionDebounced((d: string) => IvyEngineManager.instance.invalidateClassLoader(d), 'invalidate', uri);
    targetWatcher.onDidChange(invalidateClassLoader);
    targetWatcher.onDidCreate(invalidateClassLoader);
    targetWatcher.onDidDelete(invalidateClassLoader);
    context.subscriptions.push(ivyProjectFileWatcher, deleteProjectWatcher, webContentWatcher, configWatcher, pomWatcher, targetWatcher);
  }

  private async deleteProjectOnEngine(projectToBeDeleted: string) {
    const ivyProjects = await this.getIvyProjects();
    for (const project of ivyProjects) {
      if (project === projectToBeDeleted) {
        await this.refresh();
      }
    }
  }

  private async hasIvyProjects(): Promise<boolean> {
    return this.treeDataProvider.hasIvyProjects();
  }

  private async refresh() {
    this.treeDataProvider.refresh();
    await this.activateEngineIfNeeded();
    await this.syncProjects();
    await IvyDiagnostics.instance.refresh(true);
  }

  private async syncProjects() {
    const detectedProjects = await this.getIvyProjects();
    let deployedProjects = await IvyEngineManager.instance.projects();

    for (const detectedProject of detectedProjects) {
      const deployedAndDetectedProject = deployedProjects?.find(p => p.projectDirectory.startsWith(detectedProject));
      deployedProjects = deployedProjects?.filter(p => p !== deployedAndDetectedProject);
      if (deployedAndDetectedProject === undefined) {
        await IvyEngineManager.instance.initProjects([detectedProject]);
      }
    }
    for (const projectToBeDeleted of deployedProjects ?? []) {
      await IvyEngineManager.instance.deleteProject(projectToBeDeleted.projectDirectory);
    }
    if (deployedProjects && deployedProjects.length > 0) {
      await executeCommand('java.clean.workspace'); // if project was deleted java workspace should be cleaned
    }
    await executeCommand('java.project.import.command');
  }

  private async runEngineAction(action: (projectDir: string) => Promise<void>, selection: TreeSelection) {
    let uri = await treeSelectionToUri(selection);
    if (!uri) {
      uri = await getIvyProject(this);
    }
    this.runEngineActionForUri(action, uri);
  }

  private async runEngineActionForUri(action: (projectDir: string) => Promise<void>, uri?: vscode.Uri) {
    const project = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (!project) {
      return;
    }
    action(project);
  }

  private async runEngineActionDebounced(
    action: (projectDir: string) => Promise<void>,
    actionKey: 'deploy' | 'invalidate',
    uri?: vscode.Uri
  ) {
    const project = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (!project) {
      return;
    }
    return debouncedAction(() => action(project), `${project}:actionKey:${actionKey}`, 1_000)();
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

  private async addCaseMap(selection: TreeSelection) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    if (!uri) {
      logErrorMessage('Add Case Map: no valid Axon Ivy Project selected.');
      return;
    }
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (projectPath) {
      await addNewCaseMap(uri, projectPath);
      return;
    }
    logErrorMessage('Add Case Map: no valid Axon Ivy Project selected.');
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

  public async installLocalMarketProduct(selection: TreeSelection) {
    await importMarketProductFile(() => this.resolveProject(selection));
  }

  private async resolveProject(selection: TreeSelection) {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(this));
    if (!uri) {
      throw new Error('No valid Axon Ivy Project selected.');
    }
    const projectPath = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (!projectPath) {
      throw new Error('No valid Axon Ivy Project selected.');
    }
    return projectPath;
  }

  public async installMarketProduct(selection: TreeSelection) {
    await importMarketProduct(() => this.resolveProject(selection));
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

  public async selectCmsEntry(projectPath: string) {
    if (!this.treeView.visible) {
      return;
    }
    const projectPathUri = vscode.Uri.file(projectPath);
    await this.selectEntry(this.treeDataProvider.findEntry(projectPathUri));
    this.selectEntry(this.treeDataProvider.findEntry(vscode.Uri.joinPath(projectPathUri, 'cms')));
  }

  public async selectEntry(entry?: Entry) {
    this.treeView.reveal(entry, { select: true, expand: true });
  }

  private async convertProject(selection: TreeSelection) {
    const uri = await treeSelectionToUri(selection);
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
