import 'reflect-metadata';
import { type ExtensionContext } from 'vscode';
import { Messenger, type MessengerDiagnostic } from 'vscode-messenger';
import { registerTools } from './ai/tools/tools';
import { registerCommand } from './base/commands';
import { config } from './base/configurations';
import { validateAndSyncJavaVersion } from './base/java-version-validation';
import { askToReloadWindow } from './base/reload-window';
import { newMarkdownString, setStatusBarItem, showStatusBarQuickPick } from './base/status-bar';
import { addDevContainer } from './dev-container/command';
import { conditionalWelcomePage, showWelcomePage } from './editors/welcome-page/welcome-page';
import { IvyDiagnostics } from './engine/diagnostics';
import { IvyEngineManager } from './engine/engine-manager';
import { registerAddDependencyHandler } from './maven/add-dependency';
import { IvyProjectExplorer } from './project-explorer/ivy-project-explorer';
import { resolveExtensionVersion } from './version/extension-version';
import { showRuntimeLog } from './views/runtimelog-view';

let ivyEngineManager: IvyEngineManager;
export const messenger = new Messenger({ ignoreHiddenViews: false });

export async function activate(context: ExtensionContext): Promise<MessengerDiagnostic> {
  setStatusBarItem({
    text: 'Activating...',
    hoverMarkdown: newMarkdownString('Activating...'),
    icon: '$(loading~spin)',
    isClickable: false
  });
  try {
    await validateAndSyncJavaVersion();
    resolveExtensionVersion(context);
    ivyEngineManager = IvyEngineManager.init(context);
    registerCommand('engine.deployProjects', context, () => ivyEngineManager.deployProjects());
    registerCommand('engine.switchEngineReleaseTrain', context, () => ivyEngineManager.switchEngineReleaseTrain());
    registerCommand('engine.activateAnimation', context, async () => await config.setProcessAnimationAnimate(true));
    registerCommand('engine.deactivateAnimation', context, async () => await config.setProcessAnimationAnimate(false));
    registerCommand('engine.restart', context, async () => await askToReloadWindow('Engine restart'));
    registerCommand('ivy.addDevContainer', context, () => addDevContainer(context.extensionUri));
    registerCommand('ivyPanelView.openRuntimeLog', context, () => showRuntimeLog());
    registerCommand('ivyPanelView.openWelcomePage', context, () => showWelcomePage(context));
    registerCommand('ivy.showStatusBarQuickPick', context, () => showStatusBarQuickPick());

    registerTools(context);

    IvyDiagnostics.init(context);
    conditionalWelcomePage(context);

    await IvyProjectExplorer.init(context);
    registerAddDependencyHandler(context);
    setStatusBarItem({});
    return messenger.diagnosticApi();
  } catch (error) {
    setStatusBarItem({
      text: 'Activation failed',
      hoverMarkdown: newMarkdownString('Activation failed.\nCheck the error logs for more details.\nTry to reload the window.'),
      icon: '$(error)',
      isError: true,
      isClickable: false
    });
    throw error;
  }
}

export async function deactivate() {
  await ivyEngineManager.stop();
}
