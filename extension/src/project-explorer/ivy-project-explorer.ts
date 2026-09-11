import path from 'path';
import type { ExtensionContext, TreeView, TreeViewSelectionChangeEvent } from 'vscode';
import { commands, Uri, window, workspace } from 'vscode';
import { registerCommand, type KnownCommand } from '../base/commands';
import { runJavaProjectImport } from '../base/java-extension-api';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { installLocalMarketProduct, installMarketProduct } from '../market/import-market';
import { exportIvyProject } from './export-ivy-project';
import { importIvyProject } from './import-ivy-project';
import { importNewProcess } from './import-process';
import { runProjectConversion } from './ivy-project-conversion';
import { IvyProjectTreeDataProvider, type Entry } from './ivy-project-tree-data-provider';
import { addNewCaseMap } from './new-case-map';
import { addNewDataClass } from './new-data-class';
import { addNewProcess, type ProcessKind } from './new-process';
import { addNewProject } from './new-project';
import { addNewUserDialog, type DialogType } from './new-user-dialog';
import { treeSelectionToProjectUri, treeSelectionToUri, treeUriToProjectPath, type TreeSelection } from './tree-selection';
import { getWorkspaceFolder, isDirectory, isSubdirectoryOrEqual } from './utils/util';

export const VIEW_ID = 'ivyProjects';

export class IvyProjectExplorer {
  private static _instance: IvyProjectExplorer;
  private readonly treeDataProvider: IvyProjectTreeDataProvider;
  private readonly treeView: TreeView<Entry>;

  private constructor(context: ExtensionContext) {
    const activateEnginePromise = this.activateEngineIfNeeded();
    this.treeDataProvider = new IvyProjectTreeDataProvider(activateEnginePromise);
    this.treeView = window.createTreeView(VIEW_ID, { treeDataProvider: this.treeDataProvider });
    this.treeView.onDidChangeSelection(async (event: TreeViewSelectionChangeEvent<Entry>) => {
      if (event.selection && event.selection.length > 0 && event.selection[0]?.uri) {
        const projectUri = event.selection[0]?.uri;
        await commands.executeCommand('revealInExplorer', projectUri);
      }
    });
    context.subscriptions.push(this.treeView);
    this.registerCommands(context);
    context.subscriptions.push(
      workspace.onDidChangeWorkspaceFolders(async () => {
        await this.refresh();
      })
    );
  }

  static async init(context: ExtensionContext) {
    if (IvyProjectExplorer._instance) {
      throw new Error('IvyProjectExplorer has already been initialized');
    }
    IvyProjectExplorer._instance = new IvyProjectExplorer(context);
  }

  private async activateEngineIfNeeded() {
    const workspaceHasOpenFolders = workspace.workspaceFolders && workspace.workspaceFolders.length > 0;
    if (!workspaceHasOpenFolders) {
      return;
    }
    await IvyEngineManager.instance.start();
  }

  private registerCommands(context: ExtensionContext) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registerCmd = (command: KnownCommand, callback: (...args: any[]) => any) => registerCommand(command, context, callback);
    registerCmd(`${VIEW_ID}.refreshEntry`, () => this.refresh());
    registerCmd(`${VIEW_ID}.revealInFileSystem`, async (s: TreeSelection) => this.revealInFileExplorer(s));
    registerCmd(`${VIEW_ID}.deployProject`, (s: TreeSelection) => this.deployProjects(s));
    registerCmd(`${VIEW_ID}.stopBpmEngine`, (s: TreeSelection) => this.stopBpmEngine(s));
    registerCmd(`${VIEW_ID}.addBusinessProcess`, (s: TreeSelection) => this.addProcess(s, 'Business Process'));
    registerCmd(`${VIEW_ID}.addCallableSubProcess`, (s: TreeSelection) => this.addProcess(s, 'Callable Sub Process'));
    registerCmd(`${VIEW_ID}.addWebServiceProcess`, (s: TreeSelection) => this.addProcess(s, 'Web Service Process'));
    registerCmd(`${VIEW_ID}.importBpmnProcess`, (s: TreeSelection) => this.importBpmnProcess(s));
    registerCmd(`${VIEW_ID}.importIvyProject`, (s: TreeSelection) => this.importIvyProject(s));
    registerCmd(`${VIEW_ID}.exportIvyProject`, (s: TreeSelection) => this.exportIvyProject(s));
    registerCmd(`${VIEW_ID}.installLocalMarketProduct`, (s: TreeSelection) => this.installLocalMarketProduct(s));
    registerCmd(`${VIEW_ID}.installMarketProduct`, (s: TreeSelection) =>
      this.installMarketProduct(s, context.extension.packageJSON.version)
    );

