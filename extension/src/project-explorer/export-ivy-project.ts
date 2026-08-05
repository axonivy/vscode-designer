import fs from 'fs';
import path from 'path';
import { commands, Uri, window, workspace } from 'vscode';
import { logErrorMessage } from '../base/logging-util';

export const exportIvyProject = async (projectPath: string) => {
  const projectPomPath = path.join(projectPath, 'pom.xml');
  if (!fs.existsSync(projectPomPath)) {
    throw new Error(`Export Axon Ivy Project: No pom.xml found in the root of the selected project path: ${projectPath}`);
  }

  let saveDefaultPath: Uri | undefined;
  let outputUri: Uri | undefined;
  while (true) {
    outputUri = await selectOutputFilePath(saveDefaultPath);
    if (!outputUri) {
      return;
    }
    try {
      await workspace.fs.stat(outputUri);
      saveDefaultPath = Uri.file(path.dirname(outputUri.fsPath));
      logErrorMessage(`Axon Ivy Export Error - File already exists: ${outputUri.fsPath}. Please choose a different path or name.`);
    } catch {
      break;
    }
  }

  try {
    await commands.executeCommand('maven.goal.package', { pomPath: projectPomPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Axon Ivy Export Error - Failed to execute Maven package goal. Error: ${message}`,
      error instanceof Error ? { cause: error } : undefined
    );
  }

};

const selectOutputFilePath = async (saveDefaultPath?: Uri): Promise<Uri | undefined> => {
  return window.showSaveDialog({
    title: 'Select output file path for the exported file',
    saveLabel: 'Export',
    defaultUri: saveDefaultPath,
  });
}
