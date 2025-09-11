import 'reflect-metadata';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient/node';
import { Messenger, MessengerDiagnostic } from 'vscode-messenger';
import { registerCommand } from './base/commands';
import { config } from './base/configurations';
import { setStatusBarIcon } from './base/status-bar';
import { addDevContainer } from './dev-container/command';
import { IvyDiagnostics } from './engine/diagnostics';
import { IvyEngineManager } from './engine/engine-manager';
import { showRuntimeLog } from './engine/ws-client';
import { IvyProjectExplorer } from './project-explorer/ivy-project-explorer';

import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

let ivyEngineManager: IvyEngineManager;

let languageClient: LanguageClient;

export const messenger = new Messenger({ ignoreHiddenViews: false });

export const downloadDevEngine = () =>
  vscode.env.openExternal(vscode.Uri.parse('https://dev.axonivy.com/permalink/dev/axonivy-engine-slim.zip'));

export async function activate(context: vscode.ExtensionContext): Promise<MessengerDiagnostic> {
  // const vscodeXml = await vscode.extensions.getExtension('redhat.vscode-xml')?.activate();
  // if (vscodeXml) {
  //   const catalog = vscode.Uri.joinPath(context.extensionUri, 'assets', 'xml', 'catalog', 'catalog.xml').fsPath;
  //   vscodeXml.addXMLCatalogs([catalog]);
  // }

  await startLanguageClient();

  ivyEngineManager = IvyEngineManager.init(context);
  registerCommand('engine.deployProjects', context, () => ivyEngineManager.deployProjects());
  registerCommand('engine.buildProjects', context, () => ivyEngineManager.buildProjects());
  registerCommand('engine.buildAndDeployProjects', context, () => ivyEngineManager.buildAndDeployProjects());
  registerCommand('engine.downloadDevEngine', context, downloadDevEngine);
  registerCommand('engine.setEngineDirectory', context, () => config.setEngineDirectory());
  registerCommand('engine.activateAnimation', context, async () => await config.setProcessAnimationAnimate(true));
  registerCommand('engine.deactivateAnimation', context, async () => await config.setProcessAnimationAnimate(false));
  registerCommand('ivy.addDevContainer', context, () => addDevContainer(context.extensionUri));
  registerCommand('ivyPanelView.openRuntimeLog', context, () => showRuntimeLog());
  IvyProjectExplorer.init(context);
  IvyDiagnostics.init(context);
  setStatusBarIcon();

  return messenger.diagnosticApi();
}

const startLanguageClient = async () => {
  const url = 'ws://localhost:8080/lsp/bla';

  const serverOptions = (): Promise<StreamInfo> => {
    const webSocket = new WebSocket(url);
    return new Promise((resolve, reject) => {
      webSocket.onopen = () => {
        resolve({
          reader: new WebSocketMessageReader(toSocket(webSocket)),
          writer: new WebSocketMessageWriter(toSocket(webSocket))
        } as unknown as StreamInfo);
      };
      webSocket.onerror = reject;
    });
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['xhtml'],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.xhtml')
    }
  };

  languageClient = new LanguageClient('xhtml server', serverOptions, clientOptions);

  languageClient.start();
};

export async function deactivate() {
  await ivyEngineManager.stop();
  await languageClient?.stop();
}

const toSocket = (webSocket: WebSocket): IWebSocket => {
  return {
    send: content => webSocket.send(content),
    onMessage: cb => {
      webSocket.onmessage = event => cb(event.data);
    },
    onError: cb => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webSocket.onerror = (event: any) => {
        if (Object.hasOwn(event, 'message')) {
          cb(event.message);
        }
      };
    },
    onClose: cb => {
      webSocket.onclose = event => cb(event.code, event.reason);
    },
    dispose: () => webSocket.close()
  };
};
