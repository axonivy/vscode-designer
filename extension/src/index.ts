import 'reflect-metadata';
import { commands, extensions, type ExtensionContext } from 'vscode';
import { Messenger, type MessengerDiagnostic } from 'vscode-messenger';
import { LocalMcpServer } from './ai/tools/local-mcp';
import { registerTools } from './ai/tools/tools';
import { registerCommand } from './base/commands';
import { config } from './base/configurations';
import { showExtensionLog } from './base/extension-output-channel';
import { validateAndSyncJavaVersion } from './base/java-version-validation';
import { logInformationMessage, logWarningMessage } from './base/logging-util';
import { askToReloadWindow } from './base/reload-window';
import { newMarkdownString, StatusBar } from './base/status-bar';
import { addDevContainer } from './dev-container/command';
import { conditionalWelcomePage, showWelcomePage } from './editors/welcome-page/welcome-page';
import { IvyDiagnostics } from './engine/diagnostics';
import { IvyEngineManager } from './engine/engine-manager';
import { showEngineLog } from './engine/engine-output-channel';
import { registerAddDependencyHandler } from './maven/add-dependency';
import { IvyProjectExplorer } from './project-explorer/ivy-project-explorer';
import { resolveExtensionVersion } from './version/extension-version';
import { showRuntimeLog } from './views/runtimelog-view';

let ivyEngineManager: IvyEngineManager;
let localMcpServer: LocalMcpServer;
export const messenger = new Messenger({ ignoreHiddenViews: false });

export async function activate(context: ExtensionContext): Promise<MessengerDiagnostic> {
  StatusBar.init(context);
  StatusBar.overrideStatusBar({
    text: 'Activating...',
    tooltip: newMarkdownString('Activating Axon Ivy Extension ...'),
    icon: '$(loading~spin)',
    isClickable: false
  });
  try {
    await validateAndSyncJavaVersion();
    ensureJavaExtensionInstalled();
    resolveExtensionVersion(context);
    ivyEngineManager = IvyEngineManager.init(context);
    registerCommand('engine.deployProjects', context, () => ivyEngineManager.deployProjects());
    registerCommand('engine.switchEngineReleaseTrain', context, () => ivyEngineManager.switchEngineReleaseTrain());
    registerCommand('engine.activateAnimation', context, async () => await config.setProcessAnimationAnimate(true));
    registerCommand('engine.deactivateAnimation', context, async () => await config.setProcessAnimationAnimate(false));
    registerCommand('engine.restart', context, async () => await askToReloadWindow('Engine restart'));
    registerCommand('ivy.addDevContainer', context, () => addDevContainer(context.extensionUri));
    registerCommand('ivyPanelView.openRuntimeLog', context, () => showRuntimeLog());
    registerCommand('ivyPanelView.openExtensionLog', context, () => showExtensionLog());
    registerCommand('ivyPanelView.openEngineLog', context, () => showEngineLog());
    registerCommand('ivyPanelView.openWelcomePage', context, () => showWelcomePage(context));
    registerCommand('ivy.showStatusBarQuickPick', context, (visibleOptions?: string[]) => StatusBar.showStatusBarQuickPick(visibleOptions));

    registerTools(context);
    const localMcp = config.localMcp();
    localMcpServer = new LocalMcpServer();
    await localMcpServer.start(localMcp);

    IvyDiagnostics.init(context);
    conditionalWelcomePage(context);

    await IvyProjectExplorer.init(context);
    registerAddDependencyHandler(context);
    StatusBar.refreshStatusBar();
    return messenger.diagnosticApi();
  } catch (error) {
    StatusBar.overrideStatusBar({
      text: 'Activation failed',
      tooltip: newMarkdownString('Activation of Axon Ivy Extension failed.\nCheck the error logs for more details.'),
      icon: '$(error)',
      isError: true,
      visibleOptions: ['openRuntimeLog', 'openExtensionLog', 'openEngineLog', 'openSettings']
    });
    throw error;
  }
}

export async function deactivate() {
  await localMcpServer?.stop();
  await ivyEngineManager?.stop();
}

const ensureJavaExtensionInstalled = () => {
  const JAVA_EXTENSION_ID = 'redhat.java';
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
