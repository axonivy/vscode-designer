import path from 'path';
import {
  Diagnostic,
  DiagnosticSeverity,
  languages,
  Range,
  Uri,
  type DiagnosticCollection,
  type Disposable,
  type ExtensionContext
} from 'vscode';
import { getClassPaths, onDidClasspathUpdate } from '../base/java-extension-api';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';

const DIAGNOSTIC_SOURCE = 'Axon Ivy Java Classpath';

export class JavaClassPathValidator {
  private static _instance: JavaClassPathValidator;
  private readonly diagnostics: DiagnosticCollection;
  private classpathListener?: Disposable;

  private constructor() {
    this.diagnostics = languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  }

  static init(context: ExtensionContext) {
    if (JavaClassPathValidator._instance) {
      throw new Error('JavaClassPathValidator has already been initialized');
    }
    const validator = new JavaClassPathValidator();
    JavaClassPathValidator._instance = validator;
    context.subscriptions.push(
      validator.diagnostics,
      IvyProjectManager.instance.onDidChangeProjects(() => validator.validateAll()),
      validator
    );
    validator.start();
  }

  private async start() {
    await this.validateAll();
    this.classpathListener = await onDidClasspathUpdate(() => this.validateAll());
  }

  async validateAll() {
    const projects = await IvyProjectManager.instance.getIvyProjects();
    const iarsPerProject = new Map<string, Map<string, string>>();
    for (const project of projects) {
      const a = await getClassPaths(project);
      iarsPerProject.set(project, this.parseIars(a));
    }
    // artifact key -> all versions used across all projects
    const versionsPerArtifact = new Map<string, Set<string>>();
    for (const iars of iarsPerProject.values()) {
      for (const [key, version] of iars) {
        versionsPerArtifact.set(key, (versionsPerArtifact.get(key) ?? new Set<string>()).add(version));
      }
    }
    this.diagnostics.clear();
    for (const [project, iars] of iarsPerProject) {
      const diagnostics = [...iars.keys()]
        .filter(key => (versionsPerArtifact.get(key)?.size ?? 0) > 1)
        .map(key => {
          const versions = [...(versionsPerArtifact.get(key) ?? [])].sort().join(', ');
          const message = `IAR dependency '${key.split('/').at(-1)}' is available in multiple versions: ${versions}`;
          return new Diagnostic(new Range(0, 0, 0, 0), message, DiagnosticSeverity.Error);
        });
      if (diagnostics.length > 0) {
        this.diagnostics.set(Uri.file(path.join(project, 'pom.xml')), diagnostics);
      }
    }
  }

  // expects maven repository layout: <groupId path>/<artifactId>/<version>/<artifactId>-<version>.iar
  private parseIars(iarPaths: string[]) {
    const result = new Map<string, string>();
    for (const iarPath of iarPaths) {
      const parts = iarPath.replaceAll('\\', '/').split('/');
      const version = parts.at(-2);
      if (version && parts.length > 3) {
        result.set(parts.slice(0, -2).join('/'), version);
      }
    }
    return result;
  }

  dispose() {
    this.classpathListener?.dispose();
  }
}
