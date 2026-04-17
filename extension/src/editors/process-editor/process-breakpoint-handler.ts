import { ShowBreakpointAction, type ElementBreakpoint } from '@axonivy/process-editor-protocol';
import type { Action } from '@eclipse-glsp/protocol';
import type { GlspVscodeClient } from '@eclipse-glsp/vscode-integration';
import type { CustomDocument, Disposable } from 'vscode';
import { Location, Position, SourceBreakpoint, Uri, debug } from 'vscode';

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

  toggleBreakpoint(clientId: string, elementId: string) {
    const client = this.getClient(clientId);
    if (!client) {
      return;
    }

    const existingBreakpoint = this.breakpointOf(client, elementId);
    if (existingBreakpoint) {
      debug.removeBreakpoints([existingBreakpoint]);
      return;
    }

    const breakpointUri = this.breakpointUriOf(client, elementId);
    debug.addBreakpoints([new SourceBreakpoint(new Location(breakpointUri, new Position(2, 0)), undefined, 'true')]);
  }

  setBreakpointDisabled(clientId: string, elementId: string, disabled: boolean) {
    const client = this.getClient(clientId);
    if (!client) {
      return;
    }

    const existingBreakpoint = this.breakpointOf(client, elementId);
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

  syncForClient(clientId: string) {
    const client = this.getClient(clientId);
    if (!client) {
      return;
    }

    this.dispatchAction(
      ShowBreakpointAction.create({
        elementBreakpoints: this.breakpointsOf(client),
        globalDisabled: false
      }),
      clientId
    );
  }

  syncForAllClients() {
    for (const clientId of this.getClientIds()) {
      this.syncForClient(clientId);
    }
  }

  private toElementBreakpoint(breakpoint: SourceBreakpoint): ElementBreakpoint | undefined {
    const elementId = breakpoint.location.uri.fragment;
    if (!elementId) {
      return undefined;
    }

    return {
      elementId,
      condition: breakpoint.condition ?? '',
      disabled: !breakpoint.enabled
    };
  }

  private breakpointsOf(client: GlspVscodeClient<CustomDocument>): ElementBreakpoint[] {
    const documentUri = client.document.uri.toString();
    return debug.breakpoints
      .filter((breakpoint): breakpoint is SourceBreakpoint => breakpoint instanceof SourceBreakpoint)
      .filter(breakpoint => breakpoint.location.uri.with({ fragment: '' }).toString() === documentUri)
      .map(breakpoint => this.toElementBreakpoint(breakpoint))
      .filter((breakpoint): breakpoint is ElementBreakpoint => breakpoint !== undefined);
  }

  private breakpointOf(client: GlspVscodeClient<CustomDocument>, elementId: string): SourceBreakpoint | undefined {
    const breakpointUri = this.breakpointUriOf(client, elementId);
    return debug.breakpoints.find(
      (breakpoint): breakpoint is SourceBreakpoint =>
        breakpoint instanceof SourceBreakpoint && breakpoint.location.uri.toString() === breakpointUri.toString()
    );
  }

  private breakpointUriOf(client: GlspVscodeClient<CustomDocument>, elementId: string): Uri {
    return client.document.uri.with({ fragment: elementId });
  }
}