    registerCmd(`${VIEW_ID}.addNewProject`, (s: TreeSelection) => this.addProject(s));
    registerCmd(`${VIEW_ID}.addNewHtmlDialog`, (s: TreeSelection, pid?: string) => this.addUserDialog(s, 'JSF', pid));
    registerCmd(`${VIEW_ID}.addNewFormDialog`, (s: TreeSelection, pid?: string) => this.addUserDialog(s, 'Form', pid));
    registerCmd(`${VIEW_ID}.addNewOfflineDialog`, (s: TreeSelection, pid?: string) => this.addUserDialog(s, 'JSFOffline', pid));
    registerCmd(`${VIEW_ID}.addNewDataClass`, (s: TreeSelection) => this.addDataClass(s));
    registerCmd(`${VIEW_ID}.addNewEntityClass`, (s: TreeSelection) => this.addEntityClass(s));
    registerCmd(`${VIEW_ID}.addNewCaseMap`, (s: TreeSelection) => this.addCaseMap(s));
    registerCmd(`${VIEW_ID}.convertProject`, (s: TreeSelection) => this.convertProject(s));
    registerCmd(`${VIEW_ID}.convertAllProjects`, (s: TreeSelection) => this.convertProject(s, true));
  }

  public async refresh() {
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
      await runJavaProjectImport();
    }
  }

  private async revealInFileExplorer(selection: TreeSelection) {
    const uri = await treeSelectionToUri(selection);
    if (uri) {
      await commands.executeCommand('revealFileInOS', uri);
    }
  }

  private async deployProjects(selection: TreeSelection) {
    const projectUri = await treeSelectionToProjectUri(selection, this.getIvyProjects());
    if (!projectUri) {
      return;
    }
    const project = await treeUriToProjectPath(projectUri, this.getIvyProjects());
    if (!project) {
      return;
    }
    await IvyEngineManager.instance.deployProjects(project);
  }

  private async stopBpmEngine(selection: TreeSelection) {
    const projectUri = await treeSelectionToProjectUri(selection, this.getIvyProjects());
    if (!projectUri) {
      return;
    }
    const project = await treeUriToProjectPath(projectUri, this.getIvyProjects());
    if (!project) {
      return;
    }
    await IvyEngineManager.instance.stopBpmEngine(project);
  }

  private async addProject(selection: TreeSelection) {
    const selectedUri = await this.selectWorkspace(selection);
    if (!selectedUri) {
      logInformationMessage('No valid workspace selected.');
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
    const addCommandSelectionContext = await this.getAddCommandSelectionContext(selection);
    if (!addCommandSelectionContext) {
      return;
    }
    await addNewProcess(addCommandSelectionContext, kind, pid);
  }

  private async addCaseMap(selection: TreeSelection) {
    const addCommandContext = await this.getAddCommandSelectionContext(selection);
    if (!addCommandContext) {
      return;
    }
    await addNewCaseMap(addCommandContext);
  }

  private async importBpmnProcess(selection: TreeSelection) {
    const projectUri = await treeSelectionToProjectUri(selection, this.getIvyProjects());
    if (!projectUri) {
      return;
    }
    const project = await treeUriToProjectPath(projectUri, this.getIvyProjects());
    if (!project) {
      return;
    }
    await importNewProcess(project);
  }

  private async importIvyProject(selection: TreeSelection) {
    const selectedUri = await this.selectWorkspace(selection);
    if (!selectedUri) {
      logInformationMessage('No valid import directory selected.');
      return;
    }
    const existingIvyProjects = await this.getIvyProjects();
    for (const existingProject of existingIvyProjects) {
      if (isSubdirectoryOrEqual(existingProject, selectedUri.fsPath)) {
        logErrorMessage(
          'Axon Ivy Import Error - Cannot import an Axon Ivy Project into an existing Axon Ivy Project. Select a valid directory which is not inside an existing Axon Ivy Project.'
        );
        return;
      }
    }
    await importIvyProject(selectedUri);
  }

  private async exportIvyProject(selection: TreeSelection) {
    const addCommandSelectionContext = await this.getAddCommandSelectionContext(selection);
    if (!addCommandSelectionContext) {
      return;
    }
    await exportIvyProject(addCommandSelectionContext);
  }

  private async installLocalMarketProduct(selection: TreeSelection) {
    const addCommandContext = await this.getAddCommandSelectionContext(selection, false);
    if (!addCommandContext) {
      return;
    }
    await installLocalMarketProduct(addCommandContext);
  }

  private async installMarketProduct(selection: TreeSelection, extensionVersion?: string) {
    const addCommandContext = await this.getAddCommandSelectionContext(selection, false);
    if (!addCommandContext) {
      return;
    }
    const engineVersion = (await IvyEngineManager.instance.getEngineVersion()) ?? extensionVersion ?? '';
    await installMarketProduct(addCommandContext, engineVersion);
  }

  public async addUserDialog(selection: TreeSelection, type: DialogType, pid?: string) {
    const addCommandContext = await this.getAddCommandSelectionContext(selection);
    if (!addCommandContext) {
      return;
    }
    await addNewUserDialog(addCommandContext, type, pid);
  }

  private async addDataClass(selection: TreeSelection) {
    const addCommandContext = await this.getAddCommandSelectionContext(selection);
    if (!addCommandContext) {
      return;
    }
    await addNewDataClass('Data Class', addCommandContext);
  }

  private async addEntityClass(selection: TreeSelection) {
    const addCommandContext = await this.getAddCommandSelectionContext(selection);
    if (!addCommandContext) {
      return;
    }
    await addNewDataClass('Entity Class', addCommandContext);
  }

  public async selectEntry(entry?: Entry) {
    if (!entry) {
      return;
    }
    this.treeView.reveal(entry, { select: true, expand: true });
  }

  private async convertProject(selection: TreeSelection, convertAll: boolean = false) {
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, this.getIvyProjects()) : undefined;
    const quickPick = window.createQuickPick();
    quickPick.title = 'Convert Projects - Select Axon Ivy projects to be converted (1/1)';
    quickPick.canSelectMany = true;
    quickPick.items = IvyDiagnostics.instance
      .projectFileUrisToBeConverted()
      .map(projectFileUri => projectFileUri.fsPath)
      .filter(projectFile => !projectFile.endsWith('.iar'))
      .map(projectFile => path.dirname(projectFile))
      .map(projectPath => ({ label: path.basename(projectPath), description: projectPath }));
    quickPick.selectedItems = convertAll ? quickPick.items : quickPick.items.filter(item => item.description === projectPath);
    quickPick.show();
    quickPick.onDidAccept(async () => {
      quickPick.dispose();
      const projectsToConvert = quickPick.selectedItems
        .map(item => item.description)
        .filter((description): description is string => !!description);
      await runProjectConversion(projectsToConvert);
      IvyDiagnostics.instance.refresh();
    });
  }

  public async getIvyProjects() {
    return this.treeDataProvider.getIvyProjects();
  }

  public async getDiagnostics() {
    return this.treeDataProvider.getDiagnostics();
  }

  private async hasIvyProjects() {
    return this.treeDataProvider.hasIvyProjects();
  }

  private async selectWorkspace(selection: TreeSelection): Promise<Uri | undefined> {
    const treeSelectionUri = await treeSelectionToUri(selection);
    const selectedWorkspaceUri = (await isDirectory(treeSelectionUri)) ? treeSelectionUri : await getWorkspaceFolder();
    return selectedWorkspaceUri;
  }

  private async getAddCommandSelectionContext(
    selection: TreeSelection,
    needsExistingIvyProjects: boolean = true
  ): Promise<AddCommandSelectionContext | undefined> {
    const hasIvyProjects = await this.hasIvyProjects();
    if (needsExistingIvyProjects && !hasIvyProjects) {
      logErrorMessage('No Axon Ivy projects in the workspace. Create an Axon Ivy project first.');
      return;
    }
    const existingProjects = await this.getIvyProjects();
    const uri = await treeSelectionToUri(selection);
    const projectPath = uri ? await treeUriToProjectPath(uri, Promise.resolve(existingProjects)) : undefined;
    return { existingIvyProjects: existingProjects, uriSelection: uri, projectPathSelection: projectPath };
  }

  static get instance() {
    if (IvyProjectExplorer._instance) {
      return IvyProjectExplorer._instance;
    }
    throw new Error('IvyProjectExplorer has not been initialized');
  }
}
export type AddCommandSelectionContext = {
  existingIvyProjects: string[];
  uriSelection?: Uri | undefined;
  projectPathSelection?: string | undefined;
};
