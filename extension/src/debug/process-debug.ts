import type { ExtensionContext } from 'vscode';
import { debug, workspace } from 'vscode';
import { registerCommand } from '../base/commands';
import type { IvyEngineManager } from '../engine/engine-manager';
import { ProcessDebugAdapterDescriptorFactory } from './process-debug-adapter-descriptor-factory';
import { PROCESS_DEBUG_NAME, PROCESS_DEBUG_TYPE, ProcessDebugConfigurationProvider } from './process-debug-configuration-provider';

export function registerProcessDebugging(context: ExtensionContext, engineManager: IvyEngineManager) {
  const configurationProvider = new ProcessDebugConfigurationProvider(engineManager);
  const descriptorFactory = new ProcessDebugAdapterDescriptorFactory();
  context.subscriptions.push(
    debug.registerDebugConfigurationProvider(PROCESS_DEBUG_TYPE, configurationProvider),
    debug.registerDebugAdapterDescriptorFactory(PROCESS_DEBUG_TYPE, descriptorFactory)
  );
  registerCommand('ivy.debug.attachProcess', context, async () => await startProcessDebugging());
}

async function startProcessDebugging() {
  const workspaceFolder = workspace.workspaceFolders?.[0];
  return debug.startDebugging(workspaceFolder, {
    type: PROCESS_DEBUG_TYPE,
    request: 'attach',
    name: PROCESS_DEBUG_NAME
  });
}
