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
import { getClassPaths, onDidClasspathUpdate, onDidProjectsImport } from '../base/java-extension-api';
import { artifactIdRangeInPom, IvyDiagnostics } from '../engine/diagnostics';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import { debouncedAction } from './debounce';
import { logErrorMessage } from './logging-util';

const DIAGNOSTIC_SOURCE = 'Axon Ivy Java Classpath';

export class JavaClassPathReader {
  private static _instance: JavaClassPathReader;
  private readonly diagnostics: DiagnosticCollection;
  private classpathListener?: Disposable;
  private projectsImportListener?: Disposable;
  private scanQueue: Promise<void> = Promise.resolve();
  private isInitialCall = true;
  private iarsPerProject: Map<string, Map<string, string>>;

  private constructor(context: ExtensionContext) {
    this.diagnostics = languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    this.iarsPerProject = new Map<string, Map<string, string>>();
    context.subscriptions.push(this.diagnostics, this);
    const debouncedReadAndValidate = debouncedAction(() => this.queuedReadAndValidate(), 'readJavaClassPath');
    onDidProjectsImport(debouncedReadAndValidate).then(disposable => (this.projectsImportListener = disposable));
    onDidClasspathUpdate(debouncedReadAndValidate).then(disposable => (this.classpathListener = disposable));
  }

  static async init(context: ExtensionContext) {
    if (JavaClassPathReader._instance) {
      throw new Error('JavaClassPathReader has already been initialized');
    }
    JavaClassPathReader._instance = new JavaClassPathReader(context);
    await JavaClassPathReader._instance.queuedReadAndValidate();
  }

  private async queuedReadAndValidate() {
    const scan = this.scanQueue.then(() => this.readAndValidate());
    this.scanQueue = scan.catch(error => {
      logErrorMessage(`Failed to read and validate Java classpath, ${error}`);
    });
    return this.scanQueue;
  }

  private async readAndValidate() {
    const isInitialCall = this.isInitialCall;
    this.isInitialCall = false;
    this.diagnostics.clear();
    const projects = await IvyProjectManager.instance.getIvyProjects();
    const iarsPerProject = new Map<string, Map<string, string>>();
    const allClassPathIars: string[] = [];
    for (const project of projects) {
      const classPaths = await getClassPaths(project);
      const iars = classPaths?.classpaths.filter(entry => entry.endsWith('.iar')) ?? [];
      iarsPerProject.set(project, this.parseIars(iars));
      allClassPathIars.push(...iars);
    }
    this.iarsPerProject = iarsPerProject;
    const versionsPerArtifact = new Map<string, Set<string>>();
    for (const iars of iarsPerProject.values()) {
      for (const [key, version] of iars) {
        versionsPerArtifact.set(key, (versionsPerArtifact.get(key) ?? new Set<string>()).add(version));
      }
    }
    let hasError = false;
    for (const [project, iars] of iarsPerProject) {
      const pomUri = Uri.file(path.join(project, 'pom.xml'));
      const newDiagnostics: Diagnostic[] = [];
      for (const key of iars.keys()) {
        const artifactId = key.split('/').at(-1);
        if ((versionsPerArtifact.get(key)?.size ?? 0) > 1) {
          const versions = [...(versionsPerArtifact.get(key) ?? [])].sort().join(', ');
          const message = l10n.t("Dependency '{0}' is available in multiple versions: {1}", artifactId ?? key, versions);
          const range = await artifactIdRangeInPom(pomUri, artifactId ?? key);
          const diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Error);
          diagnostic.source = DIAGNOSTIC_SOURCE;
          newDiagnostics.push(diagnostic);
        }
      }
      if (newDiagnostics.length > 0) {
        hasError = true;
        this.diagnostics.set(pomUri, newDiagnostics);
      }
    }
    if (hasError || (isInitialCall && allClassPathIars.length === 0)) {
      return;
    }
    await this.deployDependencies(allClassPathIars);
  }

  public getIarsPerProject() {
    return this.iarsPerProject;
  }

  private async deployDependencies(allClassPathIars: string[]) {
    const uniqueIars = Array.from(new Set(allClassPathIars));
    await IvyEngineManager.instance.deployIarProjects(uniqueIars);
    await IvyDiagnostics.instance.refresh();
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
    this.projectsImportListener?.dispose();
  }

  static get instance() {
    if (JavaClassPathReader._instance) {
      return JavaClassPathReader._instance;
    }
    throw new Error('JavaClassPathReader has not been initialized');
  }
}
