import {
  GlspVscodeConnector,
  GlspEditorProvider,
  SocketGlspVscodeServer,
  Writable,
  configureDefaultCommands,
  SelectAction,
  CenterAction,
  WebviewEndpoint,
  GLSPDiagramIdentifier,
  GlspVscodeClient
} from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { setupCommunication } from './webview-communication';
import { createWebViewContent } from '../webview-helper';
import { ProcessVscodeConnector, getNavigationTargetElementId } from './process-vscode-connector';
import { messenger } from '../..';

export default class ProcessEditorProvider extends GlspEditorProvider {
  diagramType = 'ivy-glsp-process';
  static readonly viewType = 'ivy.glspDiagram';

  private webViewCount = 0;
  private constructor(
    protected readonly extensionContext: vscode.ExtensionContext,
    protected override readonly glspVscodeConnector: ProcessVscodeConnector,
    readonly websocketUrl: URL
  ) {
    super(glspVscodeConnector);
  }

  async setUpWebview(
    _document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
    clientId: string
  ): Promise<void> {
    const client = this.glspVscodeConnector.clientMap.get(clientId);
    setupCommunication(this.websocketUrl, this.glspVscodeConnector.messenger, webviewPanel, client?.webviewEndpoint.messageParticipant);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.extensionContext, webviewPanel.webview, 'process-editor');
  }

  private getOriginalClient(uri: vscode.Uri): GlspVscodeClient | undefined {
    const cleanedUri = uri.with({ query: '' });
    return Array.from(this.glspVscodeConnector.clientMap.values()).find(
      client => client.diagramType === this.diagramType && client.document.uri.toString() === cleanedUri.toString()
    );
  }

  override openCustomDocument(uri: vscode.Uri): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
    const document = { uri, dispose: () => undefined };
    const navigationTarget = getNavigationTargetElementId(uri);
    if (!navigationTarget) {
      return document;
    }

    const originalClient = this.getOriginalClient(uri);
    if (originalClient) {
      this.naviagteToElement(originalClient, navigationTarget);
    }
    return document;
  }

  private naviagteToElement(client: GlspVscodeClient | GlspVscodeClient, elementId: string): void {
    if (client) {
      client.webviewEndpoint.webviewPanel.reveal();
      client.webviewEndpoint.sendMessage({ clientId: client.clientId, action: CenterAction.create([elementId]) });
      client.webviewEndpoint.sendMessage({
        clientId: client.clientId,
        action: SelectAction.setSelection([elementId])
      });
    }
  }

  override async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    const navigationTarget = getNavigationTargetElementId(document.uri);
    if (!navigationTarget) {
      this.doResolveCustomEditor(document, webviewPanel, token);
      return;
    }

    const originalClient = this.getOriginalClient(document.uri);
    if (originalClient) {
      // The original editor contributing the navigation information is still open (not preview mode) =>
      // we can close the newly created editor
      webviewPanel.dispose();
      return Promise.resolve();
    }

    // In preview mode -> The newly create editor has replaced the original editor
    // => navigate to the element in the new editor
    const client = this.doResolveCustomEditor(document, webviewPanel, token);
    const endpoint = client.webviewEndpoint;
    endpoint.ready.then(() => {
      // Use timeout since we cannot make sure that the diagram is already initialized before sending the navigation messages otherwise.
      // https://github.com/eclipse-glsp/glsp/issues/1513
      setTimeout(() => this.naviagteToElement(client, navigationTarget), 500);
    });
    return;
  }

  // Same implementation as the `resolveCustomEditor` method in the base class
  // but it returns the registered cleint so that we can use it to send messages
  private doResolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): GlspVscodeClient {
    // This is used to initialize GLSP for our diagram
    const diagramIdentifier: GLSPDiagramIdentifier = {
      diagramType: this.diagramType,
      uri: serializeUri(document.uri),
      clientId: `${this.diagramType}_${this.webViewCount++}`
    };

    const endpoint = new WebviewEndpoint({ diagramIdentifier, messenger: this.glspVscodeConnector.messenger, webviewPanel });

    // Register document/diagram panel/model in vscode connector
    this.glspVscodeConnector.registerClient({
      clientId: diagramIdentifier.clientId,
      diagramType: diagramIdentifier.diagramType,
      document: document,
      webviewEndpoint: endpoint
    });

    this.setUpWebview(document, webviewPanel, token, diagramIdentifier.clientId);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.glspVscodeConnector.clientMap.get(diagramIdentifier.clientId)!;
  }

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    const workflowServer = new SocketGlspVscodeServer({
      clientId: 'ivy-glsp-web-ide-process-editor',
      clientName: 'ivy-glsp-web-ide-process-editor',
      connectionOptions: {
        webSocketAddress: new URL('ivy-glsp-web-ide-process-editor', websocketUrl).toString()
      }
    });

    // Initialize GLSP-VSCode connector with server wrapper
    const ivyVscodeConnector = new ProcessVscodeConnector({
      server: workflowServer,
      logging: true
    });
    // use our own custom messenger which may have a different configuration
    (ivyVscodeConnector as Writable<GlspVscodeConnector>).messenger = messenger;

    const customEditorProvider = vscode.window.registerCustomEditorProvider(
      ProcessEditorProvider.viewType,
      new ProcessEditorProvider(context, ivyVscodeConnector, websocketUrl),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );

    context.subscriptions.push(workflowServer, ivyVscodeConnector, customEditorProvider);
    workflowServer.start();

    configureDefaultCommands({ extensionContext: context, connector: ivyVscodeConnector, diagramPrefix: 'workflow' });
  }
}

function serializeUri(uri: vscode.Uri): string {
  // Remove optional navigation query parameters from the URI
  const uriWithoutQuery = uri.with({ query: '' });
  let uriString = uriWithoutQuery.toString();
  const match = uriString.match(/file:\/\/\/([a-z])%3A/i);
  if (match) {
    uriString = 'file:///' + match[1] + ':' + uriString.substring(match[0].length);
  }
  return uriString;
}
