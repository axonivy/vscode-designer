import type {
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  Uri,
  WebviewPanel,
  WebviewPanelOnDidChangeViewStateEvent
} from 'vscode';
import { window } from 'vscode';
import type { MessageParticipant } from 'vscode-messenger-common';
import { messenger } from '../..';
import { registerOpenConfigEditorCmd } from '../command-helper';
import type { OpenActionMessage } from '../process-editor/inscription-view/open-action';
import { createWebViewContent } from '../webview-helper';
import { RestClientWebSocketMessage, setupCommunication } from './webview-communication';

type RestClientPanel = {
  uri: string;
  messageParticipant: MessageParticipant;
  ready: boolean;
  pendingMessage?: OpenActionMessage;
};

export class RestClientEditorProvider implements CustomTextEditorProvider {
  static readonly viewType = 'ivy.restClientEditor';

  private readonly panels = new Map<WebviewPanel, RestClientPanel>();

  private constructor(
    readonly context: ExtensionContext,
    readonly websocketUrl: URL
  ) {}

  static register(context: ExtensionContext, websocketUrl: URL) {
    const provider = new RestClientEditorProvider(context, websocketUrl);
    registerOpenConfigEditorCmd('ivyEditor.openRestClientEditor', context, 'rest-clients.yaml', (uri, message) =>
      provider.onOpenMessage(uri, message)
    );
    return window.registerCustomEditorProvider(RestClientEditorProvider.viewType, provider);
  }

  private onOpenMessage(uri: Uri, message?: OpenActionMessage) {
    if (!message) {
      return;
    }
    const editor = [...this.panels].find(([panel, editor]) => editor.uri === uri.toString() && panel.active)?.[1];
    if (!editor) {
      return;
    }
    if (editor.ready) {
      this.sendMessage(editor.messageParticipant, message);
    } else {
      editor.pendingMessage = message;
    }
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel) {
    const messageParticipant = setupCommunication(this.websocketUrl, messenger, webviewPanel, document, () =>
      this.handleEditorReady(webviewPanel)
    );
    const editor: RestClientPanel = {
      uri: document.uri.toString(),
      ready: false,
      messageParticipant
    };
    this.panels.set(webviewPanel, editor);
    webviewPanel.onDidChangeViewState((event: WebviewPanelOnDidChangeViewStateEvent) => {
      if (!event.webviewPanel.visible) {
        editor.ready = false;
      }
    });
    webviewPanel.onDidDispose(() => this.panels.delete(webviewPanel));
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = createWebViewContent(this.context, webviewPanel.webview, 'restclient-editor');
  }

  private handleEditorReady(webviewPanel: WebviewPanel) {
    const editor = this.panels.get(webviewPanel);
    if (!editor) {
      return;
    }
    editor.ready = true;
    if (!editor.pendingMessage) {
      return;
    }
    this.sendMessage(editor.messageParticipant, editor.pendingMessage);
    editor.pendingMessage = undefined;
  }

  private sendMessage(messageParticipant: MessageParticipant, message: OpenActionMessage) {
    messenger.sendNotification(
      RestClientWebSocketMessage,
      messageParticipant,
      JSON.stringify({ jsonrpc: '2.0', method: message.method, params: message.payload })
    );
  }
}
