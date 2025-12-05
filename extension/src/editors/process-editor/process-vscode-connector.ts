import { SetModelAction } from '@eclipse-glsp/protocol';
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
import { logErrorMessage, logInformationMessage, logWarningMessage } from '../../base/logging-util';
import { SelectedElement } from '../../base/process-editor-connector';
import ProcessEditorProvider from './process-editor-provider';

type IvyGlspClient = GlspVscodeClient & { app: string; pmv: string };
const severityMap = new Map([
  ['info', vscode.DiagnosticSeverity.Information],
  ['warning', vscode.DiagnosticSeverity.Warning],
  ['error', vscode.DiagnosticSeverity.Error]
]);

export class ProcessVscodeConnector<D extends vscode.CustomDocument = vscode.CustomDocument> extends GlspVscodeConnector {
  private readonly emitter = new vscode.EventEmitter<SelectedElement>();
  private readonly onSelectedElementUpdate = this.emitter.event;
  protected readonly onDidChangeActiveGlspEditorEventEmitter = new vscode.EventEmitter<{ client: GlspVscodeClient<D> }>();
  private readonly modelLoading: vscode.StatusBarItem;

  constructor(options: GlspVscodeConnectorOptions) {
    super(options);
    this.onSelectionUpdate(selection => this.selectionChange(selection));
    this.modelLoading = vscode.window.createStatusBarItem();
    this.modelLoading.text = '$(loading~spin) Model loading';
  }

  get onDidChangeActiveGlspEditor() {
    return this.onDidChangeActiveGlspEditorEventEmitter.event;
  }

  override async registerClient(client: GlspVscodeClient<D>): Promise<void> {
    this.onDidChangeActiveGlspEditorEventEmitter.fire({ client });

    client.webviewEndpoint.webviewPanel.onDidChangeViewState(e => {
      if (e.webviewPanel.active) {
        this.onDidChangeActiveGlspEditorEventEmitter.fire({ client });
      }
    });
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
        if (pids[0]) {
          return this.newSelectedElement(ivyClient, pids[0]);
        }
      }
    }
    return undefined;
  }

  protected override handleNavigateToExternalTargetAction(
    message: ActionMessage<NavigateToExternalTargetAction>,
    _client: GlspVscodeClient<D> | undefined,
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
        logErrorMessage(message.action.message);
        break;
      case 'WARNING':
        logWarningMessage(message.action.message);
        break;
      case 'INFO':
      case 'OK':
        if (message.action.message.includes('Model loading')) {
          this.modelLoading.show();
        } else {
          logInformationMessage(message.action.message);
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
    client: GlspVscodeClient<D> | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _origin: MessageOrigin
  ): MessageProcessingResult {
    if (client) {
      const updatedDiagnostics = message.action.markers.map(marker => {
        const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), marker.description, severityMap.get(marker.kind));
        diagnostic.source = marker.elementId;
        return diagnostic;
      });
      this.diagnostics.set(client.document.uri, updatedDiagnostics);
    }
    return { processedMessage: message, messageChanged: false };
  }
}
