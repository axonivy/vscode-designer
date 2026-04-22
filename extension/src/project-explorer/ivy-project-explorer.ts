import path from 'path';
import type { ExtensionContext, TreeView, TreeViewVisibilityChangeEvent } from 'vscode';
import { Uri, window, workspace } from 'vscode';
import { executeCommand, registerCommand, type Command } from '../base/commands';
import { debouncedAction } from '../base/debounce';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import { logErrorMessage, logInformationMessage, logWarningMessage } from '../base/logging-util';
import { CmsEditorRegistry } from '../editors/cms-editor/cms-editor-registry';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { importMarketProduct, importMarketProductFile } from '../market/import-market';
import { importNewProcess } from './import-process';
import { IVY_RPOJECT_FILE_PATTERN, IvyProjectTreeDataProvider, isIvyProject, type Entry } from './ivy-project-tree-data-provider';
import { addNewCaseMap } from './new-case-map';
import { addNewDataClass } from './new-data-class';
import { addNewProcess, type ProcessKind } from './new-process';
import { addNewProject } from './new-project';
import { addNewUserDialog, type DialogType } from './new-user-dialog';
import { treeSelectionToUri, treeUriToProjectPath, type TreeSelection } from './tree-selection';
import { getWorkspaceFolder, isDirectory, isSubdirectoryOrEqual } from './utils/util';

export const VIEW_ID = 'ivyProjects';

export class IvyProjectExplorer {
  private static _instance: IvyProjectExplorer;
  private readonly treeDataProvider: IvyProjectTreeDataProvider;
  private readonly treeView: TreeView<Entry>;

  private constructor(context: ExtensionContext) {
    this.treeDataProvider = new IvyProjectTreeDataProvider();
    this.treeView = window.createTreeView(VIEW_ID, { treeDataProvider: this.treeDataProvider, showCollapseAll: true });
    context.subscriptions.push(this.treeView);
    this.treeView.onDidChangeVisibility((event: TreeViewVisibilityChangeEvent) => {
      if (event.visible) {
        const activeProjectCmsEditor = CmsEditorRegistry.findActive();
        if (activeProjectCmsEditor) {
          this.selectCmsEntry(activeProjectCmsEditor);
        }
      }
    });
  }

  static async init(context: ExtensionContext) {
    if (IvyProjectExplorer._instance) {
      return IvyProjectExplorer._instance;
    }
    IvyProjectExplorer._instance = new IvyProjectExplorer(context);
    await IvyProjectExplorer._instance.activateEngineIfNeeded();
    IvyProjectExplorer._instance.registerCommands(context);
    IvyProjectExplorer._instance.defineFileWatchers(context);
    workspace.onDidChangeWorkspaceFolders(async () => {
      await IvyProjectExplorer._instance.refresh();
    });
  }

  private async activateEngineIfNeeded() {
    const hasIvyProjects = await this.hasIvyProjects();
    await this.setProjectExplorerActivationCondition(hasIvyProjects);
    if (hasIvyProjects) {
      await IvyEngineManager.instance.start();
    }
  }

  private registerCommands(context: ExtensionContext) {
    const engineManager = IvyEngineManager.instance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registerCmd = (command: Command, callback: (...args: any[]) => any) => registerCommand(command, context, callback);
    registerCmd(`${VIEW_ID}.refreshEntry`, () => this.refresh());
    registerCmd(`${VIEW_ID}.deployProject`, (s: TreeSelection) => this.runEngineAction((d: string) => engineManager.deployProject(d), s));
    registerCmd(`${VIEW_ID}.stopBpmEngine`, (s: TreeSelection) => this.runEngineAction((d: string) => engineManager.stopBpmEngine(d), s));
    registerCmd(`${VIEW_ID}.addBusinessProcess`, (s: TreeSelection) => this.addProcess(s, 'Business Process'));
    registerCmd(`${VIEW_ID}.addCallableSubProcess`, (s: TreeSelection) => this.addProcess(s, 'Callable Sub Process'));
    registerCmd(`${VIEW_ID}.addWebServiceProcess`, (s: TreeSelection) => this.addProcess(s, 'Web Service Process'));
    registerCmd(`${VIEW_ID}.importBpmnProcess`, (s: TreeSelection) => this.importBpmnProcess(s));
    registerCmd(`${VIEW_ID}.installLocalMarketProduct`, (s: TreeSelection) => this.installLocalMarketProduct(s));
    registerCmd(`${VIEW_ID}.installMarketProduct`, (s: TreeSelection) => this.installMarketProduct(s));

    registerCmd(`${VIEW_ID}.addNewProject`, (s: TreeSelection) => this.addProject(s));
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
    registerCmd(`${VIEW_ID}.addNewEntityClass`, (s: TreeSelection) => this.addEntityClass(s));
    registerCmd(`${VIEW_ID}.addNewCaseMap`, (s: TreeSelection) => this.addCaseMap(s));
    registerCmd(`${VIEW_ID}.convertProject`, (s: TreeSelection) => this.convertProject(s));
  }

