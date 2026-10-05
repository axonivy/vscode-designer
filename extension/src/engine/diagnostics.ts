import fs from 'fs';
import type { CodeActionContext, CodeActionProvider, DiagnosticCollection, ExtensionContext, Selection, TextDocument } from 'vscode';
import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, Position, Range, Uri, l10n, languages, workspace } from 'vscode';
import { executeCommand } from '../base/commands';
import { runJavaServerModeSwitch } from '../base/java-extension-api';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import type { ProjectBean } from './api/generated/client';
import { IvyEngineManager } from './engine-manager';

const DIAGNOSTIC_SOURCE = 'Axon Ivy';
const CONVERSION_TOO_OLD_MESSAGE_PREFIX = 'Project is too old and needs to be converted in VS Code.';
const CONVERSION_OUTDATED_MESSAGE_PREFIX = 'Project is outdated and needs to be converted.';
export const IVY_PROJECT_FILE = '.ivyproject';
const POM_FILE = 'pom.xml';
export class IvyDiagnostics {
  private static _instance: IvyDiagnostics;

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
      context.subscriptions.push(diagnostics, codeActionProvider);
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
      .forEach(project => {
        hasProjectWithError = true;
        if (project.id.isIar) {
          this.handleIarDiagnostic(project, projects);
        } else {
          this.handleProjectDiagnostic(project);
        }
      });
    const projectExplorerDiagnostics = await IvyProjectExplorer.instance.getDiagnostics();
    projectExplorerDiagnostics.forEach((d, uri) => {
      d.source = DIAGNOSTIC_SOURCE;
      this.diagnostics.set(uri, [...(this.diagnostics.get(uri) ?? []), d]);
      hasProjectWithError = true;
    });
    if (!hasProjectWithError) {
      await runJavaServerModeSwitch();
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

const isConversionMessage = (message: string) =>
  message.startsWith(CONVERSION_TOO_OLD_MESSAGE_PREFIX) || message.startsWith(CONVERSION_OUTDATED_MESSAGE_PREFIX);
