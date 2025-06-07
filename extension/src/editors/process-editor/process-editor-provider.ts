import {
  GlspVscodeConnector,
  GlspEditorProvider,
  SocketGlspVscodeServer,
  Writable,
  configureDefaultCommands,
  WebviewEndpoint,
  GLSPDiagramIdentifier
} from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { setupCommunication } from './webview-communication';
import { createWebViewContent } from '../webview-helper';
import { ProcessVscodeConnector } from './process-vscode-connector';
import { messenger } from '../..';
import { configureDiagramDiffCommand, DIAGRAM_DIFF_EXTENSION, getDiagramDiffFromUri } from './diagram-diff';

interface ProcessEditorDiagramIdentifier extends GLSPDiagramIdentifier {
  diff?: {
    id: string;
    side: 'left' | 'right';
    content: string;
  };
}

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

  private webViewCount = 0;
  override async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    // This is used to initialize GLSP for our diagram
    const diagramIdentifier: ProcessEditorDiagramIdentifier = {
      diagramType: this.diagramType,
      uri: serializeUri(document.uri),
      clientId: `${this.diagramType}_${this.webViewCount++}`
    };

    if (document.uri.path.endsWith(DIAGRAM_DIFF_EXTENSION)) {
      const diff = getDiagramDiffFromUri(document.uri);
      if (!diff) {
        throw new Error(`Invalid diff URI: ${document.uri}`);
      }
      const contentBuffer = await vscode.workspace.fs.readFile(diff.uri);
      const content = new TextDecoder().decode(contentBuffer);
      diagramIdentifier.diff = {
        id: diff.diffId,
        side: diff.side,
        content: content
      };
      // Set the URI to the original file for now, so that the editor does not break
      // unitl the server propely handles the diff
      diagramIdentifier.uri = 'file://' + diff.uri.path;
    }

    const endpoint = new WebviewEndpoint({ diagramIdentifier, messenger: this.glspVscodeConnector.messenger, webviewPanel });

    // Register document/diagram panel/model in vscode connector
    this.glspVscodeConnector.registerClient({
      clientId: diagramIdentifier.clientId,
      diagramType: diagramIdentifier.diagramType,
      document: document,
      webviewEndpoint: endpoint
    });

    this.setUpWebview(document, webviewPanel, token, diagramIdentifier.clientId);
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

  static register(context: vscode.ExtensionContext, websocketUrl: URL) {
    configureDiagramDiffCommand(context);
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
  let uriString = uri.toString();
  const match = uriString.match(/file:\/\/\/([a-z])%3A/i);
  if (match) {
    uriString = 'file:///' + match[1] + ':' + uriString.substring(match[0].length);
  }
  return uriString;
}
