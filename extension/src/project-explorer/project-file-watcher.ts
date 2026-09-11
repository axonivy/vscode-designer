import { Uri, workspace, type ExtensionContext } from 'vscode';
import { debouncedAction, hasDeployActionInQueue, type ActionKey } from '../base/debounce';
import { extensionLogOutputChannel } from '../base/extension-output-channel';
import { askToRunJavaCleanWorkspace } from '../base/java-extension-api';
import { IvyEngineManager } from '../engine/engine-manager';
import { IvyProjectExplorer } from './ivy-project-explorer';
import { isIvyProject, IVY_PROJECT_FILE_PATTERN } from './ivy-project-tree-data-provider';
import { treeUriToProjectPath } from './tree-selection';

export class ProjectFileWatcherManager {
  private lockCount = 1; // make sure the file watchers are initially locked, will be unlocked if engine is available
  private static _instance: ProjectFileWatcherManager;

  private constructor(context: ExtensionContext) {
    this.createFileWatchers(context);
  }

  static init(context: ExtensionContext) {
    if (ProjectFileWatcherManager._instance) {
      throw new Error('ProjectFileWatcherManager has already been initialized');
    }
    ProjectFileWatcherManager._instance = new ProjectFileWatcherManager(context);
  }

  static get instance() {
    if (ProjectFileWatcherManager._instance) {
      return ProjectFileWatcherManager._instance;
    }
    throw new Error('ProjectFileWatcherManager has not been initialized');
  }

  public lock() {
    this.lockCount++;
    extensionLogOutputChannel.appendLine(`Project File Watcher Lock incremented, current count: ${this.lockCount}`);
  }

  public unlock() {
    if (this.lockCount <= 0) {
      extensionLogOutputChannel.appendLine('Project File Watcher Lock underflow');
      return;
    }
    this.lockCount--;
    extensionLogOutputChannel.appendLine(`Project File Watcher Lock decremented, current count: ${this.lockCount}`);
  }

  private isLocked() {
    return this.lockCount > 0;
  }

  private createFileWatchers(context: ExtensionContext) {
    const ivyProjectFileWatcher = workspace.createFileSystemWatcher(IVY_PROJECT_FILE_PATTERN, false, true, true);
    ivyProjectFileWatcher.onDidCreate(async projectFile => {
      if (this.isLocked() || !isIvyProject(projectFile)) {
        return;
      }
      await IvyProjectExplorer.instance.refresh();
    });
    const deleteProjectWatcher = workspace.createFileSystemWatcher('**/*', true, true, false);
    deleteProjectWatcher.onDidDelete(async e => {
      if (this.isLocked() || e.path.includes('/target/')) {
        return;
      }
      await this.deleteProjectOnEngine(e.fsPath);
    });
    const deployProject = (uri: Uri) => {
      if (this.isLocked()) {
        return;
      }
      this.runEngineActionDebounced((d: string) => IvyEngineManager.instance.deployProjects(d), 'deploy', uri);
    };
    const webContentWatcher = workspace.createFileSystemWatcher('**/webContent/**/*');
    webContentWatcher.onDidChange(deployProject);
    webContentWatcher.onDidDelete(deployProject);
    webContentWatcher.onDidCreate(deployProject);
    const mvnDepsWatcher = workspace.createFileSystemWatcher('**/target/lib/mvn-deps/*.jar');
    mvnDepsWatcher.onDidCreate(deployProject);
    mvnDepsWatcher.onDidChange(deployProject);
    mvnDepsWatcher.onDidDelete(deployProject);
    const targetWatcher = workspace.createFileSystemWatcher('**/target/classes/**/*.*');
    const invalidateClassLoader = (uri: Uri) => {
      if (this.isLocked() || hasDeployActionInQueue()) {
        return;
      }
      this.runEngineActionDebounced((d: string) => IvyEngineManager.instance.invalidateClassLoader(d), 'invalidate', uri);
    };
    targetWatcher.onDidChange(invalidateClassLoader);
    targetWatcher.onDidCreate(invalidateClassLoader);
    targetWatcher.onDidDelete(invalidateClassLoader);
    context.subscriptions.push(ivyProjectFileWatcher, deleteProjectWatcher, webContentWatcher, mvnDepsWatcher, targetWatcher);
  }

  private async deleteProjectOnEngine(projectToBeDeleted: string) {
    const ivyProjects = await IvyProjectExplorer.instance.getIvyProjects();
    for (const project of ivyProjects) {
      if (project === projectToBeDeleted) {
        await IvyEngineManager.instance.deleteProject(projectToBeDeleted);
        await askToRunJavaCleanWorkspace('Project deleted');
        await IvyProjectExplorer.instance.refresh();
        return;
      }
    }
  }

  private async runEngineActionDebounced(action: (projectDir: string) => Promise<void>, actionKey: ActionKey, uri?: Uri) {
    const project = await treeUriToProjectPath(uri, IvyProjectExplorer.instance.getIvyProjects());
    if (!project) {
      return;
    }
    const keyPrefix = actionKey === 'invalidate' ? undefined : project;
    return debouncedAction(() => action(project), actionKey, keyPrefix)();
  }
}
