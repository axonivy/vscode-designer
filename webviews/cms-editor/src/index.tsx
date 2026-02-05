import { ClientContextProvider, ClientJsonRpc, CmsEditor, initQueryClient, QueryProvider } from '@axonivy/cms-editor';
import '@axonivy/cms-editor/lib/editor.css';
import { HotkeysProvider, ThemeProvider, Toaster } from '@axonivy/ui-components';
import { type InitializeConnection, initMessenger, toConnection } from '@axonivy/vscode-webview-common';
import '@axonivy/vscode-webview-common/css/colors.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Messenger, type VsCodeApi } from 'vscode-messenger-webview';
import { initTranslation } from './i18n';

declare function acquireVsCodeApi(): VsCodeApi;
const messenger = new Messenger(acquireVsCodeApi());

export async function start({ file }: InitializeConnection) {
  const connection = toConnection(messenger, 'cmsWebSocketMessage');
  const client = await ClientJsonRpc.startClient(connection);
  const queryClient = initQueryClient();
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  initTranslation();
  const context = { app: '', pmv: '', file };
  const initializePromise = client.initialize(context);
  createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider disabled={true}>
        <ClientContextProvider client={client}>
          <QueryProvider client={queryClient}>
            <HotkeysProvider initiallyActiveScopes={['global']}>
              <CmsEditor context={context} initializePromise={initializePromise} />
              <Toaster closeButton={true} />
            </HotkeysProvider>
          </QueryProvider>
        </ClientContextProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

initMessenger(messenger, start);
