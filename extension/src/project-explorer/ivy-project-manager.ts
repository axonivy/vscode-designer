import fs from 'fs';
import path from 'path';
import {
  Diagnostic,
  DiagnosticSeverity,
  EventEmitter,
  languages,
  Range,
  Uri,
  workspace,
  type DiagnosticCollection,
  type ExtensionContext
} from 'vscode';
import { executeCommand } from '../base/commands';
import { config } from '../base/configurations';
import { runJavaProjectImport } from '../base/java-extension-api';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';

export const IVY_PROJECT_FILE_PATTERN = '**/{.ivyproject,.project}';
const DIAGNOSTIC_SOURCE = 'Axon Ivy Project Search';

export const isIvyProject = (projectFile: Uri) => {
  const projectFilePath = projectFile.fsPath;
  try {
    if (path.basename(projectFilePath) === '.ivyproject') {
      return true;
    }
    const content = fs.readFileSync(projectFile.fsPath, 'utf8');
    return content.includes('<nature>ch.ivyteam.ivy.project.IvyProjectNature</nature>');
  } catch {
    return false;
  }
};

export class IvyProjectManager {
  private static _instance: IvyProjectManager;
  private ivyProjects: Promise<string[]>;
  private readonly excludePattern: string;
  private readonly maxResults: number;
  private readonly _onDidChangeProjects = new EventEmitter<void>();
  private readonly diagnostics: DiagnosticCollection;
  readonly onDidChangeProjects = this._onDidChangeProjects.event;

  private constructor(context: ExtensionContext) {
    this.excludePattern = config.projectExcludePattern() ?? '';
    this.maxResults = config.projectMaximumNumber() ?? 50;
    this.diagnostics = languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    this.ivyProjects = this.findIvyProjects();
    context.subscriptions.push(
      this._onDidChangeProjects,
      workspace.onDidChangeWorkspaceFolders(() => this.refresh()),
      this.diagnostics
    );
  }

  static async init(context: ExtensionContext) {
    if (IvyProjectManager._instance) {
      throw new Error('IvyProjectManager has already been initialized');
    }
    IvyProjectManager._instance = new IvyProjectManager(context);
    await IvyProjectManager._instance.activateEngineIfNeeded();
  }

  private async findIvyProjects() {
    this.diagnostics.clear();
    const projectFiles = await workspace.findFiles(IVY_PROJECT_FILE_PATTERN, this.excludePattern, this.maxResults);
    const distinctProjectDirs = [...new Set(projectFiles.filter(p => isIvyProject(p)).map(p => path.dirname(p.fsPath)))];
    const projectsPerBaseName = new Map<string, string[]>();
    for (const projectDir of distinctProjectDirs) {
      const baseName = path.basename(projectDir).toLowerCase();
      projectsPerBaseName.set(baseName, [...(projectsPerBaseName.get(baseName) ?? []), projectDir]);
    }
    const validProjects: string[] = [];
    [...projectsPerBaseName.entries()].forEach(([baseName, projectDirs]) => {
      if (projectDirs.length === 1 && projectDirs[0]) {
        validProjects.push(projectDirs[0]);
      } else if (projectDirs.length > 1) {
        projectDirs.forEach(dir => {
          const message = `Multiple project directories with the same name '${baseName}' found: ${projectDirs.join(', ')}. Please cleanup the workspace.`;
          const diagnostic = new Diagnostic(new Range(0, 0, 0, 0), message, DiagnosticSeverity.Error);
          diagnostic.source = DIAGNOSTIC_SOURCE;
          this.diagnostics.set(Uri.file(dir), [new Diagnostic(new Range(0, 0, 0, 0), message, DiagnosticSeverity.Error)]);
        });
      }
    });
    await executeCommand('setContext', 'ivy:hasIvyProjects', validProjects.length > 0);
    return validProjects.sort();
  }

  async getIvyProjects() {
    return this.ivyProjects;
  }

  async hasErrors() {
    await this.ivyProjects;
    let hasError = false;
    this.diagnostics.forEach(() => {
      hasError = true;
    });
    return hasError;
  }

  async refresh() {
    this.ivyProjects = this.findIvyProjects();
    this._onDidChangeProjects.fire();
    await this.activateEngineIfNeeded();
    await this.syncProjects();
    await IvyDiagnostics.instance.refresh(true);
  }

  private async activateEngineIfNeeded() {
    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
      await IvyEngineManager.instance.start();
    }
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

  static get instance() {
    if (IvyProjectManager._instance) {
      return IvyProjectManager._instance;
    }
    throw new Error('IvyProjectManager has not been initialized');
  }
}
