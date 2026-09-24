import type { Uri } from 'vscode';
import { commands, extensions, window, workspace } from 'vscode';
import { executeCommand, type JavaCommand } from './commands';
import { logInformationMessage, logWarningMessage } from './logging-util';

export const JAVA_EXTENSION_ID = 'redhat.java';

export const runJavaProjectImport = async () => {
  return await runJavaCommand('java.project.import.command');
};

export const runJavaProjectConfigurationUpdate = async (uris: Uri | Uri[]) => {
  return await runJavaCommand('java.projectConfiguration.update', uris);
};

export const runJavaServerModeSwitch = async () => {
  if (workspace.getConfiguration().inspect('java.server.launchMode')?.workspaceValue) {
    return; // user has specified a workspace value for the launch mode
  }
  if (workspace.getConfiguration().get<string>('java.server.launchMode') == 'Standard') {
    return; // already in Standard mode
  }
  return await runJavaCommand('java.server.mode.switch', 'Standard', true);
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
  } catch {
    logWarningMessage(
      `Could not execute Java command ${command}. Java extension might not be installed or activated. Java support will not be fully available.`
    );
  }
};

export const ensureJavaLightWeightMode = async (task: string) => {
  const javaExtension = extensions.getExtension(JAVA_EXTENSION_ID);
  if (!javaExtension || !javaExtension.isActive) {
    return;
  }
  if (javaExtension.exports.serverMode !== 'Standard') {
    return;
  }
  const launchMode = workspace.getConfiguration().get<string>('java.server.launchMode');
  if (launchMode !== 'LightWeight') {
    return;
  }
  const selection = await window.showQuickPick(
    [{ label: 'Reload Window', detail: 'Unsaved changes will be lost' }, { label: 'Continue without reloading' }],
    {
      ignoreFocusOut: true,
      title: `For better performance, it's recommended to reload the window to switch back to Java LightWeight mode. After reloading, you'll need to trigger ${task} again.`
    }
  );
  if (!selection?.label) {
    return;
  }
  if (selection?.label === 'Reload Window') {
    await executeCommand('workbench.action.reloadWindow');
  }
};

export const ensureJavaExtensionInstalled = () => {
  if (extensions.getExtension(JAVA_EXTENSION_ID)) {
    return;
  }
  logWarningMessage('Language Support for Java by Red Hat extension is not installed.', 'Install').then(selection => {
    if (selection === 'Install') {
      logInformationMessage('Installing Language Support for Java by Red Hat extension...');
      commands.executeCommand('workbench.extensions.installExtension', JAVA_EXTENSION_ID);
    }
  });
};
