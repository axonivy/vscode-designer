import {
  GlspVscodeConnector,
  GlspEditorProvider,
  SocketGlspVscodeServer,
  Writable,
  configureDefaultCommands
} from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { setupCommunication } from './webview-communication';
import { createWebViewContent } from '../webview-helper';
import { ProcessVscodeConnector } from './process-vscode-connector';
import { messenger } from '../..';
import { ProcessOutlineProvider } from './process-outline-provider';
import { registerCommand } from '../../base/commands';

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

    const ivyProcessOutline = new ProcessOutlineProvider(context, ivyVscodeConnector);
    const treeView = vscode.window.createTreeView('ivyProcessOutline', { treeDataProvider: ivyProcessOutline, showCollapseAll: true });
    context.subscriptions.push(treeView);
    ivyVscodeConnector.onSelectedElement(selectedElement => {
      if (selectedElement) {
        const element = ivyProcessOutline.findElementBy(selectedElement.pid);
        if (element && treeView.visible) {
          treeView.reveal(element, { select: true });
        }
      }
    });
    registerCommand('ivyProcessOutline.selectElement', context, pid => ivyProcessOutline.select(pid));

    configureDefaultCommands({ extensionContext: context, connector: ivyVscodeConnector, diagramPrefix: 'workflow' });
  }
}
