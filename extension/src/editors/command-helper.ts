import * as vscode from 'vscode';
import { registerCommand, type ConfigEditorCommand, type EditorCommand } from '../base/commands';
import { getIvyProject } from '../base/ivyProjectSelection';
import { logErrorMessage } from '../base/logging-util';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeSelectionToUri, treeUriToProjectPath, type TreeSelection } from '../project-explorer/tree-selection';

export const registerOpenConfigEditorCmd = (command: ConfigEditorCommand, context: vscode.ExtensionContext, file: string) =>
  registerCommand(command, context, async (selection: TreeSelection) => {
    const projectPath = await openEditorCmdProjectPath(command, selection);
    if (!projectPath) {
      logErrorMessage(`${command}: No valid Axon Ivy Project selected.`);
      return;
    }
    const fileUri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), 'config', file);
    vscode.commands.executeCommand('vscode.open', fileUri);
  });

export const openEditorCmdProjectPath = async (command: ConfigEditorCommand | EditorCommand, selection: TreeSelection) => {
  try {
    const uri = (await treeSelectionToUri(selection)) ?? (await getIvyProject(IvyProjectExplorer.instance));
    if (!uri) {
      logErrorMessage(`${command}: No valid Axon Ivy Project selected.`);
      return;
    }
    return await treeUriToProjectPath(uri, IvyProjectExplorer.instance.getIvyProjects());
  } catch (error) {
    logErrorMessage(error instanceof Error ? error.message : String(error));
    return;
  }
};
