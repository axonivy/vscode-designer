import { DebugAdapterServer, type DebugAdapterDescriptor, type DebugAdapterDescriptorFactory, type DebugSession } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import { PROCESS_DEBUG_HOST, toPort } from './process-debug-configuration-provider';

export class ProcessDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(session: DebugSession): DebugAdapterDescriptor | undefined {
    const port = toPort(session.configuration.port);
    if (!port) {
      void logErrorMessage('No Axon Ivy debug port is configured for this debug session.');
      return undefined;
    }

    const host =
      typeof session.configuration.host === 'string' && session.configuration.host.trim().length > 0
        ? session.configuration.host.trim()
        : PROCESS_DEBUG_HOST;
    return new DebugAdapterServer(port, host);
  }
}
