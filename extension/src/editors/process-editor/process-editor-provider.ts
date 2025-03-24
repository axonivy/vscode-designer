import {
  GlspVscodeConnector,
  GlspEditorProvider,
  SocketGlspVscodeServer,
  Writable,
  configureDefaultCommands,
  CenterAction
} from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { setupCommunication } from './webview-communication';
import { createWebViewContent } from '../webview-helper';
import { DIAGNOSTIC_CLIENT_ID_QUERY_PARAM, DIAGNOSTIC_ELEMENT_ID_QUERY_PARAM, ProcessVscodeConnector } from './process-vscode-connector';
import { messenger } from '../..';

export default class ProcessEditorProvider extends GlspEditorProvider {
  diagramType = 'ivy-glsp-process';
  static readonly viewType = 'ivy.glspDiagram';

  private constructor(
    protected readonly extensionContext: vscode.ExtensionContext,
    protected override readonly glspVscodeConnector: GlspVscodeConnector,
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
    const client = this.glspVscodeConnector['clientMap'].get(clientId);
    setupCommunication(this.websocketUrl, this.glspVscodeConnector.messenger, webviewPanel, client?.webviewEndpoint.messageParticipant);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.extensionContext, webviewPanel.webview, 'process-editor');
  }

  override openCustomDocument(uri: vscode.Uri): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
    const uriParams = new URLSearchParams(uri.query);

    if (uriParams.has(DIAGNOSTIC_ELEMENT_ID_QUERY_PARAM)) {
      const targetElementId = uriParams.get(DIAGNOSTIC_ELEMENT_ID_QUERY_PARAM);
      const targetClientId = uriParams.get(DIAGNOSTIC_CLIENT_ID_QUERY_PARAM);

      if (targetElementId && targetClientId) {
        const client = this.glspVscodeConnector['clientMap'].get(targetClientId);

        if (client) {
          client.webviewEndpoint.webviewPanel.reveal();
          client.webviewEndpoint.sendMessage({ clientId: client.clientId, action: CenterAction.create([targetElementId]) });
        }
      }

      // New document was opened from diagnostic tab -> return plain document, because it will be instantly disposed anyways
    }
    return { uri, dispose: () => undefined };
  }

  override resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    const documentUriParams = new URLSearchParams(document.uri.query);
    if (documentUriParams.has(DIAGNOSTIC_ELEMENT_ID_QUERY_PARAM)) {
      webviewPanel.dispose();
      return Promise.resolve();
    }
    return super.resolveCustomEditor(document, webviewPanel, token);
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
