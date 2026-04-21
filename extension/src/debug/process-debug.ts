import type { ExtensionContext } from 'vscode';
import { debug, workspace } from 'vscode';
import { registerCommand } from '../base/commands';
import { logWarningMessage } from '../base/logging-util';
import type { IvyEngineManager } from '../engine/engine-manager';
import { ProcessDebugAdapterDescriptorFactory } from './process-debug-adapter-descriptor-factory';
import { PROCESS_DEBUG_NAME, PROCESS_DEBUG_TYPE, ProcessDebugConfigurationProvider } from './process-debug-configuration-provider';

let hasRunningProcessDebugSession = debug.activeDebugSession?.type === PROCESS_DEBUG_TYPE;
const START_PROCESS_DEBUG = 'Start Process Debug';

export function registerProcessDebugging(context: ExtensionContext, engineManager: IvyEngineManager) {
  const configurationProvider = new ProcessDebugConfigurationProvider(engineManager);
  const descriptorFactory = new ProcessDebugAdapterDescriptorFactory();
  context.subscriptions.push(
    debug.registerDebugConfigurationProvider(PROCESS_DEBUG_TYPE, configurationProvider),
    debug.registerDebugAdapterDescriptorFactory(PROCESS_DEBUG_TYPE, descriptorFactory),
    debug.onDidStartDebugSession(session => {
      if (session.type === PROCESS_DEBUG_TYPE) {
        hasRunningProcessDebugSession = true;
      }
    }),
    debug.onDidTerminateDebugSession(session => {
      if (session.type === PROCESS_DEBUG_TYPE) {
        hasRunningProcessDebugSession = false;
      }
    })
  );
  registerCommand('ivy.debug.attachProcess', context, async () => await startProcessDebugging());
}

export function isProcessDebuggingRunning() {
  return hasRunningProcessDebugSession;
}

export async function promptToStartProcessDebuggingIfNeeded() {
  if (hasRunningProcessDebugSession) {
    return false;
  }

  const selection = await logWarningMessage(
    'No Axon Ivy process debug session is running. Do you want to start one now?',
    START_PROCESS_DEBUG
  );
  if (selection !== START_PROCESS_DEBUG) {
    return false;
  }

  return startProcessDebugging();
}

async function startProcessDebugging() {
  if (hasRunningProcessDebugSession) {
    await logWarningMessage('An Axon Ivy process debug session is already running. Stop it before starting another one.');
    return false;
  }

  hasRunningProcessDebugSession = true;
  const workspaceFolder = workspace.workspaceFolders?.[0];
  const started = await debug.startDebugging(workspaceFolder, {
    type: PROCESS_DEBUG_TYPE,
    request: 'attach',
    name: PROCESS_DEBUG_NAME
  });
  if (!started) {
    hasRunningProcessDebugSession = false;
  }
  return started;
}