  private defineFileWatchers(context: ExtensionContext) {
    const ivyProjectFileWatcher = workspace.createFileSystemWatcher(IVY_RPOJECT_FILE_PATTERN, false, true, true);
    ivyProjectFileWatcher.onDidCreate(async projectFile => {
      if (isIvyProject(projectFile)) {
        await this.refresh();
      }
    });
    const deleteProjectWatcher = workspace.createFileSystemWatcher('**/*', true, true, false);
    deleteProjectWatcher.onDidDelete(async e => {
      if (e.path.includes('/target/')) {
        return;
      }
      await this.deleteProjectOnEngine(e.fsPath);
    });
    const deployProject = (uri: Uri) =>
      this.runEngineActionDebounced((d: string) => IvyEngineManager.instance.deployProject(d), 'deploy', uri);
    const webContentWatcher = workspace.createFileSystemWatcher('**/webContent/**/*');
    webContentWatcher.onDidChange(deployProject);
    webContentWatcher.onDidDelete(deployProject);
    webContentWatcher.onDidCreate(deployProject);
    const configWatcher = workspace.createFileSystemWatcher('**/config/{custom-fields.yaml,overrides.any}', true, false, true);
    configWatcher.onDidChange(deployProject);
    const pomWatcher = workspace.createFileSystemWatcher('**/pom.xml', true, false, true);
    pomWatcher.onDidChange(deployProject);
    const m2eDepsWatcher = workspace.createFileSystemWatcher('**/target/m2e.deps', false, false, true);
    m2eDepsWatcher.onDidCreate(deployProject);
    m2eDepsWatcher.onDidChange(deployProject);
    const targetWatcher = workspace.createFileSystemWatcher('**/target/classes/**/*.*');
    const invalidateClassLoader = (uri: Uri) =>
      this.runEngineActionDebounced((d: string) => IvyEngineManager.instance.invalidateClassLoader(d), 'invalidate', uri);
    targetWatcher.onDidChange(invalidateClassLoader);
    targetWatcher.onDidCreate(invalidateClassLoader);
    targetWatcher.onDidDelete(invalidateClassLoader);
    context.subscriptions.push(
      ivyProjectFileWatcher,
      deleteProjectWatcher,
      webContentWatcher,
      configWatcher,
      pomWatcher,
      m2eDepsWatcher,
      targetWatcher
    );
  }

  private async deleteProjectOnEngine(projectToBeDeleted: string) {
    const ivyProjects = await this.getIvyProjects();
    for (const project of ivyProjects) {
      if (project === projectToBeDeleted) {
        await IvyEngineManager.instance.deleteProject(projectToBeDeleted);
        await executeCommand('java.clean.workspace'); // if project was deleted java workspace should be cleaned
        await this.refresh();
        return;
      }
    }
  }

  private async refresh() {
    this.treeDataProvider.refresh();
    await this.activateEngineIfNeeded();
    await this.syncProjects();
    await IvyDiagnostics.instance.refresh(true);
  }

  private async syncProjects() {
    const appendMissingPathSeparator = (p: string) => (p.endsWith(path.sep) ? p : `${p}${path.sep}`);
    const detectedProjects = (await this.getIvyProjects()).map(appendMissingPathSeparator);
    const deployedProjects = (await IvyEngineManager.instance.projects())?.map(p => p.projectDirectory).map(appendMissingPathSeparator);
    const projectsToBeDeployed = detectedProjects.filter(p => !deployedProjects?.includes(p));

    await IvyEngineManager.instance.initProjects(projectsToBeDeployed);
    if (projectsToBeDeployed.length > 0) {
      try {
        await executeCommand('java.project.import.command');
      } catch {
        logWarningMessage('Java extension could not import project. Java support will not be available.');
      }
    }
  }

  private async runEngineAction(action: (projectDir: string) => Promise<void>, selection: TreeSelection) {
    let uri = await treeSelectionToUri(selection);
    if (!uri) {
      uri = await selectIvyProjectDialog();
    }
    this.runEngineActionForUri(action, uri);
  }

  private async runEngineActionForUri(action: (projectDir: string) => Promise<void>, uri?: Uri) {
    const project = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (!project) {
      return;
    }
    action(project);
  }

