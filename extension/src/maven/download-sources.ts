import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  commands,
  l10n,
  TabInputCustom,
  TabInputText,
  Uri,
  window,
  workspace,
  type Disposable,
  type ExtensionContext,
  type Terminal,
  type TerminalShellExecutionEndEvent
} from 'vscode';
import { registerCommand } from '../base/commands';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import { runJavaServerModeSwitch } from '../base/java-extension-api';
import { logErrorMessage, logInformationMessage, logWarningMessage } from '../base/logging-util';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import { treeSelectionToUri, treeUriToProjectPath, type TreeSelection } from '../project-explorer/tree-selection';

// An inert Maven property correlates terminal events without parsing platform-specific POM paths.
const REQUEST_PROPERTY = '-Divy.sources.download=';

interface SourceDownload {
  id: string;
  pomUri: Uri;
  terminal?: Terminal;
}

export const registerDownloadSourcesHandler = (context: ExtensionContext) => {
  const downloader = new DependencySourceDownloader();
  context.subscriptions.push(downloader);
  registerCommand('ivyProjects.downloadDependencySources', context, (selection?: TreeSelection) => downloader.download(selection));
};

export class DependencySourceDownloader implements Disposable {
  private readonly downloads = new Map<string, SourceDownload>();
  private readonly listeners: Disposable[];
  private disposed = false;

  constructor() {
    this.listeners = [
      window.onDidStartTerminalShellExecution(event => {
        const download = this.findDownload(event.execution.commandLine.value);
        if (download) {
          download.terminal = event.terminal;
        }
      }),
      window.onDidEndTerminalShellExecution(event => this.onExecutionEnd(event)),
      window.onDidCloseTerminal(terminal => {
        for (const download of this.downloads.values()) {
          if (download.terminal === terminal) {
            this.downloads.delete(download.id);
            logWarningMessage(l10n.t('Source download terminal closed before completion was confirmed for {0}.', download.pomUri.fsPath));
          }
        }
      })
    ];
  }

  async download(selection?: TreeSelection): Promise<void> {
    if (!workspace.isTrusted) {
      logWarningMessage(l10n.t('Trust this workspace before downloading dependency sources.'));
      return;
    }
    const pomUri = await this.resolvePom(selection);
    if (!pomUri || this.disposed || !workspace.isTrusted) {
      return;
    }
    const existing = [...this.downloads.values()].find(download => download.pomUri.fsPath === pomUri.fsPath);
    if (existing) {
      void this.offerManualRefresh(existing);
      return;
    }
    const download: SourceDownload = { id: randomUUID(), pomUri };
    this.downloads.set(download.id, download);
    try {
      // The Maven extension preserves executable/wrapper, settings, profiles and Windows shell handling.
      // Its promise only acknowledges launch; it does NOT wait for Maven to exit.
      // PowerShell (including Windows PowerShell 5.1) splits unquoted dotted -D properties.
      // Quote the whole argument so Maven receives a single property, not an extra lifecycle phase.
      await commands.executeCommand('maven.goal.custom', pomUri.fsPath, `dependency:sources "${REQUEST_PROPERTY}${download.id}"`);
      if (this.downloads.has(download.id)) {
        void this.offerManualRefresh(download);
      }
    } catch (error) {
      this.downloads.delete(download.id);
      logErrorMessage(l10n.t('Could not launch Maven source download: {0}', String(error)));
    }
  }

  private async resolvePom(selection?: TreeSelection): Promise<Uri | undefined> {
    const tabInput = window.tabGroups.activeTabGroup.activeTab?.input;
    const selectedUri = selection === undefined
      ? tabInput instanceof TabInputText || tabInput instanceof TabInputCustom
        ? tabInput.uri
        : window.activeTextEditor?.document.uri
      : await treeSelectionToUri(selection);
    if (selection !== undefined && selectedUri?.scheme !== 'file') {
      logWarningMessage(l10n.t('Select a local Axon Ivy project to download dependency sources.'));
      return;
    }
    // Prefer the innermost project in workspaces containing nested projects.
    const projects = [...(await IvyProjectManager.instance.getIvyProjects())].sort((a, b) => b.length - a.length);
    let project = await treeUriToProjectPath(selectedUri?.scheme === 'file' ? selectedUri : undefined, Promise.resolve(projects));
    if (!project && selection !== undefined) {
      logWarningMessage(l10n.t('Select a local Axon Ivy project to download dependency sources.'));
      return;
    }
    project ??= (await selectIvyProjectDialog(l10n.t('Select project to download dependency sources')))?.fsPath;
    if (!project) {
      return;
    }
    const pomUri = Uri.file(path.join(project, 'pom.xml'));
    try {
      await workspace.fs.stat(pomUri);
      return pomUri;
    } catch {
      logErrorMessage(l10n.t('No pom.xml found in Axon Ivy project {0}.', project));
      return;
    }
  }

  private findDownload(commandLine: string): SourceDownload | undefined {
    const id = commandLine.match(/(?:^|[\s"'])-Divy\.sources\.download=([\da-f-]+)(?=$|[\s"'])/)?.[1];
    return id ? this.downloads.get(id) : undefined;
  }

  private onExecutionEnd(event: TerminalShellExecutionEndEvent): void {
    const download = this.findDownload(event.execution.commandLine.value);
    if (!download) {
      return;
    }
    download.terminal = event.terminal;
    if (event.exitCode === undefined) {
      // An unknown exit code is not evidence of a successful Maven invocation.
      void this.offerManualRefresh(download);
    } else if (event.exitCode !== 0) {
      this.downloads.delete(download.id);
      logErrorMessage(l10n.t('Maven source download failed for {0} (exit code {1}). Check the Maven terminal.', download.pomUri.fsPath, event.exitCode));
    } else {
      void this.refreshJava(download);
    }
  }

  private async offerManualRefresh(download: SourceDownload): Promise<void> {
    const refresh = l10n.t('Maven finished: Refresh Java');
    const stopTracking = l10n.t('Stop tracking');
    const choice = await logInformationMessage(
      l10n.t('Source download requested for {0}. Check the Maven terminal. Java refreshes automatically when completion is reported. Otherwise, select Refresh Java only after Maven finishes.', download.pomUri.fsPath),
      refresh,
      stopTracking
    );
    if (this.disposed || !this.downloads.has(download.id)) {
      return;
    }
    if (choice === refresh) {
      await this.refreshJava(download);
    } else if (choice === stopTracking) {
      // Do not terminate the user's Maven terminal/process.
      this.downloads.delete(download.id);
    }
  }

  private async refreshJava(download: SourceDownload): Promise<void> {
    if (this.disposed || !this.downloads.delete(download.id) || !workspace.isTrusted) {
      return;
    }
    try {
      await runJavaServerModeSwitch();
      await commands.executeCommand('java.projectConfiguration.update', download.pomUri);
      logInformationMessage(l10n.t('Java project refresh requested for {0}. Reopen hover or completion after Java finishes updating. Some dependencies do not publish sources.', download.pomUri.fsPath));
    } catch (error) {
      logErrorMessage(l10n.t('Could not refresh Java after downloading sources: {0}', String(error)));
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.downloads.clear();
    this.listeners.forEach(listener => listener.dispose());
  }
}
