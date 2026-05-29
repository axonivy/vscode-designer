import type { ExtensionContext } from 'vscode';
import { Uri } from 'vscode';
import { executeCommand } from '../base/commands';
import { config } from '../base/configurations';
import { logErrorMessage, logWarningMessage } from '../base/logging-util';
import { askToReloadWindow } from '../base/reload-window';
import { withStatusBarProgress } from '../base/status-bar';
import { toWebSocketUrl } from '../base/url-util';
import { registerProcessDebugging } from '../debug/process-debug';
import { CaseMapEditorProvider } from '../editors/casemap-editor/casemap-editor-provider';
import { CmsEditorProvider } from '../editors/cms-editor/cms-editor-provider';
import { CustomFieldEditorProvider } from '../editors/custom-field-editor/custom-field-editor-provider';
import { DatabaseEditorProvider } from '../editors/database-editor/database-editor-provider';
import DataClassEditorProvider from '../editors/dataclass-editor/dataclass-editor-provider';
import FormEditorProvider from '../editors/form-editor/form-editor-provider';
import { PersistenceEditorProvider } from '../editors/persistence-editor/persistence-editor-provider';
import ProcessEditorProvider from '../editors/process-editor/process-editor-provider';
import { RestClientEditorProvider } from '../editors/restclient-editor/restclient-editor-provider';
import { RoleEditorProvider } from '../editors/role-editor/role-editor-provider';
import { UserEditorProvider } from '../editors/user-editor/user-editor-provider';
import { VariableEditorProvider } from '../editors/variable-editor/variable-editor-provider';
import { WebServiceEditorProvider } from '../editors/webservice-editor/webservice-editor-provider';
import { XhtmlLanguageClientProvider } from '../editors/xhtml-lsp/xhtml-language-client';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import type { NewProcessParams } from '../project-explorer/new-process';
import type { NewUserDialogParams } from '../project-explorer/new-user-dialog';
import { resolveDefaultNamespace } from '../project-explorer/utils/util';
import { extensionVersion } from '../version/extension-version';
import { IvyBrowserViewProvider } from '../views/browser/ivy-browser-view-provider';
import { RuntimeLogViewProvider } from '../views/runtimelog-view';
import { IvyEngineApi } from './api/engine-api';
import type { CaseMapInit, DataClassInit, ImportProcessBody, NewProjectParams, ProductInstallParams } from './api/generated/client';
import { IvyDiagnostics } from './diagnostics';
import { EngineDownloader } from './engine-downloader';
import { engineDirFromGlobalState, engineReleaseTrain, switchEngineReleaseTrain, updateGlobalStateEngineDir } from './engine-release-train';
import { EngineRunner } from './engine-runner';
import { outputChannel } from './output-channel';
import { ReleaseTrainValidator } from './release-train-validator';
import { WebIdeWebSocketProvider } from './web-ide-ws/web-ide-websocket-provider';

export class IvyEngineManager {
  private static _instance: IvyEngineManager;

  private readonly engineRunner: EngineRunner;
  private ivyEngineApi?: IvyEngineApi;
  private started = false;

  private constructor(readonly context: ExtensionContext) {
    const engineDir = this.resolveEngineDir();
    this.engineRunner = new EngineRunner(engineDir);
  }

  static init(context: ExtensionContext) {
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
      return this.handleInvalidReleaseTrain(validationResult.reason);
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
    logErrorMessage(`Downloaded engine is invalid: ${newEngineDir}`);
  }

