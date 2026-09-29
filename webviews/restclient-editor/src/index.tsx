import { App, ClientContextProvider, QueryProvider, RestClientClientJsonRpc, initQueryClient } from '@axonivy/restclient-editor';
import '@axonivy/restclient-editor/lib/editor.css';
import { HotkeysProvider, ThemeProvider, Toaster } from '@axonivy/ui-components';
import { type InitializeConnection, initMessenger, toConnection } from '@axonivy/vscode-webview-common';
import '@axonivy/vscode-webview-common/css/colors.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Messenger, type VsCodeApi } from 'vscode-messenger-webview';
import { initTranslation } from './i18n';

declare function acquireVsCodeApi(): VsCodeApi;
const messenger = new Messenger(acquireVsCodeApi());
let selectedClientKey: string | undefined;
let selectionRequestId = 0;
let renderApp: ((clientKey?: string, requestId?: number) => void) | undefined;

messenger.onNotification({ method: 'selectRestClient' }, (message: unknown) => {
  if (typeof message !== 'object' || message === null || !('clientId' in message) || typeof message.clientId !== 'string') {
    return;
  }
  selectedClientKey = message.clientId;
  renderApp?.(selectedClientKey, ++selectionRequestId);
});

export async function start({ file }: InitializeConnection) {
  const connection = toConnection(messenger, 'restClientWebSocketMessage');
  const client = await RestClientClientJsonRpc.startClient(connection);
  const queryClient = initQueryClient();
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  initTranslation();
  const context = { app: '', project: '', file };
  await client.initialize(context);
  const root = createRoot(rootElement);
  renderApp = (clientKey, requestId) =>
    root.render(
      <React.StrictMode>
        <ThemeProvider disabled={true}>
          <ClientContextProvider client={client}>
            <QueryProvider client={queryClient}>
              <HotkeysProvider initiallyActiveScopes={['global']}>
                <App context={context} selectedClientKey={clientKey} selectionRequestId={requestId} />
                <Toaster closeButton={true} />
              </HotkeysProvider>
            </QueryProvider>
          </ClientContextProvider>
        </ThemeProvider>
      </React.StrictMode>
    );
  renderApp(selectedClientKey, selectionRequestId);
}

initMessenger(messenger, start);
