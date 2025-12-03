import * as vscode from 'vscode';
import { executeCommand } from '../base/commands';
import { config } from '../base/configurations';
import { logMessage } from '../base/logging-util';
import { askToReloadWindow } from '../base/reload-window';
import { setStatusBarMessage } from '../base/status-bar';
import { toWebSocketUrl } from '../base/url-util';
import { IvyBrowserViewProvider } from '../browser/ivy-browser-view-provider';
import { CmsEditorProvider } from '../editors/cms-editor/cms-editor-provider';
import { DatabaseEditorProvider } from '../editors/database-editor/database-editor-provider';
import DataClassEditorProvider from '../editors/dataclass-editor/dataclass-editor-provider';
import FormEditorProvider from '../editors/form-editor/form-editor-provider';
import ProcessEditorProvider from '../editors/process-editor/process-editor-provider';
import { VariableEditorProvider } from '../editors/variable-editor/variable-editor-provider';
import { XhtmlLanguageClientProvider } from '../editors/xhtml-lsp/xhtml-language-client';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { NewProcessParams } from '../project-explorer/new-process';
import { NewUserDialogParams } from '../project-explorer/new-user-dialog';
import { extensionVersion } from '../version/extension-version';
import { RuntimeLogViewProvider } from '../views/runtimelog-view';
import { IvyEngineApi } from './api/engine-api';
import { DataClassInit, ImportProcessBody, NewProjectParams } from './api/generated/client';
import { MavenBuilder } from './build/maven';
import { IvyDiagnostics } from './diagnostics';
import { EngineDownloader } from './engine-downloader';
import { engineDirFromGlobalState, engineReleaseTrain, switchEngineReleaseTrain, updateGlobalStateEngineDir } from './engine-release-train';
import { EngineRunner } from './engine-runner';
import { outputChannel } from './output-channel';
import { ReleaseTrainValidator } from './release-train-validator';
import { WebIdeWebSocketProvider } from './ws-client';

export class IvyEngineManager {
  private static _instance: IvyEngineManager;

  private readonly mavenBuilder: MavenBuilder;
  private readonly engineRunner: EngineRunner;
  private ivyEngineApi?: IvyEngineApi;
  private started = false;

  private constructor(readonly context: vscode.ExtensionContext) {
    const engineDir = this.resolveEngineDir();
    this.mavenBuilder = new MavenBuilder(engineDir);
    this.engineRunner = new EngineRunner(engineDir);
  }

  static init(context: vscode.ExtensionContext) {
    if (!IvyEngineManager._instance) {
      IvyEngineManager._instance = new IvyEngineManager(context);
    }
    return IvyEngineManager._instance;
  }

  async resolveEngineDir(): Promise<string | undefined> {
    if (!config.engineRunByExtension()) {
      return; // ok to be undefined, e.g. in cloud setup
    }
    const releaseTrain = engineReleaseTrain();
    const releaseTrainValidator = new ReleaseTrainValidator(extensionVersion);
    const validationResult = await releaseTrainValidator.validate(releaseTrain);
    if (!validationResult.valid) {
      return this.handleInvalidReleaseTrain(releaseTrain, validationResult.reason);
    }
    if (validationResult.isDirectory) {
      return releaseTrain;
    }
    const engineDownloader = new EngineDownloader(this.context);
    const globalStateEngineDir = engineDirFromGlobalState(this.context, releaseTrain);
    if (globalStateEngineDir && (await releaseTrainValidator.isValidEngineDir(globalStateEngineDir)).valid) {
      engineDownloader.tryToUpdateDevEngine(releaseTrain);
      return globalStateEngineDir;
    }
    const newEngineDir = await engineDownloader.loadReleaseTrain(releaseTrain);
    if ((await releaseTrainValidator.isValidEngineDir(newEngineDir)).valid) {
      await updateGlobalStateEngineDir(this.context, releaseTrain, newEngineDir);
      return newEngineDir;
    }
    logMessage('error', `Downloaded engine is invalid: ${newEngineDir}`);
  }

  private async handleInvalidReleaseTrain(releaseTrain: string, reason?: string) {
    outputChannel.appendLine(`Engine release train validation failed: ${reason}`);
    const newTrain = await switchEngineReleaseTrain(`Provided engine release train is invalid: '${reason}'`);
    if (!newTrain) {
      return logMessage('error', 'No engine release train selected.');
    }
    return await this.resolveEngineDir();
  }

  async switchEngineReleaseTrain() {
    if (await switchEngineReleaseTrain()) {
      await askToReloadWindow('Engine release train switched');
    }
  }

