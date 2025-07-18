import * as vscode from 'vscode';
import { IvyEngineManager } from './engine-manager';

const DIAGNOSTIC_SOURCE = 'Axon Ivy';
const CONVERSION_MESSAGE_PREFIX = 'Project is outdated and needs to be converted';
export class IvyDiagnostics {
  private static _instance: IvyDiagnostics;

  private constructor(private diagnostics: vscode.DiagnosticCollection) {}

  static init(context: vscode.ExtensionContext) {
    if (!IvyDiagnostics._instance) {
      const diagnostics = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
      IvyDiagnostics._instance = new IvyDiagnostics(diagnostics);
      const codeActionProvider = vscode.languages.registerCodeActionsProvider({ pattern: '**/pom.xml' }, new ConvertProjectQuickFix(), {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
      });
      context.subscriptions.push(diagnostics, codeActionProvider);
    }
    return IvyDiagnostics._instance;
  }

  public async refresh(refreshProjectStatuses = false) {
    this.diagnostics.clear();
    const projects = refreshProjectStatuses ? IvyEngineManager.instance.refreshProjectStatuses() : IvyEngineManager.instance.projects();
    (await projects)
      .filter(p => p.errorMessage)
      .forEach(project => {
        const uri = vscode.Uri.joinPath(vscode.Uri.parse(project.projectDirectory), 'pom.xml');
        const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), project.errorMessage, vscode.DiagnosticSeverity.Error);
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

export class ConvertProjectQuickFix implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext) {
    if (context.diagnostics.length !== 1) {
      return [];
    }
    const diagnostic = context.diagnostics[0];
    if (diagnostic.source !== DIAGNOSTIC_SOURCE || !diagnostic.message.startsWith(CONVERSION_MESSAGE_PREFIX)) {
      return [];
    }
    const title = 'Axon Ivy: Convert Project';
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.isPreferred = true;
    action.command = {
      command: 'ivyProjects.convertProject',
      title,
      arguments: [document.uri]
    };
    return [action];
  }
}
