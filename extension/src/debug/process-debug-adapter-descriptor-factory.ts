import { DebugAdapterServer, type DebugAdapterDescriptor, type DebugAdapterDescriptorFactory, type DebugSession } from 'vscode';
import { logErrorMessage } from '../base/logging-util';

const DEFAULT_PROCESS_DEBUG_HOST = 'localhost';

export class ProcessDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(session: DebugSession): DebugAdapterDescriptor | undefined {
    const port = this.toPort(session.configuration.port);
    if (!port) {
      void logErrorMessage('No Axon Ivy debug port is configured for this debug session.');
      return undefined;
    }

    const host = typeof session.configuration.host === 'string' && session.configuration.host.trim().length > 0
      ? session.configuration.host.trim()
      : DEFAULT_PROCESS_DEBUG_HOST;
    return new DebugAdapterServer(port, host);
  }

  private toPort(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    }
    return undefined;
  }
}