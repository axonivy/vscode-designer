import fs from 'fs';
import type { ExtensionContext } from 'vscode';
import { Uri, l10n, workspace } from 'vscode';
import { executeCommand, registerCommand, type ConfigEditorCommand, type EditorCommand } from '../base/commands';
import { logErrorMessage } from '../base/logging-util';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import { treeSelectionToProjectUri, treeUriToProjectPath, type TreeSelection } from '../project-explorer/tree-selection';
import type { OpenActionMessage } from './process-editor/inscription-view/open-action';

export const registerOpenConfigEditorCmd = (
  command: ConfigEditorCommand,
  context: ExtensionContext,
  file: string,
  onOpenMessage?: (uri: Uri, message?: OpenActionMessage) => void
) =>
  registerCommand(command, context, async (selection: TreeSelection, message?: OpenActionMessage) => {
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
    executeCommand('vscode.open', fileUri).then(() => onOpenMessage?.(fileUri, message));
  });

export const getEditorCmdProjectPath = async (command: ConfigEditorCommand | EditorCommand, selection: TreeSelection) => {
  const ivyProjects = IvyProjectManager.instance.getIvyProjects();
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
