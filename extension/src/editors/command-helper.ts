import type { ExtensionContext } from 'vscode';
import { Uri, commands } from 'vscode';
import { registerCommand, type ConfigEditorCommand, type EditorCommand } from '../base/commands';
import { selectIvyProjectDialog } from '../base/ivyProjectSelection';
import { logErrorMessage } from '../base/logging-util';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeSelectionToUri, treeUriToProjectPath, type TreeSelection } from '../project-explorer/tree-selection';

export const registerOpenConfigEditorCmd = (command: ConfigEditorCommand, context: ExtensionContext, file: string) =>
  registerCommand(command, context, async (selection: TreeSelection) => {
    const projectPath = await openEditorCmdProjectPath(command, selection);
    if (!projectPath) {
      logErrorMessage(`${command}: No valid Axon Ivy Project selected.`);
      return;
    }
    const fileUri = Uri.joinPath(Uri.file(projectPath), 'config', file);
    commands.executeCommand('vscode.open', fileUri);
  });

export const openEditorCmdProjectPath = async (command: ConfigEditorCommand | EditorCommand, selection: TreeSelection) => {
  try {
    const uri = (await treeSelectionToUri(selection)) ?? (await selectIvyProjectDialog());
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
