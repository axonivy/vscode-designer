import fs from 'fs';
import type { CodeActionContext, CodeActionProvider, DiagnosticCollection, ExtensionContext, Selection, TextDocument } from 'vscode';
import {
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  EventEmitter,
  Position,
  Range,
  Uri,
  l10n,
  languages,
  workspace
} from 'vscode';
import { executeCommand } from '../base/commands';
import { initialJavaCompileStatus, runJavaServerModeSwitch } from '../base/java-extension-api';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import type { ProjectBean } from './api/generated/client';
import { IvyEngineManager } from './engine-manager';

const DIAGNOSTIC_SOURCE = 'Axon Ivy';
const RUNNABLE_CONVERSION_PREFIX = 'Project exists and ready to use, but is outdated.';
const CONVERSION_PREFIXES = [
  'Project is too old and needs to be converted in VS Code.',
  'Project is outdated and needs to be converted.',
  RUNNABLE_CONVERSION_PREFIX
];

export const IVY_PROJECT_FILE = '.ivyproject';
const POM_FILE = 'pom.xml';
export class IvyDiagnostics {
  private static _instance: IvyDiagnostics;
  private readonly _onDidRefresh = new EventEmitter<void>();
  readonly onDidRefresh = this._onDidRefresh.event;

  private constructor(private diagnostics: DiagnosticCollection) {}

  static init(context: ExtensionContext) {
    if (!IvyDiagnostics._instance) {
      const diagnostics = languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
      IvyDiagnostics._instance = new IvyDiagnostics(diagnostics);
      const codeActionProvider = languages.registerCodeActionsProvider(
        { pattern: `**/{${POM_FILE},${IVY_PROJECT_FILE}}` },
        new ConvertProjectQuickFix(),
        {
          providedCodeActionKinds: [CodeActionKind.QuickFix]
        }
      );
      context.subscriptions.push(diagnostics, codeActionProvider, IvyDiagnostics._instance._onDidRefresh);
    }
    return IvyDiagnostics._instance;
  }

  public async refresh(refreshProjectStatuses = false) {
    this.diagnostics.clear();
    let hasProjectWithError = false;
    if (refreshProjectStatuses) {
      await IvyEngineManager.instance.refreshProjectStatuses();
    }
    const projects = await IvyEngineManager.instance.projects(true);
    projects
      ?.filter(p => p && p.errorMessage)
      .filter(p => !p.id.isIar || !p.errorMessage.startsWith(RUNNABLE_CONVERSION_PREFIX))
      .forEach(project => {
        hasProjectWithError = true;
        if (project.id.isIar) {
          this.handleIarDiagnostic(project, projects);
        } else {
          this.handleProjectDiagnostic(project);
        }
      });
    const projectDiagnostics = await IvyProjectManager.instance.getDiagnostics();
    projectDiagnostics.forEach((d, uri) => {
      d.source = DIAGNOSTIC_SOURCE;
      this.diagnostics.set(uri, [...(this.diagnostics.get(uri) ?? []), d]);
      hasProjectWithError = true;
    });
    this._onDidRefresh.fire();
    if (!hasProjectWithError) {
      await runJavaServerModeSwitch();
      await initialJavaCompileStatus();
      await IvyEngineManager.instance.postCompileStart();
    }
    await executeCommand('setContext', 'ivy:hasProjectsToConvert', this.projectFileUrisToBeConverted().length > 0);
  }

  private async handleIarDiagnostic(iar: ProjectBean, projects: ProjectBean[]) {
    projects
      .filter(p => p.id.isIar === false)
      .filter(p => p.dependencies.find(d => d.id === iar.id.id))
      .forEach(async p => {
        const projectUri = Uri.file(p.projectDirectory);
        const uri = Uri.joinPath(projectUri, POM_FILE);
        const error = isConversionMessage(iar.errorMessage)
          ? l10n.t(
              'Project is outdated and needs to be converted. Update to a newer compatible version or import the project to VS Code to convert the project.'
            )
          : iar.errorMessage;
        const message = l10n.t('Referenced dependency {0} has error: {1}', iar.artifactId, error);
        const range = await this.dependencyRange(uri, iar);
        const diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Error);
        diagnostic.source = DIAGNOSTIC_SOURCE;
        this.diagnostics.set(uri, [...(this.diagnostics.get(uri) ?? []), diagnostic]);
      });
  }

  private async dependencyRange(uri: Uri, iar: ProjectBean) {
    const defaultRange = new Range(1, 0, 1, 0);
    try {
      const doc = await workspace.openTextDocument(uri);
      const searchString = '>' + iar.artifactId + '<';
      const offset = doc.getText().indexOf(searchString);
      if (offset === -1) {
        return defaultRange;
      }
      const start = doc.positionAt(offset);
      return new Range(start, new Position(start.line, start.character + searchString.length));
    } catch {
      return new Range(1, 0, 1, 0);
    }
  }

  private async handleProjectDiagnostic(project: ProjectBean) {
    const projectUri = Uri.file(project.projectDirectory);
    let uri = Uri.joinPath(projectUri, IVY_PROJECT_FILE);
    if (!fs.existsSync(uri.fsPath)) {
      uri = Uri.joinPath(projectUri, POM_FILE);
    }
    const diagnostic = new Diagnostic(new Range(1, 0, 1, 0), project.errorMessage, DiagnosticSeverity.Error);
    diagnostic.source = DIAGNOSTIC_SOURCE;
    this.diagnostics.set(uri, [diagnostic]);
  }

  public projectFileUrisToBeConverted() {
    const projectFileUris: Uri[] = [];
    this.diagnostics.forEach((uri, diagnostics) => {
      if (diagnostics.find(isConversionDiagnostic)) {
        projectFileUris.push(uri);
      }
    });
    return projectFileUris;
  }

  static get instance() {
    if (IvyDiagnostics._instance) {
      return IvyDiagnostics._instance;
    }
    throw new Error('IvyDiagnostics has not been initialized');
  }
}

export class ConvertProjectQuickFix implements CodeActionProvider {
  provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext) {
    const firstDiagnostic = context.diagnostics[0];
    if (firstDiagnostic === undefined || context.diagnostics.length > 1) {
      return [];
    }
    if (!isConversionDiagnostic(firstDiagnostic)) {
      return [];
    }
    const title = l10n.t('Axon Ivy: Convert Project');
    const action = new CodeAction(title, CodeActionKind.QuickFix);
    action.isPreferred = true;
    action.command = {
      command: 'ivyProjects.convertProject',
      title,
      arguments: [document.uri]
    };
    return [action];
  }
}

const isConversionDiagnostic = (diagnostic: Diagnostic) =>
  diagnostic.source === DIAGNOSTIC_SOURCE && isConversionMessage(diagnostic.message);

const isConversionMessage = (message: string) => CONVERSION_PREFIXES.some(prefix => message.startsWith(prefix));
