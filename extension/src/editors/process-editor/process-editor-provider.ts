import {
  GlspEditorProvider,
  GlspVscodeConnector,
  SocketGlspVscodeServer,
  configureDefaultCommands
} from '@eclipse-glsp/vscode-integration';
import type { CancellationToken, CustomDocument, ExtensionContext, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import { messenger } from '../..';
import { createWebViewContent } from '../webview-helper';
import { breakpointSnapshot, remapBreakpoints } from './process-breakpoint-handler';
import { ProcessVscodeConnector } from './process-vscode-connector';
import { setupCommunication } from './webview-communication';

export default class ProcessEditorProvider extends GlspEditorProvider {
  diagramType = 'ivy-glsp-process';
  static readonly viewType = 'ivy.glspDiagram';

  private constructor(
    protected readonly extensionContext: ExtensionContext,
    protected override readonly glspVscodeConnector: GlspVscodeConnector,
    readonly websocketUrl: URL
  ) {
    super(glspVscodeConnector);
  }

  async setUpWebview(document: CustomDocument, webviewPanel: WebviewPanel, _token: CancellationToken, clientId: string): Promise<void> {
    const client = this.glspVscodeConnector['clientMap'].get(clientId);
    setupCommunication(
      this.websocketUrl,
      this.glspVscodeConnector.messenger,
      webviewPanel,
      document,
      client?.webviewEndpoint.messageParticipant
    );
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.extensionContext, webviewPanel.webview, 'process-editor');
  }

  override async saveCustomDocument(document: CustomDocument, cancellation: CancellationToken): Promise<void> {
    const breakpoints = await breakpointSnapshot(document.uri);
    await super.saveCustomDocument(document, cancellation);
    await remapBreakpoints(document.uri, breakpoints);
  }

  static register(context: ExtensionContext, websocketUrl: URL) {
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
      messenger,
      logging: true
    });

    const customEditorProvider = window.registerCustomEditorProvider(
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
