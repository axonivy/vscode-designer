import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import * as fs from 'fs';
import * as path from 'path';
import { l10n, Uri, window } from 'vscode';
import { executeCommand } from '../../../base/commands';
import { logInformationMessage } from '../../../base/logging-util';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { openUrlExternally } from '../../notification-helper';
import { openAction } from './open-action';

export const handleOpenEndPage = async (args: InscriptionActionArgs) => {
  const page = args.payload;
  if (isCmsPage(page)) {
    openAction('ivyEditor.openCmsEditor', args.context.project);
    return;
  }
  openInExplorer(path.join('webContent', page));
};

function isCmsPage(page: string) {
  const pagePath = path.parse(page);
  return pagePath.ext === '.ivc' || pagePath.ext === '';
}

export const handleOpenPage = async (args: InscriptionActionArgs) => {
  const path = args.payload;
  if (isUrl(path)) {
    openUrlExternally(path);
  } else {
    openInExplorer(path);
  }
};

function isUrl(absolutePath: string) {
  return /^https?:\/\//i.test(absolutePath);
}

async function getValidFilePath(pathString: string) {
  if (fs.existsSync(pathString)) {
    return pathString;
  }
  const projectFolder = await getProjectFolder();
  if (typeof projectFolder === 'string' && fs.existsSync(path.join(projectFolder, pathString))) {
    return path.join(projectFolder, pathString);
  }
  return null;
}

async function openInExplorer(path: string) {
  const absolutePath = await getValidFilePath(path);
  if (absolutePath) {
    executeCommand('vscode.open', Uri.file(absolutePath));
  } else {
    logInformationMessage(l10n.t('The entered url is not valid.'));
  }
}

async function getProjectFolder() {
  const tabInput = window.tabGroups.activeTabGroup.activeTab?.input as { uri: Uri };
  const path = tabInput.uri.fsPath.toString();
  return IvyProjectExplorer.instance.getIvyProjects().then(projects => projects.find(ivyProject => path.startsWith(ivyProject)));
}
