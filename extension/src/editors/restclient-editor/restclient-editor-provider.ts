import type { CustomTextEditorProvider, ExtensionContext, TextDocument, Uri, WebviewPanel } from 'vscode';
import { window } from 'vscode';
import type { MessageParticipant } from 'vscode-messenger-common';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd, type ConfigEditorOpenOptions } from '../command-helper';
import { createWebViewContent } from '../webview-helper';
import { SelectRestClientNotification, setupCommunication } from './webview-communication';

type RestClientEditorPanel = {
  messageParticipant: MessageParticipant;
  webviewPanel: WebviewPanel;
  ready: boolean;
  pendingClientKey?: string;
};

export class RestClientEditorProvider implements CustomTextEditorProvider {
  static readonly viewType = 'ivy.restClientEditor';

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    const provider = new RestClientEditorProvider(context, websocketUrl);
    const openOptions: ConfigEditorOpenOptions = {
      onOpen: (fileUri, selectedClientKey) => provider.selectClient(fileUri, selectedClientKey)
    };
    registerOpenConfigEditorCmd('ivyEditor.openRestClientEditor', context, 'rest-clients.yaml', openOptions);
    const providerRegistration = window.registerCustomEditorProvider(RestClientEditorProvider.viewType, provider);
    return providerRegistration;
  }

  private readonly panels = new Map<string, RestClientEditorPanel>();
  private readonly pendingClientKeys = new Map<string, string>();

  private selectClient(fileUri: Uri, selectedClientKey?: string) {
    if (!selectedClientKey) {
      return;
    }
    const uri = fileUri.toString();
    const panel = this.panels.get(uri);
    if (!panel) {
      this.pendingClientKeys.set(uri, selectedClientKey);
      return;
    }
    panel.pendingClientKey = selectedClientKey;
    this.sendPendingSelection(panel);
  }

  private sendPendingSelection(panel: RestClientEditorPanel) {
    if (!panel.ready || !panel.webviewPanel.visible || !panel.pendingClientKey) {
      return;
    }
    messenger.sendNotification(SelectRestClientNotification, panel.messageParticipant, { clientId: panel.pendingClientKey });
    panel.pendingClientKey = undefined;
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
    const uri = document.uri.toString();
    const pendingClientKey = this.pendingClientKeys.get(uri);
    this.pendingClientKeys.delete(uri);
    let panel: RestClientEditorPanel | undefined = undefined;
    const messageParticipant = setupCommunication(this.websocketUrl, messenger, webviewPanel, document, () => {
      if (!panel) {
        return;
      }
      panel.ready = true;
      this.sendPendingSelection(panel);
    });
    panel = { messageParticipant, webviewPanel, ready: false, pendingClientKey };
    this.panels.set(uri, panel);
    webviewPanel.onDidChangeViewState(event => {
      if (!panel) {
        return;
      }
      if (!event.webviewPanel.visible) {
        panel.ready = false;
      }
      this.sendPendingSelection(panel);
    });
    webviewPanel.onDidDispose(() => {
      if (this.panels.get(uri) === panel) {
        this.panels.delete(uri);
      }
    });
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'restclient-editor');
  }
}
