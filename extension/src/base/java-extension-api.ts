import type { Uri } from 'vscode';
import { window } from 'vscode';
import { executeCommand, type JavaCommand } from './commands';
import { logWarningMessage } from './logging-util';

export const runJavaProjectImport = async () => {
  return await runJavaCommand('java.project.import.command');
};

export const runJavaProjectConfigurationUpdate = async (uris: Uri | Uri[]) => {
  return await runJavaCommand('java.projectConfiguration.update', uris);
};

export const askToRunJavaCleanWorkspace = async (reason: string) => {
  const selection = await window.showQuickPick(
    [{ label: 'Reload Java workspace and window', detail: 'Unsaved changes might be lost' }, { label: 'Cancel' }],
    {
      ignoreFocusOut: true,
      title: `${reason} - reload Java workspace and window to apply modifications`
    }
  );
  if (selection?.label === 'Reload Java workspace and window') {
    // Force clean the Java workspace
    return await runJavaCommand('java.clean.workspace', true);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runJavaCommand = async (command: JavaCommand, ...args: any[]) => {
  try {
    return await executeCommand(command, ...args);
  } catch (error) {
    logWarningMessage(
      `Could not execute Java command. Java extension might not be installed or activated. Java support will not be fully available. ${error}`
    );
  }
};
