import { IncomingMessage } from 'http';
import path from 'path';
import { ProgressLocation, window, workspace } from 'vscode';
import type { NewProcessParams } from '../../project-explorer/new-process';
import type { NewUserDialogParams } from '../../project-explorer/new-user-dialog';
import { handleProjectConversionLog } from '../project-conversion-log';
import { handleAxiosError } from './axios-error-handler';
import {
  type CaseMapInit,
  type DataClassInit,
  type ImportProcessBody,
  type NewProjectParams,
  type ProductInstallParams,
  type WorkspaceBean,
  componentForm,
  convertProject,
  createCaseMap,
  createDataClass,
  createEntityClass,
  createHd,
  createPmvAndProjectFiles,
  createProcess,
  createWorkspace,
  deleteProject,
  deployProjects,
  findOrCreatePmv,
  getVersion,
  importProcess,
  installMarketProduct,
  invalidateClassLoader,
  processDebugger,
  projects,
  refreshProjectStatuses,
  stopBpmEngine
} from './generated/client';
import { pollWithProgress } from './poll';

const progressOptions = (title: string) => {
  return {
    location: ProgressLocation.Window,
    title,
    cancellable: false
  };
};
const headers = { 'X-Requested-By': 'web-ide' };
const options = { headers, paramsSerializer: { indexes: null } };

export class IvyEngineApi {
  constructor(
    private readonly workspace: WorkspaceBean,
    private readonly baseURL: string,
    private readonly engineURL: string
  ) {}

  static async init(rawEngineUrl: string) {
    const engineUrl = new URL('api', rawEngineUrl).toString();
    const workspace = await IvyEngineApi.createWorkspace(engineUrl).catch(handleAxiosError);
    const baseURL = new URL(path.join(workspace.baseUrl, 'api'), engineUrl).toString();
    return new IvyEngineApi(workspace, baseURL, engineUrl);
  }

  private static async createWorkspace(engineUrl: string) {
    await pollWithProgress(engineUrl, 'Waiting for Axon Ivy Engine to be ready.');
    const baseURL = new URL(path.join('api'), engineUrl).toString();
    const workspaces = workspace.workspaceFolders;
    const workspaceFolder = workspaces?.at(0);
    if (!workspaces || !workspaceFolder) {
      throw new Error('No workspace available');
    }
    const workspaceInit = { name: workspaceFolder.name, path: workspaceFolder.uri.fsPath };
    return await window.withProgress(progressOptions('Create workspace'), async () => {
      return (await createWorkspace(workspaceInit, { baseURL, ...options })).data;
    });
  }

  public async findOrCreatePmv(projectDir: string) {
    const name = path.basename(projectDir);
    const params = { name, path: projectDir };
    await findOrCreatePmv(params, { baseURL: this.baseURL, ...options }).catch(handleAxiosError);
  }

  public async deployProjects(ivyProjectDirectories: string[]) {
    await deployProjects(ivyProjectDirectories, { baseURL: this.baseURL, ...options }).catch(handleAxiosError);
  }

  public async stopBpmEngine(projectDir: string) {
    await stopBpmEngine(
      { projectDir },
      { baseURL: this.baseURL, ...options, headers: { ...headers, 'Content-Type': 'application/json' } }
    ).catch(handleAxiosError);
  }

  public async createProcess(newProcessParams: NewProcessParams) {
    return createProcess(newProcessParams, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createProcessFromBpmn(params: ImportProcessBody) {
    return importProcess(params, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async installMarketProduct(params: ProductInstallParams) {
    return installMarketProduct(this.workspace.id, params, { baseURL: this.engineURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createProject(newProjectParams: NewProjectParams) {
    return await createPmvAndProjectFiles(newProjectParams, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createUserDialog(newUserDialogParams: NewUserDialogParams) {
    return createHd(newUserDialogParams, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createDataClass(params: DataClassInit) {
    return createDataClass(params, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createEntityClass(params: DataClassInit) {
    return createEntityClass(params, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createCaseMap(params: CaseMapInit) {
    return createCaseMap(params, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async deleteProject(projectDir: string) {
    await deleteProject({ projectDir }, { baseURL: this.baseURL, ...options }).catch(handleAxiosError);
  }

  public async convertProject(projectDir: string) {
    const data = await convertProject({ projectDir }, { baseURL: this.baseURL, ...options, responseType: 'stream' })
      .catch(handleAxiosError)
      .then(res => res.data);
    if (data instanceof IncomingMessage) {
      await handleProjectConversionLog(data);
    }
  }

  public async refreshProjectStatuses() {
    return refreshProjectStatuses({ baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async invalidateClassLoader(projectDir: string) {
    await invalidateClassLoader({ projectDir }, { baseURL: this.baseURL, ...options }).catch(handleAxiosError);
  }

  public async getComponentForm(componentId: string, app: string, pmv: string) {
    return componentForm({ componentId, app, pmv }, { baseURL: this.baseURL, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async projects(withDependencies = false) {
    return (await projects({ withDependencies }, { baseURL: this.baseURL, ...options })).data;
  }

  public async getEngineVersion() {
    return getVersion({ baseURL: this.engineURL })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async processDebugServerPort() {
    return processDebugger({ baseURL: this.engineURL })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public get devContextPath(): string {
    return this.workspace.baseUrl;
  }
}
