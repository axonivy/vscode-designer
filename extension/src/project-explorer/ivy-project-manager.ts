import fs from 'fs';
import path from 'path';
import {
  commands,
  Diagnostic,
  DiagnosticSeverity,
  EventEmitter,
  l10n,
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
import { logErrorMessageWithActions } from '../base/logging-util';
import { IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { explainSanitizedProjectName, sanitizeProjectName } from './utils/project-name-sanitizer';

export const IVY_PROJECT_FILE_PATTERN = '**/{.ivyproject,.project}';
const DIAGNOSTIC_SOURCE = 'Axon Ivy Project Search';

interface ProjectPathName {
  path: string;
  name: string;
  nameSanitized: string;
}

interface ProjectPathCollision {
  sameName: ProjectPathName[];
  sameSanitizedName: ProjectPathName[];
}

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
    const distinctProjectPaths = [...new Set(projectFiles.filter(p => isIvyProject(p)).map(p => path.dirname(p.fsPath)))];
    const projectPaths: ProjectPathName[] = distinctProjectPaths.map(projectPath => ({
      path: projectPath,
      name: path.basename(projectPath),
      nameSanitized: sanitizeProjectName(path.basename(projectPath))
    }));
    const projectsPerName = new Map<string, ProjectPathName[]>();
    const projectsPerSanitizedName = new Map<string, ProjectPathName[]>();
    const projectPathCollisionMap = new Map<ProjectPathName, ProjectPathCollision>();
    for (const project of projectPaths) {
      const sameName = projectsPerName.get(project.name) ?? [];
      const sameSanitizedName = projectsPerSanitizedName.get(project.nameSanitized) ?? [];
      sameName.push(project);
      sameSanitizedName.push(project);
      projectsPerName.set(project.name, sameName);
      projectsPerSanitizedName.set(project.nameSanitized, sameSanitizedName);
      projectPathCollisionMap.set(project, { sameName, sameSanitizedName });
    }
    const validProjects: string[] = [];
    projectPathCollisionMap.forEach(({ sameName, sameSanitizedName }, projectPath) => {
      const diagnostics: Diagnostic[] = [];
      if (sameName.length > 1) {
        const diagnostic = new Diagnostic(
          new Range(0, 0, 0, 0),
          l10n.t(
            "Multiple project directories resolve to the same name '{0}':\n{1}.\nPlease cleanup the workspace.",
            projectPath.name,
            sameName.map(p => p.path).join('\n')
          ),
          DiagnosticSeverity.Error
        );
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostics.push(diagnostic);
      }
      if (sameSanitizedName.length > 1) {
        const diagnostic = new Diagnostic(
          new Range(0, 0, 0, 0),
          l10n.t(
            "Multiple project directories resolve to the same sanitized name '{0}':\n{1}.\nPlease cleanup the workspace.",
            projectPath.nameSanitized,
            sameSanitizedName.map(p => p.path).join('\n')
          ),
          DiagnosticSeverity.Error
        );
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostics.push(diagnostic);
        logErrorMessageWithActions(explainSanitizedProjectName(), {
          [l10n.t('Show Problem View')]: () => {
            commands.executeCommand('workbench.panel.markers.view.focus');
          }
        });
      }
      if (diagnostics.length === 0) {
        validProjects.push(projectPath.path);
      } else {
        this.diagnostics.set(Uri.file(projectPath.path), diagnostics);
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
