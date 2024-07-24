import * as vscode from 'vscode';
import { executeCommand } from '../base/commands';
import { MavenBuilder } from './build/maven';
import { NewProcessParams } from '../project-explorer/new-process';
import { IvyEngineApi } from './api/engine-api';
import { config } from '../base/configurations';
import { NewUserDialogParams } from '../project-explorer/new-user-dialog';
import { toWebSocketUrl } from '../base/url-util';
import { EngineRunner } from './engine-runner';
import { VariableEditorProvider } from '../editors/config-editor/variable-editor-provider';
import FormEditorProvider from '../editors/form-editor/form-editor-provider';
import { IvyBrowserViewProvider } from '../browser/ivy-browser-view-provider';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import ProcessEditorProvider from '../editors/process-editor/process-editor-provider';
import { setStatusBarMessage } from '../base/status-bar';
import { NewProjectParams } from './api/generated/openapi-dev';
import { WebSocketClientProvider } from './ws-client';

export class IvyEngineManager {
  private static _instance: IvyEngineManager;

  private readonly mavenBuilder: MavenBuilder;
  private readonly engineRunner: EngineRunner;
  private ivyEngineApi: IvyEngineApi;
  private started = false;

  private constructor(readonly context: vscode.ExtensionContext) {
    const embeddedEngineDirectory = vscode.Uri.joinPath(context.extensionUri, 'AxonIvyEngine');
    this.mavenBuilder = new MavenBuilder(embeddedEngineDirectory);
    this.engineRunner = new EngineRunner(embeddedEngineDirectory);
  }

  static init(context: vscode.ExtensionContext) {
    if (!IvyEngineManager._instance) {
      IvyEngineManager._instance = new IvyEngineManager(context);
    }
    return IvyEngineManager._instance;
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
    await this.initProjects();
    await this.deployProjects();
    const websocketUrl = new URL(devContextPath, toWebSocketUrl(engineUrl));
    IvyBrowserViewProvider.register(this.context, engineUrl, devContextPath);
    ProcessEditorProvider.register(this.context, websocketUrl);
    FormEditorProvider.register(this.context, websocketUrl);
    VariableEditorProvider.register(this.context, websocketUrl);
    WebSocketClientProvider(websocketUrl);
  }

  private async resolveEngineUrl() {
    let engineUrl = config.engineUrl() ?? '';
    if (config.engineRunByExtension()) {
      await this.engineRunner.start();
      engineUrl = this.engineRunner.engineUrl;
    }
    return new URL(engineUrl);
  }

  private async initProjects() {
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.ivyEngineApi.initProjects(ivyProjectDirectories);
  }

  public async deployProjects() {
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.ivyEngineApi.deployProjects(ivyProjectDirectories);
  }

  public async buildProjects() {
    if (config.projectUseMavenBuilder()) {
      await this.mavenBuilder.buildProjects();
      return;
    }
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.ivyEngineApi.buildProjects(ivyProjectDirectories);
  }

  public async buildProject(ivyProjectDirectory: string) {
    if (config.projectUseMavenBuilder()) {
      await this.mavenBuilder.buildProject(ivyProjectDirectory);
      return;
    }
    await this.ivyEngineApi.buildProjects([ivyProjectDirectory]);
  }

  public async deployProject(ivyProjectDirectory: string) {
    await this.ivyEngineApi.deployProjects([ivyProjectDirectory]);
  }

  public async buildAndDeployProjects() {
    const ivyProjectDirectories = await this.ivyProjectDirectories();
    await this.buildProjects();
    await this.ivyEngineApi.deployProjects(ivyProjectDirectories);
  }

  public async buildAndDeployProject(ivyProjectDirectory: string) {
    await this.buildProject(ivyProjectDirectory);
    await this.ivyEngineApi.deployProjects([ivyProjectDirectory]);
  }

  public async createProcess(newProcessParams: NewProcessParams) {
    await this.createAndOpenProcess(newProcessParams);
  }

  public async createUserDialog(newUserDialogParams: NewUserDialogParams) {
    const hdBean = await this.ivyEngineApi.createUserDialog(newUserDialogParams);
    const viewExtension = newUserDialogParams.type === 'Form' ? '.f.json' : '.xhtml';
    if (!hdBean.uri) {
      return;
    }
    const viewUri = vscode.Uri.joinPath(vscode.Uri.parse(hdBean.uri), newUserDialogParams.name + viewExtension);
    executeCommand('vscode.open', viewUri);
  }

  public async createProject(newProjectParams: NewProjectParams & { path: string }) {
    await IvyProjectExplorer.instance.setProjectExplorerActivationCondition(true);
    if (!this.started) {
      await this.start();
    }
    const path = newProjectParams.path;
    this.ivyEngineApi
      .createProject(newProjectParams)
      .then(() => this.ivyEngineApi.initProjects([path]))
      .then(() => this.ivyEngineApi.watchProjects([path]))
      .then(() => this.createAndOpenProcess({ name: 'BusinessProcess', kind: 'Business Process', path, namespace: '' }))
      .then(() => setStatusBarMessage('Finished: Create new Project'));
  }

  private async createAndOpenProcess(newProcessParams: NewProcessParams) {
    const processBean = await this.ivyEngineApi.createProcess(newProcessParams);
    if (processBean.uri) executeCommand('vscode.open', vscode.Uri.parse(processBean.uri));
  }

  public async deleteProject(ivyProjectDirectory: string) {
    this.ivyEngineApi.deleteProject(ivyProjectDirectory);
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
