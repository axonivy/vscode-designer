import { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { executeCommand } from '../../../base/commands';
import { logInformationMessage } from '../../../base/logging-util';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { openUrlExternally } from '../../notification-helper';

export const handleOpenPage = async (actionArgs: InscriptionActionArgs) => {
  const path = actionArgs.payload.toString();
  if (isUrl(path)) {
    openUrlExternally(path);
  } else {
    openInExplorer(await getValideFilePath(path));
  }
};

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

function openInExplorer(absolutePath: string | null) {
  if (absolutePath) {
    executeCommand('vscode.open', vscode.Uri.file(absolutePath));
  } else {
    logInformationMessage('The entered url is not valid.');
  }
}

async function getProjectFolder() {
  const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input as { uri: vscode.Uri };
  const path = tabInput.uri.fsPath.toString();
  return IvyProjectExplorer.instance.getIvyProjects().then(projects => projects.find(ivyProject => path.startsWith(ivyProject)));
}
