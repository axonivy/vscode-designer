import { IncomingMessage } from 'http';
import path from 'path';
import { workspace } from 'vscode';
import { StatusBar } from '../../base/status-bar';
import { handleProjectConversionLog } from '../project-conversion-log';
import { handleAxiosError } from './axios-error-handler';
import {
  type CaseMapInit,
  type ComponentFormParams,
  type ConvertProjectParams,
  type DataClassInit,
  type DeleteProjectParams,
  type DeployProjectsRequest,
  type HdInit,
  type ImportProcessBody,
  type ImportProjectsBody,
  type InvalidateClassLoaderParams,
  type NewProjectParams,
  type ProcessInit,
  type ProductInstallParams,
  type ProjectsParams,
  type StopBpmEngineParams,
  type WorkspaceBean,
  componentForm,
  convertProject,
  createCaseMap,
  createDataClass,
  createEntityClass,
  createHd,
  createProcess,
  createProjectAndProjectFiles,
  createWorkspace,
  deleteProject,
  deployProjects,
  findOrCreateProject,
  getVersion,
  importProcess,
  importProjects,
  installMarketProduct,
  invalidateClassLoader,
  processDebugger,
  projects,
  refreshProjectStatuses,
  stopBpmEngine
} from './generated/client';
import { pollWithProgress } from './poll';

const headers = { 'X-Requested-By': 'web-ide' };
const options = { headers, paramsSerializer: { indexes: null } };

export type CreateDataClassParams = Omit<DataClassInit, 'workspaceId'>;
export type CreateProjectParams = Omit<NewProjectParams, 'workspaceId'> & { path: string };
export type CreateProcessParams = Omit<ProcessInit, 'workspaceId'>;
export type CreateProcessFromBpmnParams = Omit<ImportProcessBody, 'workspaceId'>;
export type CreateUserDialogParams = Omit<HdInit, 'workspaceId'>;
export type CreateCaseMapParams = Omit<CaseMapInit, 'workspaceId'>;

export class IvyEngineApi {
  constructor(
    private readonly workspace: WorkspaceBean,
    private readonly designerUrl: string
  ) {}

  static async init(rawEngineUrl: string) {
    const designerUrl = new URL(path.join('designer/api'), rawEngineUrl).toString();
    await pollWithProgress(rawEngineUrl, 'Waiting for Axon Ivy Engine to be ready.');
    const workspace = await IvyEngineApi.createWorkspace(designerUrl).catch(handleAxiosError);
    if (!workspace) {
      throw new Error('Failed to create workspace');
    }
    return new IvyEngineApi(workspace, designerUrl);
  }

  private static async createWorkspace(designerUrl: string) {
    const workspaces = workspace.workspaceFolders;
    const workspaceFolder = workspaces?.at(0);
    if (!workspaces || !workspaceFolder) {
      throw new Error('No workspace available');
    }
    return StatusBar.withStatusBarProgress({ text: 'Creating workspace' }, async () => {
      const response = await createWorkspace(
        { name: workspaceFolder.name, path: workspaceFolder.uri.fsPath },
        { baseURL: designerUrl, ...options }
      );
      return response.data;
    });
  }

  public async findOrCreateProject(projectDir: string) {
    const name = path.basename(projectDir);
    await findOrCreateProject({ workspaceId: this.workspace.id, name, path: projectDir }, { baseURL: this.designerUrl, ...options }).catch(
      handleAxiosError
    );
  }

  public async deployProjects(params: Omit<DeployProjectsRequest, 'workspaceId'>) {
    await deployProjects({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options }).catch(handleAxiosError);
  }

  public async stopBpmEngine(params: Omit<StopBpmEngineParams, 'workspaceId'>) {
    await stopBpmEngine(
      { workspaceId: this.workspace.id, ...params },
      { baseURL: this.designerUrl, ...options, headers: { ...headers, 'Content-Type': 'application/json' } }
    ).catch(handleAxiosError);
  }

  public async createProcess(newProcessParams: CreateProcessParams) {
    return createProcess({ workspaceId: this.workspace.id, ...newProcessParams }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createProcessFromBpmn(params: CreateProcessFromBpmnParams) {
    return importProcess({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async importIvyProject(params: ImportProjectsBody) {
    return importProjects(this.workspace.id, params, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(error => handleAxiosError(error, false));
  }

  public async installMarketProduct(params: Omit<ProductInstallParams, 'workspaceId'>) {
    return installMarketProduct(this.workspace.id, params, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createProject(newProjectParams: CreateProjectParams) {
    return await createProjectAndProjectFiles(
      { workspaceId: this.workspace.id, ...newProjectParams },
      { baseURL: this.designerUrl, ...options }
    )
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createUserDialog(newUserDialogParams: CreateUserDialogParams) {
    return createHd({ workspaceId: this.workspace.id, ...newUserDialogParams }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createDataClass(params: CreateDataClassParams) {
    return createDataClass({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createEntityClass(params: CreateDataClassParams) {
    return createEntityClass({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async createCaseMap(params: CreateCaseMapParams) {
    return createCaseMap({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async deleteProject(params: Omit<DeleteProjectParams, 'workspaceId'>) {
    await deleteProject({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options }).catch(handleAxiosError);
  }

  public async convertProject(params: Omit<ConvertProjectParams, 'workspaceId'>) {
    const data = await convertProject(
      { workspaceId: this.workspace.id, ...params },
      { baseURL: this.designerUrl, ...options, responseType: 'stream' }
    )
      .catch(handleAxiosError)
      .then(res => res.data);
    if (data instanceof IncomingMessage) {
      await handleProjectConversionLog(data);
    }
  }

  public async refreshProjectStatuses() {
    return refreshProjectStatuses({ workspaceId: this.workspace.id }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async invalidateClassLoader(params: Omit<InvalidateClassLoaderParams, 'workspaceId'>) {
    await invalidateClassLoader({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options }).catch(
      handleAxiosError
    );
  }

  public async getComponentForm(params: Omit<ComponentFormParams, 'workspaceId'>) {
    return componentForm({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async projects(params: Omit<ProjectsParams, 'workspaceId'> = { withDependencies: false }) {
    return (await projects({ workspaceId: this.workspace.id, ...params }, { baseURL: this.designerUrl, ...options })).data;
  }

  public async getEngineVersion() {
    return getVersion({ baseURL: this.designerUrl })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public async getWorkspaceId() {
    return this.workspace.id;
  }

  public async processDebugServerPort() {
    return processDebugger({ baseURL: this.designerUrl })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public get devContextPath(): string {
    return this.workspace.baseUrl;
  }
}
