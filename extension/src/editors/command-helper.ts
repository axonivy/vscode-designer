import fs from 'fs';
import type { ExtensionContext } from 'vscode';
import { Uri, commands, l10n, workspace } from 'vscode';
import { registerCommand, type ConfigEditorCommand, type EditorCommand } from '../base/commands';
import { logErrorMessage } from '../base/logging-util';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeSelectionToProjectUri, treeUriToProjectPath, type TreeSelection } from '../project-explorer/tree-selection';

export const registerOpenConfigEditorCmd = (command: ConfigEditorCommand, context: ExtensionContext, file: string) =>
  registerCommand(command, context, async (selection: TreeSelection) => {
    const projectPath = await getEditorCmdProjectPath(command, selection);
    if (!projectPath) {
      return;
    }
    const configDir = Uri.joinPath(Uri.file(projectPath), 'config');
    const fileUri = Uri.joinPath(configDir, file);
    if (!fs.existsSync(fileUri.fsPath)) {
      await workspace.fs.createDirectory(configDir);
      await workspace.fs.writeFile(fileUri, new Uint8Array());
    }
    commands.executeCommand('vscode.open', fileUri);
  });

export const getEditorCmdProjectPath = async (command: ConfigEditorCommand | EditorCommand, selection: TreeSelection) => {
  const ivyProjects = IvyProjectExplorer.instance.getIvyProjects();
  const projectUri = await treeSelectionToProjectUri(selection, ivyProjects);
  if (!projectUri) {
    return;
  }
  const projectPath = await treeUriToProjectPath(projectUri, ivyProjects);
  if (!projectPath) {
    logErrorMessage(l10n.t('{0}: Selected project {1} is not a valid Axon Ivy project path.', command, projectUri.fsPath));
    return;
  }
  return projectPath;
};
