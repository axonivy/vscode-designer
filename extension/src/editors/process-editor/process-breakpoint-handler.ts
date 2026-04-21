import { ShowBreakpointAction, type ElementBreakpoint } from '@axonivy/process-editor-protocol';
import type { Action } from '@eclipse-glsp/protocol';
import type { GlspVscodeClient } from '@eclipse-glsp/vscode-integration';
import type { CustomDocument, Disposable, Uri } from 'vscode';
import { Location, Position, SourceBreakpoint, debug } from 'vscode';
import { lineOfPid, pidOfLine } from './process-breakpoint-location-resolver';

type DispatchAction = (action: Action, clientId: string) => void;
type GetClient = (clientId: string) => GlspVscodeClient<CustomDocument> | undefined;
type GetClientIds = () => IterableIterator<string>;

export class ProcessBreakpointHandler {
  constructor(
    private readonly getClient: GetClient,
    private readonly getClientIds: GetClientIds,
    private readonly dispatchAction: DispatchAction
  ) {}

  register(disposables: Disposable[]) {
    disposables.push(debug.onDidChangeBreakpoints(() => this.syncForAllClients()));
  }

  async toggleBreakpoint(clientId: string, elementId: string) {
    const client = this.getClient(clientId);
    if (!client) {
      return;
    }

    const existingBreakpoint = await this.breakpointOf(client, elementId);
    if (existingBreakpoint) {
      debug.removeBreakpoints([existingBreakpoint]);
      return;
    }

    const line = await lineOfPid(client.document.uri, elementId);
    if (line === undefined) {
      return;
    }

    debug.addBreakpoints([new SourceBreakpoint(new Location(client.document.uri, new Position(line, 0)), undefined, 'true')]);
  }

  async setBreakpointDisabled(clientId: string, elementId: string, disabled: boolean) {
    const client = this.getClient(clientId);
    if (!client) {
      return;
    }

    const existingBreakpoint = await this.breakpointOf(client, elementId);
    if (!existingBreakpoint) {
      return;
    }

    debug.removeBreakpoints([existingBreakpoint]);
    debug.addBreakpoints([
      new SourceBreakpoint(
        existingBreakpoint.location,
        !disabled,
        existingBreakpoint.condition,
        existingBreakpoint.hitCondition,
        existingBreakpoint.logMessage
      )
    ]);
  }

  async syncForClient(clientId: string) {
    const client = this.getClient(clientId);
    if (!client) {
      return;
    }

    await this.cleanupStaleBreakpoints(client);

    this.dispatchAction(
      ShowBreakpointAction.create({
        elementBreakpoints: await this.breakpointsOf(client),
        globalDisabled: false
      }),
      clientId
    );
  }

  async syncForAllClients() {
    for (const clientId of this.getClientIds()) {
      await this.syncForClient(clientId);
    }
  }

  private async toElementBreakpoint(breakpoint: SourceBreakpoint): Promise<ElementBreakpoint | undefined> {
    const elementId = await pidOfLine(breakpoint.location.uri, breakpoint.location.range.start.line);
    if (!elementId) {
      return undefined;
    }

    return {
      elementId,
      condition: breakpoint.condition ?? '',
      disabled: !breakpoint.enabled
    };
  }

  private async breakpointsOf(client: GlspVscodeClient<CustomDocument>): Promise<ElementBreakpoint[]> {
    const breakpoints = processBreakpointsOfUri(client.document.uri);

    const elementBreakpoints = await Promise.all(breakpoints.map(breakpoint => this.toElementBreakpoint(breakpoint)));
    return elementBreakpoints.filter((breakpoint): breakpoint is ElementBreakpoint => breakpoint !== undefined);
  }

  private async breakpointOf(client: GlspVscodeClient<CustomDocument>, elementId: string): Promise<SourceBreakpoint | undefined> {
    const line = await lineOfPid(client.document.uri, elementId);
    if (line === undefined) {
      return undefined;
    }

    return debug.breakpoints.find(
      (breakpoint): breakpoint is SourceBreakpoint =>
        breakpoint instanceof SourceBreakpoint &&
        breakpoint.location.uri.toString() === client.document.uri.toString() &&
        breakpoint.location.range.start.line === line
    );
  }

  private processBreakpointsOf(client: GlspVscodeClient<CustomDocument>): SourceBreakpoint[] {
    return processBreakpointsOfUri(client.document.uri);
  }

  private async cleanupStaleBreakpoints(client: GlspVscodeClient<CustomDocument>) {
    const staleBreakpoints: SourceBreakpoint[] = [];

    for (const breakpoint of this.processBreakpointsOf(client)) {
      const pid = await pidOfLine(client.document.uri, breakpoint.location.range.start.line);
      if (!pid) {
        staleBreakpoints.push(breakpoint);
      }
    }

    if (staleBreakpoints.length > 0) {
      debug.removeBreakpoints(staleBreakpoints);
    }
  }
}

type ProcessBreakpointSnapshot = {
  breakpoint: SourceBreakpoint;
  elementId: string;
};

export async function breakpointSnapshot(documentUri: Uri): Promise<ProcessBreakpointSnapshot[]> {
  const snapshots: ProcessBreakpointSnapshot[] = [];
  for (const breakpoint of processBreakpointsOfUri(documentUri)) {
    const elementId = await pidOfLine(documentUri, breakpoint.location.range.start.line);
    if (!elementId) {
      continue;
    }
    snapshots.push({ breakpoint, elementId });
  }
  return snapshots;
}

export async function remapBreakpoints(documentUri: Uri, snapshots: ProcessBreakpointSnapshot[]) {
  const breakpoints = await remappedBreakpoints(documentUri, snapshots);
  if (breakpoints.length === 0) {
    return;
  }
  debug.removeBreakpoints(snapshots.map(snapshot => snapshot.breakpoint));
  debug.addBreakpoints(breakpoints);
}

async function remappedBreakpoints(documentUri: Uri, snapshots: ProcessBreakpointSnapshot[]): Promise<SourceBreakpoint[]> {
  const remappedBreakpoints: SourceBreakpoint[] = [];
  for (const snapshot of snapshots) {
    const line = await lineOfPid(documentUri, snapshot.elementId);
    if (line === undefined) {
      continue;
    }
    remappedBreakpoints.push(
      new SourceBreakpoint(
        new Location(documentUri, new Position(line, 0)),
        snapshot.breakpoint.enabled,
        snapshot.breakpoint.condition,
        snapshot.breakpoint.hitCondition,
        snapshot.breakpoint.logMessage
      )
    );
  }
  return remappedBreakpoints;
}

function processBreakpointsOfUri(documentUri: Uri): SourceBreakpoint[] {
  return debug.breakpoints
    .filter((breakpoint): breakpoint is SourceBreakpoint => breakpoint instanceof SourceBreakpoint)
    .filter(breakpoint => breakpoint.location.uri.toString() === documentUri.toString());
}