  private async runEngineActionDebounced(action: (projectDir: string) => Promise<void>, actionKey: 'deploy' | 'invalidate', uri?: Uri) {
    const project = await treeUriToProjectPath(uri, this.getIvyProjects());
    if (!project) {
      return;
    }
    return debouncedAction(() => action(project), `${project}:actionKey:${actionKey}`, 1_000)();
  }

  public async addProject(selection: TreeSelection) {
    const treeSelectionUri = await treeSelectionToUri(selection);
    const selectedUri = (await isDirectory(treeSelectionUri)) ? treeSelectionUri : await getWorkspaceFolder();
    if (!selectedUri) {
      logInformationMessage('No valid directory selected');
      return;
    }
    const existingIvyProjects = await this.getIvyProjects();
    for (const existingProject of existingIvyProjects) {
      if (isSubdirectoryOrEqual(existingProject, selectedUri.fsPath)) {
        logErrorMessage('Cannot create a new project inside an existing Axon Ivy project. Select a valid directory.');
        return;
      }
    }
    await addNewProject(selectedUri);
  }

  public async addProcess(selection: TreeSelection, kind: ProcessKind, pid?: string) {
    const hasIvyProjects = await this.hasIvyProjects();
    if (!hasIvyProjects) {
      logErrorMessage('No Axon Ivy projects in the workspace. Create an Axon Ivy project before adding a process.');
      return;
    }
    const existingProjects = await this.getIvyProjects();
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    await addNewProcess(kind, existingProjects, pid, uri, projectPath);
  }

  private async addCaseMap(selection: TreeSelection) {
    const hasIvyProjects = await this.hasIvyProjects();
    if (!hasIvyProjects) {
      logErrorMessage('No Axon Ivy projects in the workspace. Create an Axon Ivy project before.');
      return;
    }
    const existingProjects = await this.getIvyProjects();
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    await addNewCaseMap(existingProjects, uri, projectPath);
  }

  public async importBpmnProcess(selection: TreeSelection) {
    const uri = (await treeSelectionToUri(selection)) ?? (await selectIvyProjectDialog());
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
    const uri = (await treeSelectionToUri(selection)) ?? (await selectIvyProjectDialog());
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
    const hasIvyProjects = await this.hasIvyProjects();
    if (!hasIvyProjects) {
      logErrorMessage('No Axon Ivy projects in the workspace. Create an Axon Ivy project before adding a dialog.');
      return;
    }
    const existingProjects = await this.getIvyProjects();
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    await addNewUserDialog(type, existingProjects, pid, uri, projectPath);
  }

  private async addDataClass(selection: TreeSelection) {
    const hasIvyProjects = await this.hasIvyProjects();
    if (!hasIvyProjects) {
      logErrorMessage('No Axon Ivy projects in the workspace. Create an Axon Ivy project before adding a data class.');
      return;
    }
    const existingProjects = await this.getIvyProjects();
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    await addNewDataClass('Data Class', existingProjects, uri, projectPath);
  }

  private async addEntityClass(selection: TreeSelection) {
    const hasIvyProjects = await this.hasIvyProjects();
    if (!hasIvyProjects) {
      logErrorMessage('No Axon Ivy projects in the workspace. Create an Axon Ivy project before adding an entity class.');
      return;
    }
    const existingProjects = await this.getIvyProjects();
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    await addNewDataClass('Entity Class', existingProjects, uri, projectPath);
  }

  public async setProjectExplorerActivationCondition(hasIvyProjects: boolean) {
    await executeCommand('setContext', 'ivy:hasIvyProjects', hasIvyProjects);
  }

  public async selectCmsEntry(projectPath: string) {
    if (!this.treeView.visible) {
      return;
    }
    const projectPathUri = Uri.file(projectPath);
    await this.selectEntry(this.treeDataProvider.findEntry(projectPathUri));
    this.selectEntry(this.treeDataProvider.findEntry(Uri.joinPath(projectPathUri, 'cms')));
  }

  public async selectEntry(entry?: Entry) {
    if (!entry) {
      return;
    }
    this.treeView.reveal(entry, { select: true, expand: true });
  }

  private async convertProject(selection: TreeSelection) {
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    const projects = IvyDiagnostics.instance.projectsToBeConverted();
    const quickPick = window.createQuickPick();
    quickPick.title = 'Convert Projects - Select Axon Ivy projects to be converted (1/1)';
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

  async getIvyProjects() {
    return this.treeDataProvider.getIvyProjects();
  }

  private async hasIvyProjects() {
    return this.treeDataProvider.hasIvyProjects();
  }

  static get instance() {
    if (IvyProjectExplorer._instance) {
      return IvyProjectExplorer._instance;
    }
    throw new Error('IvyProjectExplorer has not been initialized');
  }
}
