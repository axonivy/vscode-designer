import path from 'path';
import { FileType, Uri, window, workspace } from 'vscode';
import { logInformationMessage } from '../base/logging-util';
import { IvyEngineManager } from '../engine/engine-manager';
import { type TreeSelection, treeSelectionToUri } from './tree-selection';
import { validateArtifactName, validateDotSeparatedName } from './utils/util';

export const addNewProject = async (selection: TreeSelection) => {
  const treeSelectionUri = await treeSelectionToUri(selection);
  const selectedUri = (await isDirectory(treeSelectionUri)) ? treeSelectionUri : await getWorkspaceFolder();
  if (!selectedUri) {
    logInformationMessage('No valid directory selected');
    return;
  }

  const input = await collectNewProjectParams(selectedUri);
  if (input) {
    await IvyEngineManager.instance.createProject(input);
  }
};

const getWorkspaceFolder = async () => {
  const workspaceFolders = workspace.workspaceFolders;
  if (workspaceFolders?.length === 1 && workspaceFolders[0]) {
    return workspaceFolders[0].uri;
  }
  return await window.showWorkspaceFolderPick().then(folder => folder?.uri);
};

const isDirectory = async (uri?: Uri) => {
  if (!uri) {
    return false;
  }
  return (await workspace.fs.stat(uri)).type === FileType.Directory;
};

const collectNewProjectParams = async (selectedUri: Uri) => {
  const prompt = `Project Location: ${selectedUri.path}`;
  const name = await window.showInputBox({
    title: 'Project Name',
    validateInput: validateArtifactName,
    prompt,
    ignoreFocusOut: true
  });
  if (!name) {
    return;
  }
  const projectPath = path.join(selectedUri.fsPath, name);
  const groupId = await window.showInputBox({
    title: 'Group Id',
    value: name,
    validateInput: value => validateDotSeparatedName(value),
    ignoreFocusOut: true
  });
  if (!groupId) {
    return;
  }
  const projectId = await window.showInputBox({
    title: 'Project Id',
    value: name,
    validateInput: value => validateDotSeparatedName(value),
    ignoreFocusOut: true
  });
  if (!projectId) {
    return;
  }
  return { path: projectPath, name, groupId, projectId };
};
