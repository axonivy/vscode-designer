import type { Uri } from 'vscode';
import { executeCommand, type JavaCommand } from './commands';
import { logWarningMessage } from './logging-util';

export const runJavaProjectImport = async () => {
  return await runJavaCommand('java.project.import.command');
};

export const runJavaCleanWorkspace = async () => {
  return await runJavaCommand('java.clean.workspace');
};

export const runJavaProjectConfigurationUpdate = async (uris: Uri | Uri[]) => {
  return await runJavaCommand('java.projectConfiguration.update', uris);
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
