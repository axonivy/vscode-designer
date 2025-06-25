import { Marker, SetModelAction } from '@eclipse-glsp/protocol';
import {
  ActionMessage,
  GModelRootSchema,
  GlspVscodeClient,
  GlspVscodeConnector,
  GlspVscodeConnectorOptions,
  MessageAction,
  MessageOrigin,
  MessageProcessingResult,
  NavigateToExternalTargetAction,
  SelectionState,
  SetMarkersAction
} from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { SelectedElement } from '../../base/process-editor-connector';
import ProcessEditorProvider from './process-editor-provider';

export class NavigatableDocument implements vscode.CustomDocument {
  constructor(
    public readonly diagramType: string,
    public readonly uri: vscode.Uri
  ) {}

  get documentUri(): vscode.Uri {
    return this.uri.with({ query: '' });
  }

  get navigationTarget(): string | undefined {
    return new URLSearchParams(this.uri.query).get('navTargetElement') ?? undefined;
  }

  uniqueUri(navigationTarget?: string): vscode.Uri {
    return NavigatableDocument.uniqueUri(this.uri, navigationTarget);
  }

  dispose(): void {
    // No specific disposal logic needed for this document
  }

  equals(other: vscode.CustomDocument): boolean {
    return (
      other instanceof NavigatableDocument &&
      this.diagramType === other.diagramType &&
      this.documentUri.toString() === other.documentUri.toString()
    );
  }

  static uniqueUri(uri: vscode.Uri, navigationTarget?: string): vscode.Uri {
    const uriParams = new URLSearchParams(uri.query);
    if (navigationTarget) {
      uriParams.set('navTargetElement', navigationTarget);
    }
    uriParams.set('timestamp', new Date().getTime().toString());
    return uri.with({ query: uriParams.toString() });
  }
}

type IvyGlspClient = GlspVscodeClient<NavigatableDocument> & { app: string; pmv: string };
const severityMap = new Map([
  ['info', vscode.DiagnosticSeverity.Information],
  ['warning', vscode.DiagnosticSeverity.Warning],
  ['error', vscode.DiagnosticSeverity.Error]
]);

export class ProcessVscodeConnector extends GlspVscodeConnector<NavigatableDocument> {
  private readonly emitter = new vscode.EventEmitter<SelectedElement>();
  private readonly onSelectedElementUpdate = this.emitter.event;
  protected readonly onDidChangeActiveGlspEditorEventEmitter = new vscode.EventEmitter<{ client: GlspVscodeClient<NavigatableDocument> }>();
  private readonly modelLoading: vscode.StatusBarItem;
  private readonly diagnosticsMap = new Map<string, vscode.DiagnosticCollection>(); // maps clientId to DiagnosticCollections
  public override readonly clientMap: Map<string, GlspVscodeClient<NavigatableDocument>> = new Map();

  constructor(options: GlspVscodeConnectorOptions) {
    super(options);
    this.onSelectionUpdate(selection => this.selectionChange(selection));
    this.modelLoading = vscode.window.createStatusBarItem();
    this.modelLoading.text = '$(loading~spin) Model loading';
  }

  get onDidChangeActiveGlspEditor() {
    return this.onDidChangeActiveGlspEditorEventEmitter.event;
  }

  override async registerClient(client: GlspVscodeClient<NavigatableDocument>): Promise<void> {
    this.onDidChangeActiveGlspEditorEventEmitter.fire({ client });

    client.webviewEndpoint.webviewPanel.onDidChangeViewState(e => {
      if (e.webviewPanel.active) {
        this.onDidChangeActiveGlspEditorEventEmitter.fire({ client });
      }
    });

    const diagnostics = vscode.languages.createDiagnosticCollection();
    client.webviewEndpoint.webviewPanel.onDidDispose(() => {
      diagnostics.dispose();
      this.diagnosticsMap.delete(client.clientId);
    });
    this.diagnosticsMap.set(client.clientId, diagnostics);

    super.registerClient(client);
  }

  onSelectedElement(listener: (selectedElement: SelectedElement) => void) {
    this.onSelectedElementUpdate(listener);
  }

