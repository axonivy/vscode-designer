import { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { executeCommand } from '../../../base/commands';
import { logMessage } from '../../../base/logging-util';
import { IvyBrowserViewProvider } from '../../../browser/ivy-browser-view-provider';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { InscriptionActionHandler } from './action-handlers';

export class OpenPageActionHandler implements InscriptionActionHandler {
  actionId = 'openPage' as const;
  async handle(actionArgs: InscriptionActionArgs): Promise<void> {
    const path = actionArgs.payload.toString();
    if (isUrl(path)) {
      openUrlInIntegratedBrowser(path);
    } else {
      openInExplorer(await getValideFilePath(path));
    }
  }
}

function isUrl(absolutePath: string) {
  return /^https?:\/\//i.test(absolutePath);
}

async function getValideFilePath(pathString: string) {
  if (fs.existsSync(pathString)) {
    return pathString;
  }
  const projectFolder = await getProjectFolder();
  if (typeof projectFolder === 'string' && fs.existsSync(path.join(projectFolder, pathString))) {
    return path.join(projectFolder, pathString);
  }
  return null;
}

async function openUrlInIntegratedBrowser(absolutePath: string) {
  await IvyBrowserViewProvider.instance.open(absolutePath);
}

function openInExplorer(absolutePath: string | null) {
  if (absolutePath) {
    executeCommand('vscode.open', vscode.Uri.file(absolutePath));
  } else {
    logMessage('info', 'The entered url is not valid.');
  }
}

async function getProjectFolder() {
  const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input as { uri: vscode.Uri };
  const path = tabInput.uri.fsPath.toString();
  return IvyProjectExplorer.instance.getIvyProjects().then(projects => projects.find(ivyProject => path.startsWith(ivyProject)));
}
