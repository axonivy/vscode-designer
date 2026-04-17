import type { DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { logErrorMessage } from '../base/logging-util';
import type { IvyEngineManager } from '../engine/engine-manager';

export const PROCESS_DEBUG_TYPE = 'ivy-process';
export const PROCESS_DEBUG_NAME = 'Attach to Axon Ivy Engine';

type ProcessDebugConfiguration = DebugConfiguration & {
  type: typeof PROCESS_DEBUG_TYPE;
  request: 'attach';
  name: string;
  host?: string;
  port?: number | string;
  workspaceFolder?: string;
};

export class ProcessDebugConfigurationProvider implements DebugConfigurationProvider {
  constructor(private readonly engineManager: IvyEngineManager) {}

  provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
    return [
      {
        type: PROCESS_DEBUG_TYPE,
        request: 'attach',
        name: PROCESS_DEBUG_NAME,
        workspaceFolder: folder?.uri.fsPath
      }
    ];
  }

  async resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration
  ): Promise<DebugConfiguration | undefined> {
    const configuration = this.toProcessDebugConfiguration(debugConfiguration);

    try {
      const connection = await this.engineManager.resolveDebugConnection({
        host: configuration.host,
        port: this.toPort(configuration.port)
      });

      if (!connection.port) {
        void logErrorMessage(
          'No Axon Ivy debug port is configured. Set axonivy.engine.debugPort or specify port in the debug configuration.'
        );
        return undefined;
      }

      return {
        ...configuration,
        host: connection.host,
        port: connection.port,
        workspaceFolder: configuration.workspaceFolder ?? folder?.uri.fsPath
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void logErrorMessage(`Unable to resolve Axon Ivy debug connection: ${message}`);
      return undefined;
    }
  }

  private toProcessDebugConfiguration(debugConfiguration: DebugConfiguration): ProcessDebugConfiguration {
    return {
      ...debugConfiguration,
      type: PROCESS_DEBUG_TYPE,
      request: 'attach',
      name:
        typeof debugConfiguration.name === 'string' && debugConfiguration.name.length > 0 ? debugConfiguration.name : PROCESS_DEBUG_NAME,
      host: typeof debugConfiguration.host === 'string' ? debugConfiguration.host : undefined,
      port: debugConfiguration.port as number | string | undefined,
      workspaceFolder: typeof debugConfiguration.workspaceFolder === 'string' ? debugConfiguration.workspaceFolder : undefined
    };
  }

  private toPort(value: number | string | undefined): number | undefined {
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
