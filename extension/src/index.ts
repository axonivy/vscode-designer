import 'reflect-metadata';
import * as vscode from 'vscode';
import { Messenger, MessengerDiagnostic } from 'vscode-messenger';
import { registerCommand } from './base/commands';
import { config } from './base/configurations';
import { askToReloadWindow } from './base/reload-window';
import { setStatusBarIcon, showStatusBarQuickPick } from './base/status-bar';
import { addDevContainer } from './dev-container/command';
import { conditionalWelcomePage, showWelcomePage } from './editors/welcome-page/welcome-page';
import { IvyDiagnostics } from './engine/diagnostics';
import { IvyEngineManager } from './engine/engine-manager';
import { IvyProjectExplorer } from './project-explorer/ivy-project-explorer';
import { resolveExtensionVersion } from './version/extension-version';
import { showRuntimeLog } from './views/runtimelog-view';

let ivyEngineManager: IvyEngineManager;
export const messenger = new Messenger({ ignoreHiddenViews: false });

export async function activate(context: vscode.ExtensionContext): Promise<MessengerDiagnostic> {
  resolveExtensionVersion(context);
  ivyEngineManager = IvyEngineManager.init(context);
  registerCommand('engine.deployProjects', context, () => ivyEngineManager.deployProjects());
  registerCommand('engine.buildProjects', context, () => ivyEngineManager.buildProjects());
  registerCommand('engine.buildAndDeployProjects', context, () => ivyEngineManager.buildAndDeployProjects());
  registerCommand('engine.switchEngineReleaseTrain', context, () => ivyEngineManager.switchEngineReleaseTrain());
  registerCommand('engine.activateAnimation', context, async () => await config.setProcessAnimationAnimate(true));
  registerCommand('engine.deactivateAnimation', context, async () => await config.setProcessAnimationAnimate(false));
  registerCommand('engine.restart', context, async () => await askToReloadWindow('Engine restart'));
  registerCommand('ivy.addDevContainer', context, () => addDevContainer(context.extensionUri));
  registerCommand('ivyPanelView.openRuntimeLog', context, () => showRuntimeLog());
  registerCommand('ivyPanelView.openWelcomePage', context, () => showWelcomePage(context));
  registerCommand('ivy.showStatusBarQuickPick', context, () => showStatusBarQuickPick());

  IvyProjectExplorer.init(context);
  IvyDiagnostics.init(context);
  setStatusBarIcon();
  conditionalWelcomePage(context);

  return messenger.diagnosticApi();
}

export async function deactivate() {
  await ivyEngineManager.stop();
}
