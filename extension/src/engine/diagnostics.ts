import fs from 'fs';
import type { CodeActionContext, CodeActionProvider, DiagnosticCollection, ExtensionContext, Selection, TextDocument } from 'vscode';
import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, Range, Uri, languages } from 'vscode';
import { IvyEngineManager } from './engine-manager';

const DIAGNOSTIC_SOURCE = 'Axon Ivy';
const CONVERSION_MESSAGE_PREFIX = 'Project is outdated and needs to be converted';
const IVY_PROJECT_FILE = '.ivyproject';
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
    const projects = refreshProjectStatuses
      ? await IvyEngineManager.instance.refreshProjectStatuses()
      : await IvyEngineManager.instance.projects();
    projects
      ?.filter(p => p && p.errorMessage)
      .forEach(project => {
        let uri = Uri.joinPath(Uri.file(project.projectDirectory), IVY_PROJECT_FILE);
        if (!fs.existsSync(uri.fsPath)) {
          uri = Uri.joinPath(Uri.file(project.projectDirectory), POM_FILE);
        }
        const diagnostic = new Diagnostic(new Range(1, 0, 1, 0), project.errorMessage, DiagnosticSeverity.Error);
        diagnostic.source = DIAGNOSTIC_SOURCE;
        this.diagnostics.set(uri, [diagnostic]);
      });
  }

  public projectsToBeConverted() {
    const projects: string[] = [];
    this.diagnostics.forEach((uri, diagnostics) => {
      if (diagnostics.find(d => d.message.startsWith(CONVERSION_MESSAGE_PREFIX))) {
        projects.push(uri.fsPath);
      }
    });
    return projects;
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
    if (context.diagnostics.length !== 1) {
      return [];
    }
    const diagnostic = context.diagnostics[0];
    if (diagnostic?.source !== DIAGNOSTIC_SOURCE || !diagnostic.message.startsWith(CONVERSION_MESSAGE_PREFIX)) {
      return [];
    }
    const title = 'Axon Ivy: Convert Project';
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
