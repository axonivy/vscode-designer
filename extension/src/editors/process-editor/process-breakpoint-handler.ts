import { ShowBreakpointAction, type ElementBreakpoint } from '@axonivy/process-editor-protocol';
import type { Action } from '@eclipse-glsp/protocol';
import type { GlspVscodeClient } from '@eclipse-glsp/vscode-integration';
import type { CustomDocument, Disposable } from 'vscode';
import { Location, Position, SourceBreakpoint, debug } from 'vscode';
import { ProcessBreakpointLocationResolver } from './process-breakpoint-location-resolver';

type DispatchAction = (action: Action, clientId: string) => void;
type GetClient = (clientId: string) => GlspVscodeClient<CustomDocument> | undefined;
type GetClientIds = () => IterableIterator<string>;

export class ProcessBreakpointHandler {
  private readonly locationResolver = new ProcessBreakpointLocationResolver();

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

    const line = await this.locationResolver.lineOfPid(client.document.uri, elementId);
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
    const elementId = await this.locationResolver.pidOfLine(breakpoint.location.uri, breakpoint.location.range.start.line);
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
    const documentUri = client.document.uri.toString();
    const breakpoints = debug.breakpoints
      .filter((breakpoint): breakpoint is SourceBreakpoint => breakpoint instanceof SourceBreakpoint)
      .filter(breakpoint => breakpoint.location.uri.toString() === documentUri);

    const elementBreakpoints = await Promise.all(breakpoints.map(breakpoint => this.toElementBreakpoint(breakpoint)));
    return elementBreakpoints.filter((breakpoint): breakpoint is ElementBreakpoint => breakpoint !== undefined);
  }

  private async breakpointOf(client: GlspVscodeClient<CustomDocument>, elementId: string): Promise<SourceBreakpoint | undefined> {
    const line = await this.locationResolver.lineOfPid(client.document.uri, elementId);
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
}
