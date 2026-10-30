import path from 'path';
import {
  Diagnostic,
  DiagnosticSeverity,
  l10n,
  languages,
  Uri,
  type DiagnosticCollection,
  type Disposable,
  type ExtensionContext
} from 'vscode';
import { getClassPaths, onDidClasspathUpdate } from '../base/java-extension-api';
import { artifactIdRangeInPom } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';

const DIAGNOSTIC_SOURCE = 'Axon Ivy Java Classpath';

export class JavaClassPathReader {
  private static _instance: JavaClassPathReader;
  private readonly diagnostics: DiagnosticCollection;
  private classpathListener?: Disposable;

  private constructor(context: ExtensionContext) {
    this.diagnostics = languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    context.subscriptions.push(
      this.diagnostics,
      IvyProjectManager.instance.onDidChangeProjects(() => this.validateAll()),
      this
    );
    this.start();
  }

  static init(context: ExtensionContext) {
    if (JavaClassPathReader._instance) {
      throw new Error('JavaClassPathReader has already been initialized');
    }
    JavaClassPathReader._instance = new JavaClassPathReader(context);
  }

  private async start() {
    await this.validateAll();
    this.classpathListener = await onDidClasspathUpdate(() => this.validateAll());
  }

  async validateAll() {
    const projects = await IvyProjectManager.instance.getIvyProjects();
    const iarsPerProject = new Map<string, Map<string, string>>();
    for (const project of projects) {
      const classPaths = await getClassPaths(project);
      const iars = classPaths?.classpaths.filter(entry => entry.endsWith('.iar')) ?? [];
      iarsPerProject.set(project, this.parseIars(iars));
    }
    const versionsPerArtifact = new Map<string, Set<string>>();
    for (const iars of iarsPerProject.values()) {
      for (const [key, version] of iars) {
        versionsPerArtifact.set(key, (versionsPerArtifact.get(key) ?? new Set<string>()).add(version));
      }
    }
    const engineProjects = await IvyEngineManager.instance.projects();
    const workspaceProjectNames = new Set(engineProjects?.filter(project => project.id.isIar === false).map(project => project.id.name));
    this.diagnostics.clear();
    for (const [project, iars] of iarsPerProject) {
      const pomUri = Uri.file(path.join(project, 'pom.xml'));
      const diagnostics = await Promise.all(
        [...iars.keys()]
          .filter(key => (versionsPerArtifact.get(key)?.size ?? 0) > 1)
          .map(async key => {
            const versions = [...(versionsPerArtifact.get(key) ?? [])].sort().join(', ');
            const artifactId = key.split('/').at(-1) ?? key;
            const message = `IAR dependency '${artifactId}' is available in multiple versions: ${versions}`;
            const range = await artifactIdRangeInPom(pomUri, artifactId);
            return new Diagnostic(range, message, DiagnosticSeverity.Error);
          })
      );
      for (const key of iars.keys()) {
        const artifactId = key.split('/').at(-1);
        if (artifactId && workspaceProjectNames.has(artifactId)) {
          const message = l10n.t(
            "IAR dependency '{0}' is on the Java classpath, but a workspace project with the same name is deployed on the engine.",
            artifactId
          );
          const range = await artifactIdRangeInPom(pomUri, artifactId);
          const diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Error);
          diagnostic.source = DIAGNOSTIC_SOURCE;
          diagnostics.push(diagnostic);
        }
      }
      if (diagnostics.length > 0) {
        this.diagnostics.set(pomUri, diagnostics);
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