  private async handleInvalidReleaseTrain(reason?: string) {
    const errorMessage = `Engine release train validation failed: ${reason}`;
    outputChannel.appendLine(errorMessage);
    const newTrain = await switchEngineReleaseTrain(errorMessage);
    if (!newTrain) {
      return logErrorMessage('No engine release train selected.');
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
    await IvyProjectExplorer.instance.setProjectExplorerContext({ isStarted: true });
    const engineUrl = await this.resolveEngineUrl();
    this.ivyEngineApi = new IvyEngineApi(engineUrl.toString());
    let devContextPath = await this.ivyEngineApi.devContextPath;
    IvyBrowserViewProvider.register(this.context, engineUrl, devContextPath);
    devContextPath += devContextPath.endsWith('/') ? '' : '/';
    await this.initExistingProjects();
    const websocketUrl = new URL(devContextPath, toWebSocketUrl(engineUrl));
    ProcessEditorProvider.register(this.context, websocketUrl);
    FormEditorProvider.register(this.context, websocketUrl);
    VariableEditorProvider.register(this.context, websocketUrl);
    CmsEditorProvider.register(this.context, websocketUrl);
    DatabaseEditorProvider.register(this.context, websocketUrl);
    DataClassEditorProvider.register(this.context, websocketUrl);
    RoleEditorProvider.register(this.context, websocketUrl);
    PersistenceEditorProvider.register(this.context, websocketUrl);
    UserEditorProvider.register(this.context, websocketUrl);
    CaseMapEditorProvider.register(this.context, websocketUrl);
    RestClientEditorProvider.register(this.context, websocketUrl);
    WebServiceEditorProvider.register(this.context, websocketUrl);
    CustomFieldEditorProvider.register(this.context);

    RuntimeLogViewProvider(websocketUrl);
    WebIdeWebSocketProvider(websocketUrl);
    XhtmlLanguageClientProvider(websocketUrl);
    registerProcessDebugging(this.context, this.ivyEngineApi);

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
    await this.initProjects(ivyProjectDirectories);
  }

  public async initProjects(ivyProjectDirectories: string[]) {
    if (ivyProjectDirectories.length === 0) {
      return;
    }
    await withStatusBarProgress(
      {
        textDuring: 'Initialize projects...',
        textSuccess: 'Success: Initialize projects',
        textFailure: 'Failed: Initialize projects'
      },
      async () => {
        for (const projectDir of ivyProjectDirectories) {
          await this.ivyEngineApi?.findOrCreatePmv(projectDir);
        }
        await this.ivyEngineApi?.deployProjects(ivyProjectDirectories);
      }
    );
  }

  public async deployProjects(ivyProjectDirectory?: string) {
    const ivyProjectDirectories = ivyProjectDirectory ? [ivyProjectDirectory] : await this.ivyProjectDirectories();
    await withStatusBarProgress(
      {
        textDuring: 'Deploying projects...',
        textSuccess: 'Success: Deploy projects',
        textFailure: 'Failed: Deploy projects'
      },
      async () => await this.ivyEngineApi?.deployProjects(ivyProjectDirectories)
    );
  }

  public async stopBpmEngine(ivyProjectDirectory: string) {
    await withStatusBarProgress(
      {
        textDuring: 'Stopping BPM Engine...',
        textSuccess: 'Success: Stop BPM Engine',
        textFailure: 'Failed: Stop BPM Engine'
      },
      async () => await this.ivyEngineApi?.stopBpmEngine(ivyProjectDirectory)
    );
  }

  public async createProcess(newProcessParams: NewProcessParams) {
    return await this.createAndOpenProcess(newProcessParams);
  }

  public async createProcessFromBpmn(input: ImportProcessBody) {
    await withStatusBarProgress(
      {
        textDuring: 'Importing BPMN process...',
        textSuccess: 'Success: Import BPMN process',
        textFailure: 'Failed: Import BPMN process'
      },
      async () => await this.ivyEngineApi?.createProcessFromBpmn(input)
    );
  }

  public async installMarketProduct(input: ProductInstallParams) {
    await withStatusBarProgress(
      {
        textDuring: 'Importing market product...',
        textSuccess: 'Success: Import market product',
        textFailure: 'Failed: Import market product'
      },
      async () => await this.ivyEngineApi?.installMarketProduct(input)
    );
  }

  public async createUserDialog(newUserDialogParams: NewUserDialogParams) {
    const hdBean = await withStatusBarProgress(
      {
        textDuring: 'Creating new User Dialog...',
        textSuccess: 'Success: Create new User Dialog',
        textFailure: 'Failed: Create new User Dialog'
      },
      async () => await this.ivyEngineApi?.createUserDialog(newUserDialogParams)
    );
    if (hdBean?.uri) {
      executeCommand('vscode.open', Uri.parse(hdBean.uri));
    }
    return hdBean;
  }

  public async createProject(newProjectParams: NewProjectParams & { path: string }) {
    if (!this.started) {
      await this.start();
    }
    return await withStatusBarProgress(
      {
        textDuring: 'Creating and deploying new project...',
        textSuccess: 'Success: Create new Project',
        textFailure: 'Failed: Create new Project'
      },
      async () => {
        const projectBean = await this.ivyEngineApi?.createProject(newProjectParams);
        await IvyProjectExplorer.instance.setProjectExplorerContext({ hasIvyProjects: true });
        executeCommand('java.project.import.command')
          .catch(() => {
            logWarningMessage(
              'Java extension could not import project. Java support will not be available. Please clean Java workspace and import Java projects manually.'
            );
          })
          .then(async () => {
            this.createAndOpenProcess({
              name: 'BusinessProcess',
              kind: 'Business Process',
              path: newProjectParams.path,
              namespace: await resolveDefaultNamespace(newProjectParams.path, 'processes')
            });
          });
        return projectBean;
      }
    );
  }

  public async createDataClass(params: DataClassInit) {
    const dataClassBean = await withStatusBarProgress(
      {
        textDuring: 'Creating new Data Class...',
        textSuccess: 'Success: Create new Data Class',
        textFailure: 'Failed: Create new Data Class'
      },
      async () => await this.ivyEngineApi?.createDataClass(params)
    );
    if (dataClassBean && params.projectDir) {
      const dataClassUri = Uri.joinPath(Uri.file(params.projectDir), dataClassBean.path);
      executeCommand('vscode.open', dataClassUri);
    }
    return dataClassBean;
  }

  public async createEntityClass(params: DataClassInit) {
    const dataClassBean = await withStatusBarProgress(
      {
        textDuring: 'Creating new Entity Class...',
        textSuccess: 'Success: Create new Entity Class',
        textFailure: 'Failed: Create new Entity Class'
      },
      async () => await this.ivyEngineApi?.createEntityClass(params)
    );
    if (dataClassBean && params.projectDir) {
      const dataClassUri = Uri.joinPath(Uri.file(params.projectDir), dataClassBean.path);
      executeCommand('vscode.open', dataClassUri);
    }
    return dataClassBean;
  }

  public async createCaseMap(params: CaseMapInit) {
    const caseMapBean = await withStatusBarProgress(
      {
        textDuring: 'Creating new Case Map...',
        textSuccess: 'Success: Create new Case Map',
        textFailure: 'Failed: Create new Case Map'
      },
      async () => await this.ivyEngineApi?.createCaseMap(params)
    );
    if (caseMapBean && params.projectDir) {
      const caseMapUri = Uri.joinPath(Uri.file(params.projectDir), caseMapBean.path);
      executeCommand('vscode.open', caseMapUri);
    }
  }

  private async createAndOpenProcess(newProcessParams: NewProcessParams) {
    const processBean = await withStatusBarProgress(
      {
        textDuring: 'Creating new Process...',
        textSuccess: 'Success: Create new Process',
        textFailure: 'Failed: Create new Process'
      },
      async () => await this.ivyEngineApi?.createProcess(newProcessParams)
    );
    if (processBean?.uri) {
      executeCommand('vscode.open', Uri.parse(processBean.uri));
    }
    return processBean;
  }

  public async deleteProject(ivyProjectDirectory: string) {
    await withStatusBarProgress(
      {
        textDuring: 'Deleting project...',
        textSuccess: 'Success: Delete project',
        textFailure: 'Failed: Delete project'
      },
      async () => await this.ivyEngineApi?.deleteProject(ivyProjectDirectory)
    );
  }

  public async convertProject(ivyProjectDirectory: string) {
    await withStatusBarProgress(
      {
        textDuring: 'Converting project...',
        textSuccess: 'Success: Convert project',
        textFailure: 'Failed: Convert project'
      },
      async () => await this.ivyEngineApi?.convertProject(ivyProjectDirectory)
    );
  }

  public async refreshProjectStatuses() {
    return await withStatusBarProgress(
      {
        textDuring: 'Refreshing project statuses...',
        textSuccess: 'Success: Refresh project statuses',
        textFailure: 'Failed: Refresh project statuses'
      },
      async () => await this.ivyEngineApi?.refreshProjectStatuses()
    );
  }

  public async invalidateClassLoader(ivyProjectDirectory: string) {
    await withStatusBarProgress(
      {
        textDuring: 'Invalidating class loader...',
        textSuccess: 'Success: Invalidate class loader',
        textFailure: 'Failed: Invalidate class loader',
        successMsgDuration: 1_000
      },
      async () => await this.ivyEngineApi?.invalidateClassLoader(ivyProjectDirectory)
    );
  }

  public async getEngineVersion() {
    if (!this.ivyEngineApi) {
      return;
    }
    const engineInfo = await this.ivyEngineApi.getEngineVersion();
    return engineInfo.version;
  }

  public async projects(withDependencies = false) {
    return this.ivyEngineApi?.projects(withDependencies);
  }

  get engineApi() {
    return this.ivyEngineApi;
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