  private newSelectedElement(client: IvyGlspClient, pid: string): SelectedElement {
    return {
      app: client.app,
      pmv: client.pmv,
      pid: pid
    };
  }

  private selectionChange(selection: SelectionState) {
    const selectedElement = this.toSelectedElement(selection.selectedElementsIDs);
    this.emitter.fire(selectedElement);
  }

  private toSelectedElement(pids: string[]): SelectedElement {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, client] of this.clientMap) {
      if (client.webviewEndpoint.webviewPanel.active) {
        const ivyClient = client as IvyGlspClient;
        if (pids.length > 0) {
          return this.newSelectedElement(ivyClient, pids[0]);
        }
      }
    }
    return undefined;
  }

  protected override handleNavigateToExternalTargetAction(
    message: ActionMessage<NavigateToExternalTargetAction>,
    _client: GlspVscodeClient<NavigatableDocument> | undefined,
    _origin: MessageOrigin
  ) {
    const { args } = message.action.target;
    const absolutePath = args?.['absolutePath'] as string;
    if (absolutePath) {
      if (absolutePath.endsWith('.p.json')) {
        this.openWithProcessEditor(absolutePath);
      } else {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(absolutePath));
      }
      return { processedMessage: undefined, messageChanged: true };
    }
    return super.handleNavigateToExternalTargetAction(message, _client, _origin);
  }

  private openWithProcessEditor(absolutePath: string) {
    vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(absolutePath), ProcessEditorProvider.viewType);
  }

  protected override processMessage(message: unknown, origin: MessageOrigin): MessageProcessingResult {
    if (ActionMessage.is(message)) {
      if (SetModelAction.is(message.action)) {
        const action = message.action;
        const client = this.clientMap.get(message.clientId);
        const ivyClient = client as IvyGlspClient;
        const newRoot = action.newRoot as GModelRootSchema & { args: { app: string; pmv: string } };
        ivyClient.app = newRoot.args.app;
        ivyClient.pmv = newRoot.args.pmv;
      }
    }
    return super.processMessage(message, origin);
  }

  protected override handleMessageAction(message: ActionMessage<MessageAction>): MessageProcessingResult {
    switch (message.action.severity) {
      case 'ERROR':
      case 'FATAL':
        vscode.window.showErrorMessage(message.action.message);
        break;
      case 'WARNING':
        vscode.window.showWarningMessage(message.action.message);
        break;
      case 'INFO':
      case 'OK':
        if (message.action.message.includes('Model loading')) {
          this.modelLoading.show();
        } else {
          vscode.window.showInformationMessage(message.action.message);
        }
        break;
      case 'NONE':
        this.modelLoading.hide();
    }
    // Do not propagate action
    return { processedMessage: undefined, messageChanged: true };
  }

  protected override handleSetMarkersAction(
    message: ActionMessage<SetMarkersAction>,
    client: GlspVscodeClient<NavigatableDocument> | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _origin: MessageOrigin
  ): MessageProcessingResult {
    if (client) {
      this.setDiagnostics(
        client,
        message.action.markers.map(marker => [client.document.uniqueUri(marker.elementId), [this.markerToDiagnostic(marker)]])
      );
    }
    return { processedMessage: message, messageChanged: false };
  }

  protected markerToDiagnostic(marker: Marker): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 0),
      marker.description,
      severityMap.get(marker.kind) ?? vscode.DiagnosticSeverity.Information
    );
    diagnostic.source = marker.elementId;
    return diagnostic;
  }

  findClient(document: NavigatableDocument): GlspVscodeClient<NavigatableDocument> | undefined {
    return Array.from(this.clientMap.values()).find(client => client.document.equals(document));
  }

  setDiagnostics(client: GlspVscodeClient<NavigatableDocument>, diagnostics: [vscode.Uri, readonly vscode.Diagnostic[]][]): void {
    const diagnosticCollection = this.getDiagnostics(client);
    diagnosticCollection?.clear();
    diagnosticCollection?.set(diagnostics);
  }

  getDiagnostics(client: GlspVscodeClient<NavigatableDocument>): vscode.DiagnosticCollection | undefined {
    return this.diagnosticsMap.get(client.clientId);
  }
}