  async start() {
    if (this.started) {
      return;
    }
    this.started = true;
    const engineUrl = await this.resolveEngineUrl();
    this.ivyEngineApi = new IvyEngineApi(engineUrl.toString());
    let devContextPath = await this.ivyEngineApi.devContextPath;
    devContextPath += devContextPath.endsWith('/') ? '' : '/';
    await this.initExistingProjects();
    const websocketUrl = new URL(devContextPath, toWebSocketUrl(engineUrl));
    IvyBrowserViewProvider.register(this.context, engineUrl, devContextPath);
    ProcessEditorProvider.register(this.context, websocketUrl);
    FormEditorProvider.register(this.context, websocketUrl);
    VariableEditorProvider.register(this.context, websocketUrl);
    CmsEditorProvider.register(this.context, websocketUrl);
    DatabaseEditorProvider.register(this.context, websocketUrl);
    DataClassEditorProvider.register(this.context, websocketUrl);

    RuntimeLogViewProvider(websocketUrl);
    WebIdeWebSocketProvider(websocketUrl);
    XhtmlLanguageClientProvider(websocketUrl);

    await IvyDiagnostics.instance.refresh();
  }

  private async resolveEngineUrl() {
    let engineUrl = config.engineUrl() ?? '';
    if (config.engineRunByExtension()) {
      await this.engineRunner.start();
      engineUrl = this.engineRunner.engineUrl;
    }
    return new URL(engineUrl);
  }

  private async initExistingProjects() {
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    for (const projectDir of ivyProjectDirectories) {
      await this.ivyEngineApi?.initExistingProject(projectDir);
    }
    await this.ivyEngineApi?.deployProjects(ivyProjectDirectories);
  }

  public async deployProjects() {
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.ivyEngineApi?.deployProjects(ivyProjectDirectories);
  }

  public async buildProjects() {
    if (config.projectUseMavenBuilder()) {
      await this.mavenBuilder.buildProjects();
      return;
    }
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.ivyEngineApi?.buildProjects(ivyProjectDirectories);
  }

  public async buildProject(ivyProjectDirectory: string) {
    if (config.projectUseMavenBuilder()) {
      await this.mavenBuilder.buildProject(ivyProjectDirectory);
      return;
    }
    await this.ivyEngineApi?.buildProjects([ivyProjectDirectory]);
  }

  public async deployProject(ivyProjectDirectory: string) {
    await this.ivyEngineApi?.deployProjects([ivyProjectDirectory]);
  }

  public async buildAndDeployProjects() {
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.buildProjects();
    await this.ivyEngineApi?.deployProjects(ivyProjectDirectories);
  }

  public async buildAndDeployProject(ivyProjectDirectory: string) {
    await this.buildProject(ivyProjectDirectory);
    await this.ivyEngineApi?.deployProjects([ivyProjectDirectory]);
  }

  public async stopBpmEngine(ivyProjectDirectory: string) {
    await this.ivyEngineApi?.stopBpmEngine(ivyProjectDirectory);
  }

  public async createProcess(newProcessParams: NewProcessParams) {
    await this.createAndOpenProcess(newProcessParams);
  }

  public async createProcessFromBpmn(input: ImportProcessBody) {
    await this.ivyEngineApi?.createProcessFromBpmn(input);
  }

  public async createUserDialog(newUserDialogParams: NewUserDialogParams) {
    const hdBean = await this.ivyEngineApi?.createUserDialog(newUserDialogParams);
    if (hdBean?.uri) {
      executeCommand('vscode.open', vscode.Uri.parse(hdBean.uri));
    }
  }

  public async createProject(newProjectParams: NewProjectParams & { path: string }) {
    await IvyProjectExplorer.instance.setProjectExplorerActivationCondition(true);
    if (!this.started) {
      await this.start();
    }
    const path = newProjectParams.path;
    this.ivyEngineApi
      ?.createProject(newProjectParams)
      .then(() => this.createAndOpenProcess({ name: 'BusinessProcess', kind: 'Business Process', path, namespace: '' }))
      .then(() => setStatusBarMessage('Finished: Create new Project'));
  }

  public async createDataClass(params: DataClassInit) {
    const dataClassBean = await this.ivyEngineApi?.createDataClass(params);
    if (dataClassBean && params.projectDir) {
      const dataClassUri = vscode.Uri.joinPath(vscode.Uri.file(params.projectDir), dataClassBean.path);
      executeCommand('vscode.open', dataClassUri);
    }
  }

  private async createAndOpenProcess(newProcessParams: NewProcessParams) {
    const processBean = await this.ivyEngineApi?.createProcess(newProcessParams);
    if (processBean?.uri) {
      executeCommand('vscode.open', vscode.Uri.parse(processBean.uri));
    }
  }

  public async deleteProject(ivyProjectDirectory: string) {
    this.ivyEngineApi?.deleteProject(ivyProjectDirectory);
  }

  public async convertProject(ivyProjectDirectory: string) {
    await this.ivyEngineApi?.convertProject(ivyProjectDirectory);
  }

  public async refreshProjectStatuses() {
    return await this.ivyEngineApi?.refreshProjectStatuses();
  }

  public async projects() {
    return this.ivyEngineApi?.projects();
  }

  async ivyProjectDirectories() {
    return IvyProjectExplorer.instance.getIvyProjects();
  }

  async stop() {
    await this.engineRunner.stop();
  }

  public static get instance() {
    if (IvyEngineManager._instance) {
      return IvyEngineManager._instance;
    }
    throw new Error('IvyEngineManager has not been initialized');
  }
}
