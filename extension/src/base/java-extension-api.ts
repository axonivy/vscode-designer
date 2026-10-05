import type { Uri } from 'vscode';
import { commands, extensions, l10n, window, workspace } from 'vscode';
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
    [{ label: l10n.t('Reload Java workspace and window'), detail: l10n.t('Unsaved changes might be lost') }, { label: l10n.t('Cancel') }],
    {
      ignoreFocusOut: true,
      title: l10n.t('{0} - reload Java workspace and window to apply modifications', reason)
    }
  );
  if (selection?.label === l10n.t('Reload Java workspace and window')) {
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
      l10n.t(
        'Could not execute Java command {0}. Java extension might not be installed or activated. Java support will not be fully available.',
        command
      )
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
    [{ label: l10n.t('Reload Window'), detail: l10n.t('Unsaved changes will be lost') }, { label: l10n.t('Continue without reloading') }],
    {
      ignoreFocusOut: true,
      title: l10n.t(
        "For better performance, it's recommended to reload the window to switch back to Java LightWeight mode. After reloading, you'll need to trigger {0} again.",
        task
      )
    }
  );
  if (!selection?.label) {
    return;
  }
  if (selection?.label === l10n.t('Reload Window')) {
    await executeCommand('workbench.action.reloadWindow');
  }
};

export const ensureJavaExtensionInstalled = () => {
  if (extensions.getExtension(JAVA_EXTENSION_ID)) {
    return;
  }
  const installLabel = l10n.t('Install');
  logWarningMessage(l10n.t('Language Support for Java by Red Hat extension is not installed.'), installLabel).then(selection => {
    if (selection === installLabel) {
      logInformationMessage(l10n.t('Installing Language Support for Java by Red Hat extension...'));
      commands.executeCommand('workbench.extensions.installExtension', JAVA_EXTENSION_ID);
    }
  });
};
