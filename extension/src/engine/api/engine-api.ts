import * as vscode from 'vscode';
import path from 'path';
import { pollWithProgress } from './poll';
import { NewProcessParams } from '../../project-explorer/new-process';
import { NewUserDialogParams } from '../../project-explorer/new-user-dialog';
import { setStatusBarMessage } from '../../base/status-bar';
import {
  NewProjectParams,
  buildProjects,
  createHd,
  createProcess,
  createPmvAndProjectFiles,
  deleteProject,
  deployProjects,
  findOrCreatePmv,
  stopBpmEngine,
  createDataClass,
  DataClassInit,
  createWorkspace,
  getInfo
} from './generated/client';
import { handleAxiosError } from './axios-error-handler';

const progressOptions = (title: string) => {
  return {
    location: vscode.ProgressLocation.Window,
    title,
    cancellable: false
  };
};
const headers = { 'X-Requested-By': 'web-ide' };
const options = { headers, paramsSerializer: { indexes: null } };

export class IvyEngineApi {
  private readonly _devContextPath: Promise<string>;
  private readonly baseURL: Promise<string>;

  constructor(engineUrl: string) {
    this._devContextPath = this.createWorkspace(engineUrl)
      .then(ws => ws.baseUrl)
      .catch(handleAxiosError);
    this.baseURL = this.devContextPath.then(devContextPath => new URL(path.join(devContextPath, 'api'), engineUrl).toString());
  }

  private async createWorkspace(engineUrl: string) {
    await pollWithProgress(engineUrl, 'Waiting for Axon Ivy Engine to be ready.');
    const baseURL = new URL(path.join('api'), engineUrl).toString();
    const workspaces = vscode.workspace.workspaceFolders;
    if (!workspaces || workspaces.length === 0) throw new Error('No workspace available');
    if (workspaces.length !== 1) throw new Error('Too many workspaces available, only one workspace supported');
    const workspace = workspaces[0];
    const workspaceInit = { name: workspace.name, path: workspace.uri.fsPath };
    return await vscode.window.withProgress(progressOptions('Create workspace'), async () => {
      return (await createWorkspace(workspaceInit, { baseURL, ...options })).data;
    });
  }

  public async initExistingProject(projectDir: string) {
    const name = path.basename(projectDir);
    const params = { name, path: projectDir };
    const baseURL = await this.baseURL;
    await vscode.window.withProgress(progressOptions('Initialize Ivy Project'), async () => {
      await findOrCreatePmv(params, { baseURL, ...options }).catch(handleAxiosError);
    });
  }

  public async deployProjects(ivyProjectDirectories: string[]) {
    const baseURL = await this.baseURL;
    await vscode.window.withProgress(progressOptions('Deploy Ivy Projects'), async () => {
      await deployProjects(ivyProjectDirectories, { baseURL, ...options }).catch(handleAxiosError);
    });
    setStatusBarMessage('Finished: Deploy Ivy Projects');
  }

  public async stopBpmEngine(projectDir: string) {
    const baseURL = await this.baseURL;
    await vscode.window.withProgress(progressOptions('Stop BPM Engine'), async () => {
      await stopBpmEngine({ projectDir }, { baseURL, ...options, headers: { ...headers, 'Content-Type': 'application/json' } }).catch(
        handleAxiosError
      );
    });
    setStatusBarMessage('Finished: Stop BPM Engine');
  }

  public async buildProjects(ivyProjectDirectories: string[]) {
    const baseURL = await this.baseURL;
    await vscode.window.withProgress(progressOptions('Build Projects'), async () => {
      await buildProjects(ivyProjectDirectories, { baseURL, ...options }).catch(handleAxiosError);
    });
  }

  public async createProcess(newProcessParams: NewProcessParams) {
    const baseURL = await this.baseURL;
    return vscode.window.withProgress(progressOptions('Create new Process'), async () => {
      return createProcess(newProcessParams, { baseURL, ...options })
        .then(res => res.data)
        .catch(handleAxiosError);
    });
  }

  public async createProject(newProjectParams: NewProjectParams) {
    const baseURL = await this.baseURL;
    await vscode.window.withProgress(progressOptions('Create new Project'), async () => {
      await createPmvAndProjectFiles(newProjectParams, { baseURL, ...options }).catch(handleAxiosError);
    });
  }

  public async createUserDialog(newUserDialogParams: NewUserDialogParams) {
    const baseURL = await this.baseURL;
    return vscode.window.withProgress(progressOptions('Create new User Dialog'), async () => {
      return createHd(newUserDialogParams, { baseURL, ...options })
        .then(res => res.data)
        .catch(handleAxiosError);
    });
  }

  public async createDataClass(params: DataClassInit) {
    const baseURL = await this.baseURL;
    return vscode.window.withProgress(progressOptions('Create new Data Class'), async () => {
      return createDataClass(params, { baseURL, ...options })
        .then(res => res.data)
        .catch(handleAxiosError);
    });
  }

  public async deleteProject(projectDir: string) {
    const baseURL = await this.baseURL;
    await vscode.window.withProgress(progressOptions('Delete Project'), async () => {
      await deleteProject({ projectDir }, { baseURL, ...options }).catch(handleAxiosError);
    });
  }

  public async getEngineInfo() {
    const baseURL = await this.baseURL;
    return getInfo({ baseURL })
      .then(res => res.data)
      .catch(handleAxiosError);
  }

  public get devContextPath(): Promise<string> {
    return this._devContextPath;
  }
}
