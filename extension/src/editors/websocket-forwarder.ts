import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import vscode, { Uri } from 'vscode';
import {
  Diagnostic,
  DiagnosticSeverity,
  WorkspaceDiagnosticReport,
  WorkspaceFullDocumentDiagnosticReport
} from 'vscode-languageserver-protocol';
import { Messenger } from 'vscode-messenger';
import { isRequestMessage, isResponseMessage, Message, MessageParticipant, NotificationType } from 'vscode-messenger-common';
import { WebSocket } from 'ws';

type Endpoint =
  | 'ivy-inscription-lsp'
  | 'ivy-script-lsp'
  | 'ivy-form-lsp'
  | 'ivy-variables-lsp'
  | 'ivy-data-class-lsp'
  | 'ivy-cms-lsp'
  | 'ivy-database-lsp';

const DIAGNOSTIC_SOURCE = 'Axon Ivy';

export class WebSocketForwarder implements vscode.Disposable {
  readonly toDispose = new DisposableCollection();
  readonly webSocket: WebSocket;
  readonly requests = new Map<string, string>();
  readonly diagnostics = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);

  constructor(
    readonly websocketUrl: URL,
    readonly websocketEndpoint: Endpoint,
    readonly messenger: Messenger,
    readonly messageParticipant: MessageParticipant,
    readonly notificationType: NotificationType<unknown>
  ) {
    this.webSocket = new WebSocket(new URL(websocketEndpoint, websocketUrl));
    this.webSocket.onopen = () => this.initialize();
  }

  protected initialize(): void {
    this.toDispose.push(
      this.messenger.onNotification(this.notificationType, message => this.handleClientMessage(message as Message), {
        sender: this.messageParticipant
      })
    );
    this.webSocket.on('message', msg => this.handleServerMessage(msg.toString()));
  }

  protected handleServerMessage(message: string) {
    console.info('WebSocketForwarder: forwarding message to webview', message);
    const msg = JSON.parse(message) as Message;
    if (isResponseMessage(msg)) {
      const method = this.requests.get(msg.id);
      if (method === 'workspace/diagnostic') {
        const result = msg.result as WorkspaceDiagnosticReport;
        result.items.forEach(item => {
          if (item.kind === 'full') {
            const report = item as WorkspaceFullDocumentDiagnosticReport;
            const uri = Uri.parse(item.uri);
            this.diagnostics.set(
              uri,
              report.items.map(item => this.toDiag(item))
            );
          }
        });
      }
    }
    this.messenger.sendNotification(this.notificationType, this.messageParticipant, message);
  }

  severityMap = new Map([
    [DiagnosticSeverity.Information, vscode.DiagnosticSeverity.Information],
    [DiagnosticSeverity.Warning, vscode.DiagnosticSeverity.Warning],
    [DiagnosticSeverity.Error, vscode.DiagnosticSeverity.Error],
    [DiagnosticSeverity.Hint, vscode.DiagnosticSeverity.Hint]
  ]);

  private toDiag(diag: Diagnostic): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(diag.range.start.line, diag.range.start.character, diag.range.end.line, diag.range.end.character),
      diag.message,
      this.severityMap.get(diag.severity || DiagnosticSeverity.Information)
    );
    diagnostic.source = diag.source;
    return diagnostic;
  }

  protected handleClientMessage(message: Message) {
    console.info('WebSocketForwarder: forwa6rding message to server', message);
    if (isRequestMessage(message)) {
      this.requests.set(message.id, message.method);
    }
    this.webSocket.send(JSON.stringify(message));
  }

  dispose(): void {
    this.toDispose.dispose();
    this.webSocket.close();
  }
}
